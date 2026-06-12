import type { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { upsertGoogleUser } from '@/lib/supabase'

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

// Conversion attribution: the sign-in page stashes ?ref=<token>/utm_source in
// the axyz_ref cookie. Persist it on the user (first-touch only) and emit a
// signup_from_task event. Entirely fail-open — attribution must never block
// or break sign-in, including when the DB is paused or the columns are not
// migrated yet.
async function captureSignupAttribution(email: string) {
  try {
    const { cookies } = await import('next/headers')
    const raw = (await cookies()).get('axyz_ref')?.value
    if (!raw) return

    const parsed = JSON.parse(decodeURIComponent(raw)) as { ref?: string | null; utm_source?: string | null }
    const referrerToken = typeof parsed.ref === 'string' ? parsed.ref.slice(0, 2048) : null
    const signupSource = typeof parsed.utm_source === 'string' ? parsed.utm_source.slice(0, 100) : null
    if (!referrerToken && !signupSource) return

    const { getSupabase } = await import('@/lib/supabase')
    const supabase = getSupabase()
    await supabase
      .from('users')
      .update({
        signup_source: signupSource ?? 'task_referral',
        referrer_token: referrerToken ? referrerToken.slice(0, 64) : null,
      })
      .eq('email', email.toLowerCase().trim())
      .is('signup_source', null)

    if (referrerToken) {
      const { trackEvent } = await import('@/lib/events')
      await trackEvent('signup_from_task', {
        email,
        token: referrerToken,
        metadata: { utm_source: signupSource },
      })
    }
  } catch (err) {
    console.warn('[auth] signup attribution skipped:', (err as Error).message)
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validEmail = process.env.APP_EMAIL
        const validPassword = process.env.APP_PASSWORD
        if (!validEmail || !validPassword) return null
        if (
          credentials?.email === validEmail &&
          credentials?.password === validPassword
        ) {
          return { id: '1', email: credentials.email, name: credentials.email.split('@')[0] }
        }
        return null
      },
    }),
    ...(googleConfigured ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })] : []),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Upsert user to Supabase on Google sign-in (merges ghost users)
      if (account?.provider === 'google' && user.email) {
        try {
          await upsertGoogleUser({
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image || undefined,
            googleId: profile?.sub || account.providerAccountId,
            accessToken: account.access_token || undefined,
            refreshToken: account.refresh_token || undefined,
          })
        } catch (err) {
          console.error('[auth] Failed to upsert user to DB', err)
          // Don't block sign-in if DB write fails
        }
        await captureSignupAttribution(user.email)
      }
      return true
    },
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // @ts-expect-error — adding accessToken to session
      session.accessToken = token.accessToken
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
