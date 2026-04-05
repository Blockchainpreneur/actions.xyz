import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabase()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) return NextResponse.json({ sessions: [] })

  // Get sessions owned by this user
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ sessions: sessions ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json() as { name?: string; participants?: unknown[] }

  const { data: created, error } = await supabase
    .from('sessions')
    .insert({
      name: body.name || 'New Meeting',
      owner_id: user.id,
      participants: body.participants || [],
    })
    .select()
    .single()

  if (error) { console.error('[db] session create failed', error); return NextResponse.json({ error: 'Failed to create session' }, { status: 500 }) }
  return NextResponse.json({ session: created })
}
