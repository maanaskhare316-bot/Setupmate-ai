import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { DiagnosticResult, EnvironmentContext } from '@/types/diagnostic'

export interface SaveDiagnosisInput {
  rawLog: string
  environment: EnvironmentContext
  result: DiagnosticResult
  screenshotUrl?: string
}

export interface StoredDiagnosis {
  id: string
  user_id?: string
  raw_log: string
  environment: EnvironmentContext
  result: DiagnosticResult
  screenshot_url?: string
  created_at: string
}

const LOCAL_STORAGE_KEY = 'setupmedic_history_v1'

const INITIAL_FALLBACK_HISTORY: StoredDiagnosis[] = [
  {
    id: 'diag-preset-1',
    user_id: 'guest',
    raw_log: `gyp ERR! find Python \ngyp ERR! find Python Python is not set from command line or npm configuration\ngyp ERR! find Python Python is not set from environment variable PYTHON\ngyp ERR! find Python checking if "python3" can be used\ngyp ERR! find Python - executable "python3" not found at ...\ngyp ERR! find Python checking if "python" can be used\ngyp ERR! find Python - executable "python" not found at ...\ngyp ERR! System Darwin 23.4.0`,
    environment: {
      os: 'macos',
      runtime: 'node',
      version: '20.11.0',
    },
    result: {
      id: 'diag-preset-1',
      title: 'node-gyp rebuild failed: Python 3 executable missing from PATH',
      packageName: 'node-gyp',
      severity: 'critical',
      rootCause:
        'Native C++ binding compilation via node-gyp requires a valid Python 3 installation and Xcode Command Line Tools. Neither python3 nor Xcode CLI tools were detected on your macOS system.',
      steps: [
        {
          id: 1,
          title: 'Install Command Line Developer Tools',
          command: 'xcode-select --install',
          whyRunThis: 'Installs the native Apple clang compilers and basic build toolchain required by node-gyp.',
          riskLevel: 'safe',
        },
        {
          id: 2,
          title: 'Install Python 3 via Homebrew',
          command: 'brew install python@3.11',
          whyRunThis: 'Provides an isolated, modern Python runtime that node-gyp hooks into for build script execution.',
          riskLevel: 'safe',
        },
        {
          id: 3,
          title: 'Point npm to Python 3 binary',
          command: 'npm config set python $(which python3)',
          whyRunThis: 'Explicitly instructs npm and node-gyp where to locate the Python interpreter.',
          riskLevel: 'safe',
        },
        {
          id: 4,
          title: 'Re-run package installation',
          command: 'npm install',
          whyRunThis: 'Re-attempts the native compilation with the resolved compiler toolchain.',
          riskLevel: 'safe',
        },
      ],
      verificationCommand: 'node -e "console.log(process.versions)" && xcode-select -p',
      confidenceScore: 98,
      createdAt: '2026-10-23T14:30:00Z',
    },
    created_at: '2026-10-23T14:30:00Z',
  },
  {
    id: 'diag-preset-2',
    user_id: 'guest',
    raw_log: `pip install requests\nWARNING: Retrying (Retry(total=4...)) after connection broken by 'SSLError(SSLCertVerificationError(1, "[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1007)"))': /simple/requests/\nCould not fetch URL https://pypi.org/simple/requests/: There was a problem confirming the ssl certificate: [SSL: CERTIFICATE_VERIFY_FAILED]`,
    environment: {
      os: 'macos',
      runtime: 'python',
      version: '3.11.2',
    },
    result: {
      id: 'diag-preset-2',
      title: 'pip SSL Certificate Verification Failed: Missing Root Certificates',
      packageName: 'pip / certifi',
      severity: 'critical',
      rootCause:
        'Python on macOS does not automatically hook into system root certificates. The certifi CA bundle is unlinked, causing OpenSSL requests to PyPI to fail.',
      steps: [
        {
          id: 1,
          title: 'Run official Python Certificate Installer script',
          command: '/Applications/Python\\ 3.11/Install\\ Certificates.command',
          whyRunThis: 'Configures Python OpenSSL to use the bundled Mozilla root CA certificates.',
          riskLevel: 'safe',
        },
        {
          id: 2,
          title: 'Upgrade pip and certifi bundles',
          command: 'python3 -m pip install --upgrade --trusted-host pypi.org --trusted-host files.pythonhosted.org certifi pip',
          whyRunThis: 'Refreshes outdated SSL validation wheels to establish secure TLS handshakes.',
          riskLevel: 'safe',
        },
      ],
      verificationCommand: 'python3 -c "import urllib.request; urllib.request.urlopen(\'https://pypi.org\'); print(\'SSL OK\')"',
      confidenceScore: 96,
      createdAt: '2026-10-23T11:15:00Z',
    },
    created_at: '2026-10-23T11:15:00Z',
  },
  {
    id: 'diag-preset-3',
    user_id: 'guest',
    raw_log: `docker ps\npermission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/json": dial unix /var/run/docker.sock: connect: permission denied`,
    environment: {
      os: 'linux',
      runtime: 'docker',
      version: '24.0.7',
    },
    result: {
      id: 'diag-preset-3',
      title: 'Docker Daemon Socket Permission Denied (unix:///var/run/docker.sock)',
      packageName: 'docker-ce',
      severity: 'warning',
      rootCause:
        'Your non-root Linux user is not a member of the unix "docker" group. The Docker daemon socket is restricted to root and group members.',
      steps: [
        {
          id: 1,
          title: 'Create the docker group if not already present',
          command: 'sudo groupadd docker',
          whyRunThis: 'Ensures the target Linux group exists for unix socket permission assignment.',
          riskLevel: 'moderate',
        },
        {
          id: 2,
          title: 'Add current user to docker group',
          command: 'sudo usermod -aG docker $USER',
          whyRunThis: 'Grants daemon socket read/write permissions to your user profile without requiring sudo.',
          riskLevel: 'moderate',
        },
        {
          id: 3,
          title: 'Activate group changes without logging out',
          command: 'newgrp docker',
          whyRunThis: 'Re-evaluates group privileges for current shell session immediately.',
          riskLevel: 'safe',
        },
      ],
      verificationCommand: 'docker run --rm hello-world',
      confidenceScore: 99,
      createdAt: '2026-10-22T19:40:00Z',
    },
    created_at: '2026-10-22T19:40:00Z',
  },
]

