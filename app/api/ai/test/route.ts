import { NextRequest, NextResponse } from 'next/server'
import { testAiConnection } from '@/lib/ai/diagnostic-ai'
import type { AiProvider } from '@/types/diagnostic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, apiKey, ollamaBaseUrl, model } = body as {
      provider: AiProvider
      apiKey?: string
      ollamaBaseUrl?: string
      model?: string
    }

    const result = await testAiConnection({
      provider,
      apiKey,
      ollamaBaseUrl,
      model,
    })

    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || 'Server error testing connection', latencyMs: 0 },
      { status: 500 }
    )
  }
}
