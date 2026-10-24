import type { DiagnosticResult, EnvironmentContext, AiConfig, RiskLevel, SeverityLevel } from '@/types/diagnostic'

export const SYSTEM_PROMPT = `You are SetupMedic AI, an elite terminal diagnostics engine specialized in developer setup, runtime environments, and dependency errors.

You will be given:
1. Raw terminal error stack trace.
2. Operating system ('macos' | 'linux' | 'windows') and runtime info (e.g., node 20, python 3.11, docker 24).

Your mission is to return a strict JSON object matching this schema:
{
  "id": "diag_<unique_id>",
  "title": "<Concise descriptive title of the specific failure>",
  "packageName": "<Primary package, library or binary causing issue>",
  "severity": "critical" | "warning" | "info",
  "rootCause": "<Explain the root cause in EXACTLY 2 simple sentences in plain English suitable for beginners>",
  "steps": [
    {
      "id": 1,
      "title": "<Action title>",
      "command": "<Single runnable shell command for the specified OS>",
      "whyRunThis": "<1 sentence explanation of why this command is needed>",
      "riskLevel": "safe" | "moderate" | "high"
    }
  ],
  "verificationCommand": "<1 precise CLI verification command to test if the setup is fixed>",
  "confidenceScore": <Integer 0-100>
}

RULES:
- Commands MUST match the specified OS (e.g. brew/xcode-select for macOS, apt/dnf for Linux, winget/npm config on Windows).
- Break down the fix into ordered, safe CLI commands.
- Flag commands that require sudo, modify system PATH, alter registry, or delete directories as 'moderate' or 'high' risk.
- Verification command must be quick and non-destructive.
- Output ONLY valid JSON, with no markdown code fences or conversational text.`

/**
 * Robust JSON parser that handles code blocks, markdown fences, and conversational preambles
 * commonly output by open-weight models like Gemma 2.
 */
export function cleanAndParseJson<T = any>(rawText: string): T {
  const trimmed = rawText.trim()

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed)
  } catch {
    // continue to extract
  }

  // 2. Extract from markdown code fence: ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // continue to brace search
    }
  }

  // 3. Search for outermost balanced curly braces { ... }
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(candidate)
    } catch {
      // continue
    }
  }

  throw new Error(`Failed to extract valid JSON from model response: ${trimmed.slice(0, 150)}...`)
}

/**
 * 1. Google AI Studio Gemma 2 (e.g. gemma-2-9b-it, gemma-2-27b-it)
 */
export async function callGemmaGoogle(
  log: string,
  env: EnvironmentContext,
  apiKey: string,
  modelName: string = 'gemma-2-9b-it'
): Promise<DiagnosticResult> {
  const prompt = `${SYSTEM_PROMPT}\n\nTarget Environment: OS=${env.os}, Runtime=${env.runtime}${
    env.version ? ` (${env.version})` : ''
  }\n\nTerminal Error Log:\n${log.slice(0, 4000)}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Google AI Gemma (${modelName}) failed [${response.status}]: ${errText}`)
  }

  const json = await response.json()
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Google AI Gemma returned empty content candidate')

  return cleanAndParseJson<DiagnosticResult>(rawText)
}

/**
 * 2. Groq Cloud Gemma 2 (Ultra-fast inference, model: gemma2-9b-it)
 */
export async function callGemmaGroq(
  log: string,
  env: EnvironmentContext,
  apiKey: string,
  modelName: string = 'gemma2-9b-it'
): Promise<DiagnosticResult> {
  const userContent = `Environment: OS=${env.os}, Runtime=${env.runtime}${
    env.version ? ` (${env.version})` : ''
  }\n\nTerminal Error Log:\n${log.slice(0, 4000)}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Groq Gemma (${modelName}) failed [${response.status}]: ${errText}`)
  }

  const json = await response.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq Gemma returned empty message content')

  return cleanAndParseJson<DiagnosticResult>(content)
}

/**
 * 3. Local Ollama Gemma 2 (Offline & private inference, default: http://localhost:11434)
 */
export async function callGemmaOllama(
  log: string,
  env: EnvironmentContext,
  baseUrl: string = 'http://localhost:11434',
  modelName: string = 'gemma2'
): Promise<DiagnosticResult> {
  const userContent = `Environment: OS=${env.os}, Runtime=${env.runtime}${
    env.version ? ` (${env.version})` : ''
  }\n\nTerminal Error Log:\n${log.slice(0, 4000)}`

  const cleanedBaseUrl = baseUrl.replace(/\/+$/, '')
  const response = await fetch(`${cleanedBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      format: 'json',
      stream: false,
      options: {
        temperature: 0.1,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Ollama Gemma (${modelName}) failed [${response.status}]: ${errText}`)
  }

  const json = await response.json()
  const content = json.message?.content
  if (!content) throw new Error('Ollama Gemma returned empty response content')

  return cleanAndParseJson<DiagnosticResult>(content)
}

/**
 * 4. Google Gemini 1.5 Flash (Fallback / alternative)
 */
