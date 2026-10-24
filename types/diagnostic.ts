export type OperatingSystem = 'macos' | 'linux' | 'windows'

export interface EnvironmentContext {
  os: OperatingSystem
  runtime: string
  version?: string
}

export type RiskLevel = 'safe' | 'moderate' | 'high'

export interface DiagnosticStep {
  id: number
  title: string
  command: string
  whyRunThis: string
  riskLevel: RiskLevel
}

export type SeverityLevel = 'critical' | 'warning' | 'info'

export type AiProvider =
  | 'auto'
  | 'gemma-google'
  | 'gemma-groq'
  | 'gemma-ollama'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'offline'

export interface AiConfig {
  provider: AiProvider
  customApiKey?: string
  customModel?: string
  ollamaBaseUrl?: string
}

export interface DiagnosticResult {
  id: string
  title: string
  packageName?: string
  severity: SeverityLevel
  rootCause: string
  steps: DiagnosticStep[]
  verificationCommand: string
  confidenceScore: number
  createdAt?: string
  rawLog?: string
  environment?: EnvironmentContext
  screenshotUrl?: string
  modelUsed?: string
  providerUsed?: string
  executionTimeMs?: number
}

export interface DiagnoseApiRequest {
  rawLog: string
  environment: EnvironmentContext
  screenshotUrl?: string
  aiConfig?: AiConfig
}

export interface PresetError {
  id: string
  label: string
  runtime: string
  os: OperatingSystem
  packageName: string
  log: string
  description: string
}
