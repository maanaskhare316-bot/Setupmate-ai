import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { DiagnosticResult, EnvironmentContext, RiskLevel, SeverityLevel } from '@/types/diagnostic'
import {
  callGemmaGoogle,
  callGemmaGroq,
  callGemmaOllama,
  callGemini,
  callOpenAi,
  callAnthropic,
  SYSTEM_PROMPT,
} from '@/lib/ai/diagnostic-ai'

// Zod validation schemas
const environmentContextSchema = z.object({
  os: z.enum(['macos', 'linux', 'windows']),
  runtime: z.string(),
  version: z.string().optional(),
})

const aiConfigSchema = z
  .object({
    provider: z
      .enum([
        'auto',
        'gemma-google',
        'gemma-groq',
        'gemma-ollama',
        'gemini',
        'openai',
        'anthropic',
        'offline',
      ])
      .default('auto'),
    customApiKey: z.string().optional(),
    customModel: z.string().optional(),
    ollamaBaseUrl: z.string().optional(),
  })
  .optional()

const diagnoseRequestSchema = z.object({
  rawLog: z.string().min(1, 'Error log is required and cannot be empty'),
  environment: environmentContextSchema,
  screenshotUrl: z.string().optional(),
  aiConfig: aiConfigSchema,
})

const diagnosticStepSchema = z.object({
  id: z.number(),
  title: z.string(),
  command: z.string(),
  whyRunThis: z.string(),
  riskLevel: z.enum(['safe', 'moderate', 'high']),
})

const diagnosticResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  packageName: z.string().optional(),
  severity: z.enum(['critical', 'warning', 'info']),
  rootCause: z.string(),
  steps: z.array(diagnosticStepSchema).min(1),
  verificationCommand: z.string(),
  confidenceScore: z.number().min(0).max(100),
})

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json()
    const validation = diagnoseRequestSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
        },
        { status: 400 }
      )
    }

    const { rawLog, environment, screenshotUrl, aiConfig } = validation.data
    const targetProvider = aiConfig?.provider || 'auto'
    const customKey = aiConfig?.customApiKey?.trim()
    const customModel = aiConfig?.customModel?.trim()
    const ollamaUrl = aiConfig?.ollamaBaseUrl?.trim() || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

    const startTime = Date.now()
    let parsedResult: DiagnosticResult | null = null
    let modelUsed = 'SetupMedic Rule Engine (Offline)'
    let providerUsed = 'offline'

    // Explicit Provider Selection
    if (targetProvider === 'gemma-google') {
      const key = customKey || process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      if (!key) {
        throw new Error('Google AI / Gemma API key is missing. Set GEMMA_API_KEY or enter your key in AI Settings.')
      }
      const model = customModel || 'gemma-2-9b-it'
      parsedResult = await callGemmaGoogle(rawLog, environment, key, model)
      modelUsed = `Gemma 2 (${model})`
      providerUsed = 'gemma-google'
    } else if (targetProvider === 'gemma-groq') {
      const key = customKey || process.env.GROQ_API_KEY
      if (!key) {
        throw new Error('Groq API key is missing. Set GROQ_API_KEY or enter your key in AI Settings.')
      }
      const model = customModel || 'gemma2-9b-it'
      parsedResult = await callGemmaGroq(rawLog, environment, key, model)
      modelUsed = `Gemma 2 (${model} via Groq)`
      providerUsed = 'gemma-groq'
    } else if (targetProvider === 'gemma-ollama') {
      const model = customModel || 'gemma2'
      parsedResult = await callGemmaOllama(rawLog, environment, ollamaUrl, model)
      modelUsed = `Gemma 2 (${model} via Ollama)`
      providerUsed = 'gemma-ollama'
    } else if (targetProvider === 'gemini') {
      const key = customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      if (!key) throw new Error('Gemini API key is missing.')
      const model = customModel || 'gemini-1.5-flash'
      parsedResult = await callGemini(rawLog, environment, key, model)
      modelUsed = `Gemini (${model})`
      providerUsed = 'gemini'
    } else if (targetProvider === 'openai') {
      const key = customKey || process.env.OPENAI_API_KEY
      if (!key) throw new Error('OpenAI API key is missing.')
      const model = customModel || 'gpt-4o-mini'
      parsedResult = await callOpenAi(rawLog, environment, key, model)
      modelUsed = `OpenAI (${model})`
      providerUsed = 'openai'
    } else if (targetProvider === 'anthropic') {
      const key = customKey || process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error('Anthropic API key is missing.')
      const model = customModel || 'claude-3-haiku-20240307'
      parsedResult = await callAnthropic(rawLog, environment, key, model)
      modelUsed = `Anthropic (${model})`
      providerUsed = 'anthropic'
    } else if (targetProvider === 'auto') {
      // Auto chain: Groq Gemma -> Google Gemma/Gemini -> OpenAI -> Anthropic
      const groqKey = customKey || process.env.GROQ_API_KEY
      if (!parsedResult && groqKey) {
        try {
          parsedResult = await callGemmaGroq(rawLog, environment, groqKey, 'gemma2-9b-it')
          modelUsed = 'Gemma 2 9B (Groq Fast)'
          providerUsed = 'gemma-groq'
        } catch (err) {
          console.warn('Auto Groq Gemma failed:', err)
        }
      }

      const googleKey = customKey || process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      if (!parsedResult && googleKey) {
        try {
          parsedResult = await callGemmaGoogle(rawLog, environment, googleKey, 'gemma-2-9b-it')
          modelUsed = 'Gemma 2 9B (Google AI)'
          providerUsed = 'gemma-google'
        } catch (err) {
          console.warn('Auto Google Gemma failed, attempting Gemini 1.5 Flash:', err)
          try {
            parsedResult = await callGemini(rawLog, environment, googleKey, 'gemini-1.5-flash')
            modelUsed = 'Gemini 1.5 Flash'
            providerUsed = 'gemini'
          } catch (geminiErr) {
            console.warn('Auto Gemini fallback failed:', geminiErr)
          }
        }
      }

      const openAiKey = process.env.OPENAI_API_KEY
      if (!parsedResult && openAiKey) {
        try {
          parsedResult = await callOpenAi(rawLog, environment, openAiKey, 'gpt-4o-mini')
          modelUsed = 'GPT-4o-mini'
          providerUsed = 'openai'
        } catch (err) {
          console.warn('Auto OpenAI fallback failed:', err)
        }
      }

      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (!parsedResult && anthropicKey) {
        try {
          parsedResult = await callAnthropic(rawLog, environment, anthropicKey, 'claude-3-haiku-20240307')
          modelUsed = 'Claude 3 Haiku'
          providerUsed = 'anthropic'
        } catch (err) {
          console.warn('Auto Anthropic fallback failed:', err)
        }
      }
    }

    // 4. Fallback: Intelligent Deterministic Diagnostic Parser
    if (!parsedResult) {
      parsedResult = analyzeWithFallbackEngine(rawLog, environment)
      modelUsed = 'SetupMedic Rule Engine (Offline)'
      providerUsed = 'offline'
    }

    const executionTimeMs = Date.now() - startTime

    // Validate structured format
    const validated = diagnosticResultSchema.safeParse(parsedResult)
    if (!validated.success) {
      console.warn('Parsed result failed schema validation, repairing fallback:', validated.error)
      parsedResult = analyzeWithFallbackEngine(rawLog, environment)
      modelUsed = 'SetupMedic Rule Engine (Offline)'
      providerUsed = 'offline'
    }

    const finalResult: DiagnosticResult = {
      ...parsedResult,
      id: parsedResult.id || `diag-${Date.now()}`,
      createdAt: new Date().toISOString(),
      rawLog,
      environment,
      screenshotUrl,
      modelUsed,
      providerUsed,
      executionTimeMs,
    }

    return NextResponse.json({
      success: true,
      data: finalResult,
      isAiGenerated: providerUsed !== 'offline',
      modelUsed,
      providerUsed,
      executionTimeMs,
    })
  } catch (error: any) {
    console.error('Diagnostic API error:', error)
    return NextResponse.json(
      {
        error: 'Diagnostic processing failure',
        message: error?.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * Intelligent Fallback Diagnostic Engine
 * Accurately analyzes common real-world developer setup failures across macOS, Linux, and Windows.
 */
function analyzeWithFallbackEngine(rawLog: string, env: EnvironmentContext): DiagnosticResult {
  const lower = rawLog.toLowerCase()
  const os = env.os

  // 1. node-gyp / Python / C++ compiler missing
  if (lower.includes('node-gyp') || lower.includes('gyp err!') || lower.includes('find python')) {
    const isWin = os === 'windows'
    const isMac = os === 'macos'

    const steps = isWin
      ? [
          {
            id: 1,
            title: 'Install Visual Studio C++ Build Tools & Python via npm',
            command: 'npm install --global --production windows-build-tools',
            whyRunThis: 'Provides the MSBuild C++ compiler toolset and Python 2.7/3 needed by node-gyp on Windows.',
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 2,
            title: 'Configure npm to use Python 3 interpreter',
            command: 'npm config set python python3',
            whyRunThis: 'Sets the persistent npm configuration flag for native C++ compilation bindings.',
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 3,
            title: 'Clean cache and reinstall modules',
            command: 'npm cache clean --force && npm install',
            whyRunThis: 'Removes tainted compilation intermediate artifacts and triggers a fresh build.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]
      : isMac
      ? [
          {
            id: 1,
            title: 'Install or reset Xcode Command Line Tools',
            command: 'xcode-select --install || sudo xcode-select --reset',
            whyRunThis: 'Installs Apple Clang, Make, and C header libraries required for compiling native node bindings.',
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 2,
            title: 'Install Python 3 via Homebrew',
            command: 'brew install python@3.11',
            whyRunThis: 'Supplies a compliant Python interpreter that node-gyp requires for configuration scripts.',
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 3,
            title: 'Point npm to Homebrew Python 3 binary',
            command: 'npm config set python $(which python3)',
            whyRunThis: 'Explicitly informs npm where the valid Python binary resides.',
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 4,
            title: 'Re-run package installation',
            command: 'npm install',
            whyRunThis: 'Re-attempts the native compilation with the resolved compiler toolchain.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]
      : [
          {
            id: 1,
            title: 'Install build-essential and python3 on Linux',
            command: 'sudo apt-get update && sudo apt-get install -y build-essential python3 python3-pip make g++',
            whyRunThis: 'Installs the GNU Compiler Collection (GCC), Make, and Python needed to compile native addons.',
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 2,
            title: 'Re-run npm install',
            command: 'npm install',
            whyRunThis: 'Compiles the native addon using the newly installed Linux build chain.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]

    return {
      id: `diag-nodegyp-${Date.now()}`,
      title: 'node-gyp Native Compilation Failure: Missing Python & C++ Build Toolchain',
      packageName: 'node-gyp',
      severity: 'critical' as SeverityLevel,
      rootCause:
        'The package requires compiling native C/C++ bindings but node-gyp could not find a valid Python interpreter and compiler on your system. Setting up the platform build tools and pointing npm to Python will resolve this.',
      steps,
      verificationCommand: isWin
        ? 'node-gyp -v'
        : isMac
        ? 'xcode-select -p && which python3'
        : 'gcc --version && python3 --version',
      confidenceScore: 98,
    }
  }

  // 2. pip SSL Certificate Verification Failed
  if (lower.includes('ssl: certificate_verify_failed') || lower.includes('certverificationerror') || lower.includes('unable to get local issuer certificate')) {
    const isMac = os === 'macos'
    const isWin = os === 'windows'

    const steps = isMac
      ? [
          {
            id: 1,
            title: 'Run macOS Python Install Certificates script',
            command: '/Applications/Python\\ 3.*/Install\\ Certificates.command || brew install ca-certificates',
            whyRunThis: 'Runs the bundled script that updates the OpenSSL root certificates used by Python on macOS.',
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 2,
            title: 'Upgrade pip and certifi packages',
            command: 'python3 -m pip install --upgrade --trusted-host pypi.org --trusted-host files.pythonhosted.org certifi pip',
            whyRunThis: 'Refreshes outdated SSL validation wheels to establish secure TLS handshakes.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]
      : isWin
      ? [
          {
            id: 1,
            title: 'Upgrade pip and trust PyPI hosts temporarily',
            command: 'py -m pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --upgrade certifi pip',
            whyRunThis: 'Bypasses broken local certificate authority chains while installing the latest certifi bundle.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]
      : [
          {
            id: 1,
            title: 'Update CA certificates on Linux',
            command: 'sudo apt-get update && sudo apt-get install -y ca-certificates && sudo update-ca-certificates',
            whyRunThis: 'Refreshes the system-wide SSL trust store for OpenSSL connections.',
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 2,
            title: 'Update pip and certifi',
            command: 'pip install --upgrade certifi pip',
            whyRunThis: 'Ensures Python packages use the freshly linked root CA certificates.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]

    return {
      id: `diag-pipssl-${Date.now()}`,
      title: 'pip SSL Certificate Verification Failed: Missing or Unlinked Root CA Certificates',
      packageName: 'pip / certifi',
      severity: 'critical' as SeverityLevel,
      rootCause:
        'Python OpenSSL cannot verify PyPI server certificates due to missing system CA root certificates. Installing the CA certificate bundle or updating certifi resolves the TLS handshake.',
      steps,
      verificationCommand: 'python3 -c "import urllib.request; urllib.request.urlopen(\'https://pypi.org\'); print(\'SSL Handshake OK\')"',
      confidenceScore: 97,
    }
  }

  // 3. Docker Socket Permission Denied / Daemon not running
  if (lower.includes('docker.sock') || lower.includes('cannot connect to the docker daemon') || lower.includes('permission denied while trying to connect to the docker daemon')) {
    const isLinux = os === 'linux'
    const isMac = os === 'macos'

    const steps = isLinux
      ? [
          {
            id: 1,
            title: 'Create docker group if missing',
            command: 'sudo groupadd docker',
            whyRunThis: 'Ensures the unix group with socket access rights exists on the operating system.',
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 2,
            title: 'Add current user to docker group',
            command: 'sudo usermod -aG docker $USER',
            whyRunThis: 'Grants daemon socket read/write permissions to your current user account without requiring sudo.',
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 3,
            title: 'Activate group changes in current shell session',
            command: 'newgrp docker',
            whyRunThis: 'Refreshes group membership permissions immediately without requiring a full logout.',
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 4,
            title: 'Ensure Docker daemon service is running',
            command: 'sudo systemctl restart docker',
            whyRunThis: 'Restarts the Docker systemd unit to verify the socket is open and listening.',
            riskLevel: 'moderate' as RiskLevel,
          },
        ]
      : isMac
      ? [
          {
            id: 1,
            title: 'Start Docker Desktop application',
            command: 'open -a Docker',
            whyRunThis: 'Launches Docker Desktop VM which exposes the unix socket on macOS.',
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 2,
            title: 'Check Docker Desktop CLI context',
            command: 'docker context use desktop-linux || docker context use default',
            whyRunThis: 'Points your CLI commands to the correct active Docker Desktop socket endpoint.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]
      : [
          {
            id: 1,
            title: 'Start Docker Desktop on Windows',
            command: 'Start-Process "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"',
            whyRunThis: 'Boots the WSL2 Docker backend engine.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]

    return {
      id: `diag-docker-${Date.now()}`,
      title: 'Docker Socket Permission Denied / Daemon Inaccessible',
      packageName: 'docker-engine',
      severity: 'critical' as SeverityLevel,
      rootCause:
        'Your user account lacks read/write permissions for the Docker daemon unix socket, or the Docker service is not running. Adding your user to the docker group or starting Docker Desktop restores connectivity.',
      steps,
      verificationCommand: 'docker info && docker run --rm hello-world',
      confidenceScore: 99,
    }
  }

  // 4. Port already in use / EADDRINUSE
  if (lower.includes('eaddrinuse') || lower.includes('address already in use')) {
    const portMatch = rawLog.match(/:(\d{3,5})/)?.[1] || '3000'
    const isWin = os === 'windows'

    const steps = isWin
      ? [
          {
            id: 1,
            title: `Find process holding port ${portMatch}`,
            command: `netstat -ano | findstr :${portMatch}`,
            whyRunThis: `Identifies the Windows Process ID (PID) binding port ${portMatch}.`,
            riskLevel: 'safe' as RiskLevel,
          },
          {
            id: 2,
            title: `Terminate the conflicting process`,
            command: `Stop-Process -Id (Get-NetTCPConnection -LocalPort ${portMatch}).OwningProcess -Force`,
            whyRunThis: `Frees up port ${portMatch} so your dev server can bind to it without collisions.`,
            riskLevel: 'moderate' as RiskLevel,
          },
        ]
      : [
          {
            id: 1,
            title: `Locate and terminate zombie process on port ${portMatch}`,
            command: `lsof -ti :${portMatch} | xargs kill -9`,
            whyRunThis: `Sends SIGKILL to any orphaned node or server process hogging port ${portMatch}.`,
            riskLevel: 'moderate' as RiskLevel,
          },
          {
            id: 2,
            title: `Restart the development server`,
            command: `npm run dev`,
            whyRunThis: `Boots the server on the freshly vacated port.`,
            riskLevel: 'safe' as RiskLevel,
          },
        ]

    return {
      id: `diag-port-${Date.now()}`,
      title: `Port Conflict: Address Already in Use (Port ${portMatch})`,
      packageName: 'network / dev-server',
      severity: 'warning' as SeverityLevel,
      rootCause:
        `Another application or a leftover background process is already listening on port ${portMatch}. Terminating the lingering process frees the socket for your application.`,
      steps,
      verificationCommand: isWin
        ? `netstat -ano | findstr :${portMatch}`
        : `lsof -i :${portMatch} || echo "Port ${portMatch} is free"`,
      confidenceScore: 95,
    }
  }

  // 5. Cargo / Rust missing linker 'cc'
  if (lower.includes('linker `cc` not found') || lower.includes('cargo build') && lower.includes('linker')) {
    const isMac = os === 'macos'
    const isLinux = os === 'linux'

    const steps = isMac
      ? [
          {
            id: 1,
            title: 'Install Apple Xcode Command Line Tools',
            command: 'xcode-select --install',
            whyRunThis: 'Provides the clang compiler and cc linker required by rustc.',
            riskLevel: 'safe' as RiskLevel,
          },
        ]
      : isLinux
      ? [
          {
            id: 1,
            title: 'Install build-essential GCC toolchain',
            command: 'sudo apt-get update && sudo apt-get install -y build-essential',
            whyRunThis: 'Provides the cc linker binary required by rustc for binary linking.',
            riskLevel: 'moderate' as RiskLevel,
          },
        ]
      : [
          {
            id: 1,
            title: 'Install Visual C++ Build Tools for Rust',
            command: 'winget install Microsoft.VisualStudio.2022.BuildTools',
            whyRunThis: 'Installs the MSVC linker required by rustc on Windows.',
            riskLevel: 'moderate' as RiskLevel,
          },
        ]

    return {
      id: `diag-cargo-${Date.now()}`,
      title: "Rust Build Failure: C Linker 'cc' Not Found in PATH",
      packageName: 'rustc / cargo',
      severity: 'critical' as SeverityLevel,
      rootCause:
        'The Rust compiler rustc needs a C linker to create executables, but no C compiler toolchain was found on your system. Installing the native build tools resolves this issue.',
      steps,
      verificationCommand: 'rustc --version && cargo --version',
      confidenceScore: 98,
    }
  }

  // 6. Generic Fallback: Smart log parser
  const errorLines = rawLog
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.toLowerCase().includes('error') || l.toLowerCase().includes('failed') || l.toLowerCase().includes('not found'))

  const firstError = errorLines[0] || 'Unknown installation failure detected in terminal output'
  const isMac = os === 'macos'
  const isWin = os === 'windows'

  return {
    id: `diag-gen-${Date.now()}`,
    title: `Environment Dependency Error: ${firstError.slice(0, 60)}...`,
    packageName: env.runtime || 'system',
    severity: 'warning' as SeverityLevel,
    rootCause:
      'The package installation encountered a configuration or environment mismatch during execution. Running package manager cache repair and verifying toolchain dependencies should restore normal functionality.',
    steps: [
      {
        id: 1,
        title: 'Clean package manager cache',
        command: env.runtime === 'python' ? 'pip cache purge' : isWin ? 'npm cache clean --force' : 'npm cache clean --force',
        whyRunThis: 'Clears corrupt cached dependency archives that may be causing download or checksum validation errors.',
        riskLevel: 'safe' as RiskLevel,
      },
      {
        id: 2,
        title: 'Refresh environment lockfile and reinstall',
        command: env.runtime === 'python' ? 'pip install -r requirements.txt --force-reinstall' : 'npm install --prefer-online',
        whyRunThis: 'Re-evaluates the dependency tree against current system architecture.',
        riskLevel: 'safe' as RiskLevel,
      },
    ],
    verificationCommand: env.runtime === 'python' ? 'python3 -m pip check' : 'npm doctor',
    confidenceScore: 88,
  }
}
