async function run(target: PresetId, targetEnv: Environment, alternative = false) {
  clearTimeout(timer.current)
  setIsDiagnosing(true)

  // Real LLM (Ollama) try karo
  try {
    const res = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log,
        os: targetEnv.os,
        arch: targetEnv.arch,
        runtimes,
      }),
    })

    if (res.ok) {
      const ai = await res.json()

      const diagnosis: Diagnosis = {
        id: `ai-${Date.now()}`,
        presetId: target,
        env: targetEnv,
        alternative,
        signature: 'Local LLM (Ollama)',
        severity: ai.severity === 'critical' ? 'critical' : 'warning',
        label: ai.label || 'Diagnosis',
        confidence: Math.min(95, Math.max(60, Number(ai.confidence) || 78)),
        timeToFix: ai.timeToFix || '~5 min',
        summary: ai.summary || '',
        rootCause: Array.isArray(ai.rootCause) ? ai.rootCause : [String(ai.rootCause || 'Unknown')],
        steps: Array.isArray(ai.steps) ? ai.steps : [],
        verification: ai.verification || {
          command: 'echo "Please verify manually"',
          expected: 'success',
        },
      }

      setDiagnosis(diagnosis)
      setIsDiagnosing(false)
      return
    }
  } catch (err) {
    console.warn('Ollama unavailable → using fallback')
  }

  // Fallback (purana canned diagnosis)
  timer.current = setTimeout(() => {
    setDiagnosis(buildDiagnosis(target, targetEnv, alternative))
    setIsDiagnosing(false)
  }, 1400)
}