function getLocalHistory(): StoredDiagnosis[] {
  if (typeof window === 'undefined') return INITIAL_FALLBACK_HISTORY
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_FALLBACK_HISTORY))
      return INITIAL_FALLBACK_HISTORY
    }
    return JSON.parse(raw) as StoredDiagnosis[]
  } catch {
    return INITIAL_FALLBACK_HISTORY
  }
}

function saveLocalHistory(list: StoredDiagnosis[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to write history to localStorage', err)
  }
}

/**
 * Inserts a new diagnosis into Supabase 'diagnoses' table,
 * falling back to local storage if Supabase is unconfigured or offline.
 */
export async function saveDiagnosis(
  userId: string = 'guest',
  data: SaveDiagnosisInput
): Promise<StoredDiagnosis> {
  const newRecord: StoredDiagnosis = {
    id: data.result.id || `diag-${Date.now()}`,
    user_id: userId,
    raw_log: data.rawLog,
    environment: data.environment,
    result: {
      ...data.result,
      id: data.result.id || `diag-${Date.now()}`,
      createdAt: data.result.createdAt || new Date().toISOString(),
    },
    screenshot_url: data.screenshotUrl,
    created_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured()) {
    try {
      const client = createBrowserSupabaseClient()
      if (client) {
        const { data: dbData, error } = await client
          .from('diagnoses')
          .insert({
            id: newRecord.id,
            user_id: userId,
            raw_log: data.rawLog,
            environment: data.environment,
            result: newRecord.result,
            screenshot_url: data.screenshotUrl,
            created_at: newRecord.created_at,
          })
          .select()
          .single()

        if (!error && dbData) {
          // Sync with local cache too
          const current = getLocalHistory()
          saveLocalHistory([dbData as StoredDiagnosis, ...current.filter((c) => c.id !== newRecord.id)])
          return dbData as StoredDiagnosis
        }
      }
    } catch (err) {
      console.warn('Supabase insert failed, saving to local persistence:', err)
    }
  }

  // Fallback to local storage
  const current = getLocalHistory()
  const updated = [newRecord, ...current.filter((c) => c.id !== newRecord.id)]
  saveLocalHistory(updated)
  return newRecord
}

/**
 * Fetches past saved resolutions ordered by created_at DESC
 */
export async function getUserHistory(userId: string = 'guest'): Promise<StoredDiagnosis[]> {
  if (isSupabaseConfigured()) {
    try {
      const client = createBrowserSupabaseClient()
      if (client) {
        const { data, error } = await client
          .from('diagnoses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return data as StoredDiagnosis[]
        }
      }
    } catch (err) {
      console.warn('Supabase query failed, returning local history:', err)
    }
  }

  return getLocalHistory()
}

/**
 * Removes a saved diagnosis by ID
 */
export async function deleteDiagnosis(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const client = createBrowserSupabaseClient()
      if (client) {
        const { error } = await client.from('diagnoses').delete().eq('id', id)
        if (!error) {
          const current = getLocalHistory()
          saveLocalHistory(current.filter((item) => item.id !== id))
          return true
        }
      }
    } catch (err) {
      console.warn('Supabase delete failed, removing locally:', err)
    }
  }

  const current = getLocalHistory()
  saveLocalHistory(current.filter((item) => item.id !== id))
  return true
}
