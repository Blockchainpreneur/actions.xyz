import type { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { upsertGoogleUser } from '@/lib/supabase'

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

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
