export type OperatingSystem = 'macos' | 'linux' | 'wsl'
export type MacArch = 'arm64' | 'intel'
export type Runtime = 'node' | 'python' | 'docker' | 'rust' | 'go'
export type PresetId = 'node-gyp' | 'python-ssl' | 'docker-permission' | 'cocoapods'
export type Environment = { os: OperatingSystem; arch: MacArch }

export const OPERATING_SYSTEMS: { id: OperatingSystem; label: string }[] = [
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Ubuntu/Linux' },
  { id: 'wsl', label: 'Windows WSL2' },
]

export const MAC_ARCHES: { id: MacArch; label: string; detail: string }[] = [
  { id: 'arm64', label: 'ARM64', detail: 'Apple Silicon (M1–M4)' },
  { id: 'intel', label: 'Intel', detail: 'x86_64' },
]

export const RUNTIMES: { id: Runtime; label: string; version?: string }[] = [
  { id: 'node', label: 'Node.js', version: '20.x' },
  { id: 'python', label: 'Python', version: '3.11' },
  { id: 'docker', label: 'Docker' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
]

export function environmentLabel({ os, arch }: Environment) {
  if (os === 'macos') return `macOS · ${arch === 'arm64' ? 'ARM64' : 'Intel'}`
  return OPERATING_SYSTEMS.find((o) => o.id === os)?.label ?? os
}

export type Preset = {
  id: PresetId
  label: string
  logFile: string
  configFile: { name: string; language: string; content: string }
  log: string
  env: Environment
  runtimes: Runtime[]
}

export const PRESETS: Record<PresetId, Preset> = {
  'node-gyp': {
    id: 'node-gyp',
    label: 'node-gyp build error',
    logFile: 'npm-install.log',
    env: { os: 'macos', arch: 'arm64' },
    runtimes: ['node', 'python'],
    log: `npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR!
npm ERR! While resolving: web-app@2.4.0
npm ERR! Found: react@19.0.0
npm ERR! node_modules/react
npm ERR!   react@"^19.0.0" from the root project
npm ERR!
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^17.0.0 || ^18.0.0" from react-beautiful-dnd@13.1.1
npm WARN deprecated node-sass@7.0.3: Node Sass is no longer supported
gyp info using node-gyp@9.4.0
gyp info using node@20.18.0 | darwin | arm64
gyp ERR! find Python Python is not set from command line or npm configuration
gyp ERR! stack Error: \`make\` failed with exit code: 2
gyp ERR! stack     at ChildProcess.onExit (/usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/build.js:203:23)
gyp ERR! System Darwin 24.1.0
gyp ERR! cwd /Users/dev/projects/web-app/node_modules/node-sass
gyp ERR! build error
npm ERR! A complete log of this run can be found in: /Users/dev/.npm/_logs/2026-10-23T09_14_02_118Z-debug-0.log`,
    configFile: {
      name: 'package.json',
      language: 'json',
      content: `{
  "name": "web-app",
  "version": "2.4.0",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "next": "16.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-beautiful-dnd": "^13.1.1"
  },
  "devDependencies": {
    "node-sass": "^7.0.3",
    "typescript": "^5.6.3"
  }
}`,
    },
  },
  'python-ssl': {
    id: 'python-ssl',
    label: 'Python SSL certificate failure',
    logFile: 'pip-install.log',
    env: { os: 'macos', arch: 'arm64' },
    runtimes: ['python'],
    log: `$ python3 --version && uname -sm
Python 3.11.9
Darwin arm64
$ pip install -r requirements.txt
WARNING: Retrying (Retry(total=4)) after connection broken by 'SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1006)'))': /simple/requests/
WARNING: Retrying (Retry(total=3)) after connection broken by 'SSLError(...)': /simple/requests/
Could not fetch URL https://pypi.org/simple/requests/: There was a problem confirming the ssl certificate
  HTTPSConnectionPool(host='pypi.org', port=443): Max retries exceeded with url: /simple/requests/
  (Caused by SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed')))
ERROR: Could not find a version that satisfies the requirement requests==2.32.3 (from versions: none)
ERROR: No matching distribution found for requests==2.32.3`,
    configFile: {
      name: 'requirements.txt',
      language: 'text',
      content: `# Python 3.11
requests==2.32.3
fastapi==0.115.2
uvicorn[standard]==0.32.0
pydantic==2.9.2
python-dotenv==1.0.1`,
    },
  },
  'docker-permission': {
    id: 'docker-permission',
    label: 'Docker permission denied',
    logFile: 'docker-compose.log',
    env: { os: 'linux', arch: 'arm64' },
    runtimes: ['docker'],
    log: `$ uname -a
Linux devbox 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux
$ docker compose up -d
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock:
Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.47/containers/json": dial unix /var/run/docker.sock: connect: permission denied
$ ls -l /var/run/docker.sock
srw-rw---- 1 root docker 0 Oct 23 09:12 /var/run/docker.sock
$ groups
dev adm sudo
Error: exit status 1`,
    configFile: {
      name: 'docker-compose.yml',
      language: 'yaml',
      content: `services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - db
  db:
    image: postgres:17
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:`,
    },
  },
  cocoapods: {
    id: 'cocoapods',
    label: 'CocoaPods Apple Silicon mismatch',
    logFile: 'pod-install.log',
    env: { os: 'macos', arch: 'arm64' },
    runtimes: ['node'],
    log: `$ cd ios && pod install
Analyzing dependencies
[!] Oh no, an error occurred.
LoadError - dlopen(/Library/Ruby/Gems/2.6.0/gems/ffi-1.15.5/lib/ffi_c.bundle, 0x0009): tried:
  '/Library/Ruby/Gems/2.6.0/gems/ffi-1.15.5/lib/ffi_c.bundle'
  (mach-o file, but is an incompatible architecture (have 'x86_64', need 'arm64e'))
/System/Library/Frameworks/Ruby.framework/Versions/2.6/usr/lib/ruby/2.6.0/rubygems/core_ext/kernel_require.rb:54:in 'require'
/Library/Ruby/Gems/2.6.0/gems/ffi-1.15.5/lib/ffi.rb:5:in '<top (required)>'
/Library/Ruby/Gems/2.6.0/gems/ethon-0.16.0/lib/ethon.rb:2:in 'require'
Error: pod install failed with exit code 1`,
    configFile: {
      name: 'Podfile',
      language: 'ruby',
      content: `platform :ios, '15.1'
prepare_react_native_project!

target 'MobileApp' do
  config = use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  post_install do |installer|
    react_native_post_install(installer)
  end
end`,
    },
  },
}

export const PRESET_LIST = Object.values(PRESETS)

export function detectPreset(log: string): PresetId | null {
  if (/docker\.sock|docker daemon/i.test(log)) return 'docker-permission'
  if (/CERTIFICATE_VERIFY_FAILED|SSLError/i.test(log)) return 'python-ssl'
  if (/pod install|ffi_c\.bundle|cocoapods/i.test(log)) return 'cocoapods'
  if (/gyp ERR!|ERESOLVE|npm ERR!/i.test(log)) return 'node-gyp'
  return null
}

export function detectEnvironment(log: string): Environment | null {
  if (/microsoft-standard|WSL/i.test(log)) return { os: 'wsl', arch: 'arm64' }
  if (/darwin|\/Users\/|arm64e/i.test(log)) {
    return { os: 'macos', arch: /x86_64 \||darwin \| x64|darwin x86_64/i.test(log) ? 'intel' : 'arm64' }
  }
  if (/ubuntu|linux|\/home\//i.test(log)) return { os: 'linux', arch: 'arm64' }
  return null
}

export type FixStep = {
  title: string
  description: string
  command: string
  why: string
}

export type Diagnosis = {
  id: string
  presetId: PresetId
  env: Environment
  alternative: boolean
  signature: string
  severity: 'critical' | 'warning'
  label: string
  confidence: number
  timeToFix: string
  summary: string
  rootCause: string[]
  steps: FixStep[]
  verification: { command: string; expected: string }
}

type DiagnosisBody = Omit<Diagnosis, 'id' | 'presetId' | 'env' | 'alternative' | 'signature'>

const linuxToolchain: FixStep = {
  title: 'Install the build-essential toolchain',
  description: 'node-gyp needs gcc, g++, make, and Python 3 to build native modules.',
  command: 'sudo apt-get update && sudo apt-get install -y build-essential python3',
  why: 'Provides the compilers and Python interpreter that node-gyp shells out to when compiling native addons.',
}

const nodeGypToolchain: Record<OperatingSystem, FixStep> = {
  macos: {
    title: 'Install the Xcode Command Line Tools',
    description: 'node-gyp needs a C/C++ compiler and make to build native modules.',
    command: 'xcode-select --install',
    why: 'Installs clang, make, and the macOS SDK headers that node-gyp calls when compiling native addons like node-sass.',
  },
  linux: linuxToolchain,
  wsl: linuxToolchain,
}

const sslCertStep: Record<OperatingSystem, FixStep> = {
  macos: {
    title: 'Run the bundled certificate installer',
    description: 'python.org builds on macOS ship without a CA bundle linked to OpenSSL.',
    command: '"/Applications/Python 3.11/Install Certificates.command"',
    why: 'macOS Python uses its own OpenSSL, not the system Keychain. This script installs certifi and symlinks its CA bundle where OpenSSL expects it.',
  },
  linux: {
    title: 'Refresh the system CA certificates',
    description: 'An outdated ca-certificates package cannot verify pypi.org.',
    command: 'sudo apt-get install --reinstall -y ca-certificates && sudo update-ca-certificates',
    why: 'Rebuilds /etc/ssl/certs so OpenSSL can find a trusted root for the pypi.org certificate chain.',
  },
  wsl: {
    title: 'Refresh the WSL CA certificates',
    description: 'WSL distros do not inherit the Windows certificate store.',
    command: 'sudo apt-get install --reinstall -y ca-certificates && sudo update-ca-certificates',
    why: 'Your Windows host may trust a corporate root CA that the Linux side never sees. Rebuilding the store is the first step to syncing them.',
  },
}

const dockerFirstStep: Record<OperatingSystem, FixStep> = {
  macos: {
    title: 'Start Docker Desktop',
    description: 'On macOS the socket only exists while Docker Desktop is running.',
    command: 'open -a Docker && docker context use desktop-linux',
    why: 'Docker Desktop owns the VM and socket. Selecting its context points the CLI at the socket your user can access.',
  },
  linux: {
    title: 'Add your user to the docker group',
    description: 'The socket is owned by root:docker, and you are not in that group.',
    command: 'sudo usermod -aG docker $USER',
    why: 'Grants your account read/write on /var/run/docker.sock without making every docker command require sudo.',
  },
  wsl: {
    title: 'Add your user to the docker group',
    description: 'Inside WSL the socket is owned by root:docker.',
    command: 'sudo usermod -aG docker $USER',
    why: 'Grants your WSL user access to the daemon socket. If you use Docker Desktop, also enable WSL integration for this distro.',
  },
}

function nodeGyp(os: OperatingSystem, alternative: boolean): DiagnosisBody {
  if (alternative) {
    return {
      severity: 'warning',
      label: 'Legacy Peer Dependency Override',
      confidence: 71,
      timeToFix: '~2 min',
      summary: 'Bypass the strict peer check and swap the native Sass build for a prebuilt one.',
      rootCause: [
        'If you can’t upgrade the drag-and-drop library right now, you can tell npm to tolerate the React version mismatch. This is a stop-gap: the package was never tested against React 19, so some interactions may misbehave.',
        'The native build failure goes away once you replace node-sass with sass, which is pure JavaScript and never needs a compiler.',
      ],
      steps: [
        {
          title: 'Replace node-sass with the pure-JS sass package',
          description: 'Removes the native build step that triggers node-gyp.',
          command: 'npm uninstall node-sass && npm install -D sass',
          why: 'sass (Dart Sass) is the officially supported compiler and ships as plain JavaScript, so no toolchain is required.',
        },
        {
          title: 'Install with legacy peer dependency resolution',
          description: 'Restores npm v6 behaviour, which warns instead of failing on peer conflicts.',
          command: 'npm install --legacy-peer-deps',
          why: 'Lets npm finish the install even though react-beautiful-dnd declares an older React peer range.',
        },
        {
          title: 'Persist the flag for your team',
          description: 'Writes the setting to a project-level .npmrc so CI behaves the same way.',
          command: 'echo "legacy-peer-deps=true" >> .npmrc',
          why: 'Without this, teammates and CI will hit the exact same ERESOLVE error on a fresh install.',
        },
      ],
      verification: { command: 'npm ls sass react-beautiful-dnd', expected: 'sass@1.80.6' },
    }
  }
  return {
    severity: 'critical',
    label: 'Critical Dependency Mismatch',
    confidence: 94,
    timeToFix: '~5 min',
    summary: 'Two independent problems stopped the install: a React version conflict and a missing native build toolchain.',
    rootCause: [
      'Your project uses React 19, but react-beautiful-dnd only says it works with React 17 or 18. npm refuses to guess, so it stops the whole install instead of risking a broken app.',
      'Separately, node-sass tries to compile C++ code on your machine during install. Your system is missing the compiler tools it needs, so that build step fails too.',
    ],
    steps: [
      {
        title: 'Swap to a React 19 compatible drag-and-drop library',
        description: '@hello-pangea/dnd is a maintained, drop-in fork with the same API.',
        command: 'npm uninstall react-beautiful-dnd && npm install @hello-pangea/dnd',
        why: 'Resolves the peer conflict at the source rather than suppressing it. Imports stay identical apart from the package name.',
      },
      {
        title: 'Replace deprecated node-sass with sass',
        description: 'Dart Sass is the supported compiler and needs no native build.',
        command: 'npm uninstall node-sass && npm install -D sass',
        why: 'node-sass is end-of-life. Removing it eliminates the node-gyp build that caused the gyp ERR! lines.',
      },
      nodeGypToolchain[os],
      {
        title: 'Clean install from a fresh lockfile',
        description: 'Clears stale resolutions cached from the failed attempt.',
        command: 'rm -rf node_modules package-lock.json && npm install',
        why: 'A partially written lockfile can keep pinning the conflicting versions. Regenerating it guarantees npm resolves the new tree.',
      },
    ],
    verification:
      os === 'macos'
        ? { command: 'xcode-select -p && npm ls react @hello-pangea/dnd', expected: '/Library/Developer/CommandLineTools' }
        : { command: 'gcc --version && npm ls react @hello-pangea/dnd', expected: 'gcc (Ubuntu 13.2.0) 13.2.0' },
  }
}

function pythonSsl(os: OperatingSystem, alternative: boolean): DiagnosisBody {
  if (alternative) {
    return {
      severity: 'warning',
      label: 'Insecure Trusted-Host Bypass',
      confidence: 62,
      timeToFix: '~1 min',
      summary: 'Skip certificate verification for PyPI hosts only. Unblocks you now, but weakens supply-chain security.',
      rootCause: [
        'If you are behind a corporate proxy that re-signs HTTPS traffic and cannot get its root certificate, you can tell pip to trust the PyPI hosts without verifying them.',
        'This removes the protection that stops a malicious network from swapping packages. Use it only on a network you trust, and revert it afterwards.',
      ],
      steps: [
        {
          title: 'Install with PyPI marked as a trusted host',
          description: 'One-off install that skips verification for the two PyPI domains.',
          command: 'pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt',
          why: 'pip downloads the index from pypi.org and the wheels from files.pythonhosted.org, so both must be trusted.',
        },
        {
          title: 'Upgrade certifi while you are unblocked',
          description: 'A fresh CA bundle often makes the bypass unnecessary next time.',
          command: 'pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --upgrade certifi pip',
          why: 'Older certifi bundles are missing recently rotated root certificates.',
        },
      ],
      verification: { command: 'pip show requests | head -2', expected: 'Version: 2.32.3' },
    }
  }
  return {
    severity: 'critical',
    label: 'TLS Trust Chain Broken',
    confidence: 91,
    timeToFix: '~3 min',
    summary: 'Python cannot verify pypi.org’s HTTPS certificate, so pip refuses to download anything.',
    rootCause: [
      'Every HTTPS connection checks the server’s certificate against a list of trusted authorities. Your Python install can’t find that list, so it treats pypi.org as untrusted and drops the connection.',
      'Because no package index could be read, pip reports “from versions: none” — the package exists, pip just never saw it.',
    ],
    steps: [
      sslCertStep[os],
      {
        title: 'Upgrade pip and certifi',
        description: 'Ensures Python ships the newest Mozilla CA bundle.',
        command: 'python3 -m pip install --upgrade pip certifi',
        why: 'certifi is the CA bundle requests and pip rely on. Newer versions include recently added root certificates.',
      },
      {
        title: 'Point pip at your corporate CA (only if behind a proxy)',
        description: 'Skip this if you are on a home or public network.',
        command: 'pip config set global.cert /path/to/corporate-root-ca.pem',
        why: 'TLS-inspecting proxies re-sign traffic with their own root. pip must trust that root explicitly to verify the chain.',
      },
    ],
    verification: {
      command: `python3 -c "import urllib.request; urllib.request.urlopen('https://pypi.org'); print('SSL OK')"`,
      expected: 'SSL OK',
    },
  }
}

function dockerPermission(os: OperatingSystem, alternative: boolean): DiagnosisBody {
  if (alternative) {
    return {
      severity: 'warning',
      label: 'Rootless Docker Mode',
      confidence: 68,
      timeToFix: '~6 min',
      summary: 'Run the Docker daemon under your own user so no group membership or root socket is needed.',
      rootCause: [
        'Instead of giving your account access to the root-owned daemon, rootless mode starts a separate daemon that belongs to you. Nothing needs sudo, and a container escape can’t reach root.',
        'Trade-off: some networking features and ports below 1024 need extra setup.',
      ],
      steps: [
        {
          title: 'Install the rootless extras',
          description: 'Provides the setup tool and user-namespace helpers.',
          command: 'sudo apt-get install -y docker-ce-rootless-extras uidmap',
          why: 'uidmap supplies newuidmap/newgidmap, which rootless Docker uses to map container users onto your account.',
        },
        {
          title: 'Run the rootless setup tool',
          description: 'Creates a per-user systemd service for the daemon.',
          command: 'dockerd-rootless-setuptool.sh install',
          why: 'Configures and starts a daemon that listens on a socket inside your runtime directory.',
        },
        {
          title: 'Point the CLI at your user socket',
          description: 'Persist this in your shell profile.',
          command: 'echo "export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock" >> ~/.bashrc && source ~/.bashrc',
          why: 'Without DOCKER_HOST the CLI keeps trying the root-owned /var/run/docker.sock.',
        },
      ],
      verification: { command: 'docker info --format "{{.SecurityOptions}}"', expected: 'name=rootless' },
    }
  }
  const steps: FixStep[] = [dockerFirstStep[os]]
  if (os !== 'macos') {
    steps.push({
      title: 'Refresh your group membership',
      description: 'Group changes only apply to new login sessions.',
      command: os === 'wsl' ? 'wsl.exe --shutdown' : 'newgrp docker',
      why:
        os === 'wsl'
          ? 'Restarting the WSL VM forces a fresh login so the docker group is picked up. Reopen your terminal afterwards.'
          : 'Starts a subshell with the docker group active so you don’t have to log out and back in.',
    })
  }
  steps.push({
    title: 'Bring your stack back up',
    description: 'Re-run the command that originally failed.',
    command: 'docker compose up -d',
    why: 'Confirms the CLI can now reach the daemon socket and that compose can create the containers.',
  })
  return {
    severity: 'critical',
    label: 'Daemon Socket Access Denied',
    confidence: 97,
    timeToFix: '~2 min',
    summary: 'Your user account isn’t allowed to talk to the Docker daemon, so every docker command is rejected.',
    rootCause: [
      'The Docker CLI is just a client. It sends requests to a background service through a socket file, and that file is only open to root and the docker group.',
      'Your account belongs to dev, adm, and sudo — but not docker — so the operating system blocks the connection before Docker even sees it.',
    ],
    steps,
    verification: { command: 'docker run --rm hello-world', expected: 'Hello from Docker!' },
  }
}

function cocoapods(os: OperatingSystem, alternative: boolean): DiagnosisBody {
  if (alternative) {
    return {
      severity: 'warning',
      label: 'Rosetta x86_64 Fallback',
      confidence: 74,
      timeToFix: '~3 min',
      summary: 'Run CocoaPods under Rosetta so the Intel-only ffi gem loads. Works, but slower and not future-proof.',
      rootCause: [
        'The ffi gem on disk was compiled for Intel chips. Rosetta translates Intel code on Apple Silicon, so running pod in Intel mode lets that library load.',
        'Apple is phasing Rosetta out over the next macOS releases, so treat this as a temporary bridge.',
      ],
      steps: [
        {
          title: 'Install Rosetta 2',
          description: 'Skip if you have already run an Intel app on this Mac.',
          command: 'softwareupdate --install-rosetta --agree-to-license',
          why: 'Rosetta is the translation layer that lets x86_64 binaries run on Apple Silicon.',
        },
        {
          title: 'Reinstall ffi for x86_64',
          description: 'Builds the gem’s native extension under Rosetta.',
          command: 'sudo arch -x86_64 gem install ffi',
          why: 'The arch prefix forces the Intel slice so the compiled bundle matches the process that loads it.',
        },
        {
          title: 'Run pod install under Rosetta',
          description: 'Use the same prefix every time you install pods.',
          command: 'cd ios && arch -x86_64 pod install',
          why: 'Keeps the whole Ruby process in x86_64 mode so every native gem has a matching architecture.',
        },
      ],
      verification: { command: 'arch -x86_64 pod --version', expected: '1.16.2' },
    }
  }
  return {
    severity: os === 'macos' ? 'critical' : 'warning',
    label: 'CPU Architecture Mismatch',
    confidence: os === 'macos' ? 93 : 58,
    timeToFix: '~4 min',
    summary: 'CocoaPods is loading an Intel-only native library on an Apple Silicon Mac.',
    rootCause: [
      'CocoaPods depends on a small native library called ffi. The copy installed in macOS’s built-in Ruby was compiled for Intel chips, but your Mac runs on Apple Silicon, so it can’t load it.',
      'The system Ruby (2.6) is also deprecated by Apple. Installing CocoaPods through Homebrew gives you a modern, native ARM64 Ruby and avoids the problem entirely.',
      ...(os === 'macos' ? [] : ['Note: CocoaPods only runs on macOS. Switch the target OS to macOS for accurate commands.']),
    ],
    steps: [
      {
        title: 'Remove the system-Ruby CocoaPods install',
        description: 'Clears the gem copies with the wrong architecture.',
        command: 'sudo gem uninstall -a -x cocoapods ffi',
        why: 'Leaving them in place lets the old Intel ffi bundle shadow the new native one.',
      },
      {
        title: 'Install CocoaPods with Homebrew',
        description: 'Ships a native ARM64 Ruby and ffi.',
        command: 'brew install cocoapods',
        why: 'Homebrew on Apple Silicon installs to /opt/homebrew with arm64 binaries, so every native extension matches your CPU.',
      },
      {
        title: 'Reinstall your pods cleanly',
        description: 'Regenerates the Pods project with the new toolchain.',
        command: 'cd ios && pod deintegrate && pod install --repo-update',
        why: 'Removes artifacts from the failed run and refreshes the spec repo so versions resolve correctly.',
      },
    ],
    verification: { command: 'which pod && pod --version', expected: '/opt/homebrew/bin/pod' },
  }
}

const BUILDERS: Record<PresetId, (os: OperatingSystem, alternative: boolean) => DiagnosisBody> = {
  'node-gyp': nodeGyp,
  'python-ssl': pythonSsl,
  'docker-permission': dockerPermission,
  cocoapods,
}

const SIGNATURES: Record<PresetId, string> = {
  'node-gyp': 'ERESOLVE · gyp ERR! build error',
  'python-ssl': 'SSL: CERTIFICATE_VERIFY_FAILED',
  'docker-permission': 'dial unix /var/run/docker.sock: permission denied',
  cocoapods: "LoadError · incompatible architecture (have 'x86_64', need 'arm64e')",
}

export function diagnosisId(presetId: PresetId, env: Environment, alternative: boolean) {
  return `${presetId}:${env.os}:${env.arch}:${alternative ? 'alt' : 'primary'}`
}

export function buildDiagnosis(presetId: PresetId, env: Environment, alternative = false): Diagnosis {
  return {
    ...BUILDERS[presetId](env.os, alternative),
    id: diagnosisId(presetId, env, alternative),
    presetId,
    env,
    alternative,
    signature: SIGNATURES[presetId],
  }
}

export type SavedSolution = {
  id: string
  presetId: PresetId
  env: Environment
  alternative: boolean
  title: string
  label: string
  severity: Diagnosis['severity']
  savedAt: string
}

function toSaved(diagnosis: Diagnosis, savedAt: string): SavedSolution {
  return {
    id: diagnosis.id,
    presetId: diagnosis.presetId,
    env: diagnosis.env,
    alternative: diagnosis.alternative,
    title: PRESETS[diagnosis.presetId].label,
    label: diagnosis.label,
    severity: diagnosis.severity,
    savedAt,
  }
}

export function saveDiagnosis(diagnosis: Diagnosis): SavedSolution {
  return toSaved(diagnosis, 'Just now')
}

export const INITIAL_SAVED: SavedSolution[] = [
  toSaved(buildDiagnosis('docker-permission', { os: 'linux', arch: 'arm64' }), '2 days ago'),
  toSaved(buildDiagnosis('cocoapods', { os: 'macos', arch: 'arm64' }), '5 days ago'),
  toSaved(buildDiagnosis('python-ssl', { os: 'wsl', arch: 'arm64' }, true), '1 week ago'),
]