export async function callGemini(
  log: string,
  env: EnvironmentContext,
  apiKey: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<DiagnosticResult> {
  const prompt = `${SYSTEM_PROMPT}\n\nTarget Environment: OS=${env.os}, Runtime=${env.runtime}${
    env.version ? ` (${env.version})` : ''
  }\n\nTerminal Error Log:\n${log.slice(0, 4000)}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini (${modelName}) failed [${response.status}]: ${errText}`)
  }

  const json = await response.json()
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Gemini returned empty candidate')

  return cleanAndParseJson<DiagnosticResult>(rawText)
}

/**
 * 5. OpenAI GPT-4o-mini
 */
export async function callOpenAi(
  log: string,
  env: EnvironmentContext,
  apiKey: string,
  modelName: string = 'gpt-4o-mini'
): Promise<DiagnosticResult> {
  const userContent = `Environment: OS=${env.os}, Runtime=${env.runtime}${
    env.version ? ` (${env.version})` : ''
  }\n\nTerminal Error Log:\n${log.slice(0, 4000)}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI (${modelName}) failed [${response.status}]: ${errText}`)
  }

  const json = await response.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty message content')

  return cleanAndParseJson<DiagnosticResult>(content)
}

/**
 * 6. Anthropic Claude 3 Haiku
 */
export async function callAnthropic(
  log: string,
  env: EnvironmentContext,
  apiKey: string,
  modelName: string = 'claude-3-haiku-20240307'
): Promise<DiagnosticResult> {
  const prompt = `Environment: OS=${env.os}, Runtime=${env.runtime}\n\nTerminal Error Log:\n${log.slice(0, 4000)}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Anthropic (${modelName}) failed [${response.status}]: ${errText}`)
  }

  const json = await response.json()
  const content = json.content?.[0]?.text
  if (!content) throw new Error('Anthropic returned empty content')

  return cleanAndParseJson<DiagnosticResult>(content)
}

/**
 * Connection test helper to verify API credentials or local service status
 */
export async function testAiConnection(config: {
  provider: AiConfig['provider']
  apiKey?: string
  ollamaBaseUrl?: string
  model?: string
}): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now()

  try {
    switch (config.provider) {
      case 'gemma-google': {
        const key = config.apiKey || process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        if (!key) return { ok: false, message: 'Google API key missing', latencyMs: 0 }
        const model = config.model || 'gemma-2-9b-it'
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Respond with: {"status": "ok"}' }] }],
            }),
          }
        )
        const latencyMs = Date.now() - startTime
        if (!res.ok) {
          const t = await res.text()
          return { ok: false, message: `Google API Error (${res.status}): ${t}`, latencyMs }
        }
        return { ok: true, message: `Successfully connected to Google AI (${model})`, latencyMs }
      }

      case 'gemma-groq': {
        const key = config.apiKey || process.env.GROQ_API_KEY
        if (!key) return { ok: false, message: 'Groq API key missing', latencyMs: 0 }
        const model = config.model || 'gemma2-9b-it'
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Respond with JSON {"status": "ok"}' }],
            response_format: { type: 'json_object' },
            max_tokens: 20,
          }),
        })
        const latencyMs = Date.now() - startTime
        if (!res.ok) {
          const t = await res.text()
          return { ok: false, message: `Groq Error (${res.status}): ${t}`, latencyMs }
        }
        return { ok: true, message: `Successfully connected to Groq (${model})`, latencyMs }
      }

      case 'gemma-ollama': {
        const host = (config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '')
        const res = await fetch(`${host}/api/tags`, { method: 'GET' })
        const latencyMs = Date.now() - startTime
        if (!res.ok) return { ok: false, message: `Ollama returned status ${res.status}`, latencyMs }
        const data = await res.json()
        const models = data?.models?.map((m: any) => m.name) || []
        const hasGemma = models.some((m: string) => m.toLowerCase().includes('gemma'))
        return {
          ok: true,
          message: hasGemma
            ? `Ollama reachable with models: ${models.join(', ')}`
            : `Ollama connected. Note: Run "ollama pull gemma2" to download Gemma 2 model.`,
          latencyMs,
        }
      }

      case 'gemini': {
        const key = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        if (!key) return { ok: false, message: 'Gemini API key missing', latencyMs: 0 }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Ping test' }] }],
            }),
          }
        )
        const latencyMs = Date.now() - startTime
        if (!res.ok) return { ok: false, message: `Gemini status ${res.status}`, latencyMs }
        return { ok: true, message: 'Connected to Gemini 1.5 Flash', latencyMs }
      }

      case 'openai': {
        const key = config.apiKey || process.env.OPENAI_API_KEY
        if (!key) return { ok: false, message: 'OpenAI API key missing', latencyMs: 0 }
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        const latencyMs = Date.now() - startTime
        if (!res.ok) return { ok: false, message: `OpenAI status ${res.status}`, latencyMs }
        return { ok: true, message: 'Connected to OpenAI API', latencyMs }
      }

      default:
        return { ok: true, message: 'Using SetupMedic Deterministic Engine (Offline)', latencyMs: 1 }
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Connection failed',
      latencyMs: Date.now() - startTime,
    }
  }
}
