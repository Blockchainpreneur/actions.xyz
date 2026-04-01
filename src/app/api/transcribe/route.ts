import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null

  if (!audioFile || audioFile.size < 1000) {
    return NextResponse.json({ text: '' })
  }

  const groq = new Groq({ apiKey })

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
    })

    return NextResponse.json({ text: transcription.text ?? '' })
  } catch (err) {
    console.error('Groq transcription error:', err)
    return NextResponse.json({ text: '' })
  }
}
