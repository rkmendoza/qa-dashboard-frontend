import { useState, useEffect } from 'react'

const ResultIcon = ({ result }) => {
  if (result === 'passed') return <span className="text-green-500 text-sm">✅</span>
  if (result === 'failed') return <span className="text-red-500 text-sm">❌</span>
  if (result === 'blocked') return <span className="text-yellow-500 text-sm">⚠️</span>
  return <span className="text-gray-300 text-sm">⏳</span>
}

const StepCheck = ({ index, text, result, onChange }) => {
  const isPassed = result === 'passed'
  const isFailed = result === 'failed'
  return (
    <div className={`flex items-center gap-3 rounded-lg p-3 border transition ${
      isPassed ? 'bg-green-50 border-green-200' :
      isFailed ? 'bg-red-50 border-red-200' :
      'bg-white border-gray-200'
    }`}>
      <span className="text-sm text-gray-400 flex-shrink-0 w-5">{index + 1}.</span>
      <span className="flex-1 text-sm text-gray-700">{text}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(index, 'passed')}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
            isPassed
              ? 'bg-green-200 text-green-800 border-green-300'
              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600'
          }`}
          title="Pasó"
        >
          ✅
        </button>
        <button
          onClick={() => onChange(index, 'failed')}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
            isFailed
              ? 'bg-red-200 text-red-800 border-red-300'
              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-600'
          }`}
          title="Falló"
        >
          ❌
        </button>
      </div>
    </div>
  )
}

const ExecutionModal = ({ target, tc: tcProp, contextLabel, onClose, onExecute, onCreateBug }) => {
  const effectiveTarget = target || (tcProp ? { type: 'tc', tc: tcProp } : null)
  const isPlan = effectiveTarget?.type === 'plan'
  const plan = isPlan ? effectiveTarget.plan : null
  const targetTC = isPlan ? effectiveTarget?.tc || null : null
  const [step, setStep] = useState(isPlan && targetTC ? 2 : 1)
  const [result, setResult] = useState(null)
  const [environment, setEnvironment] = useState('sandbox')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [executingTC, setExecutingTC] = useState(isPlan ? targetTC : null)
  const [stepResults, setStepResults] = useState({})

  useEffect(() => {
    if (isPlan && targetTC) {
      setExecutingTC(targetTC)
      setStep(2)
      setStepResults({})
    }
  }, [isPlan, targetTC])

  const currentTC = isPlan ? executingTC : (effectiveTarget?.tc || effectiveTarget)
  const steps = (currentTC?.steps || []).filter(Boolean)
  const hasSteps = steps.length > 0
  const allStepsChecked = hasSteps && steps.every((_, i) => stepResults[i] !== undefined)
  const anyStepFailed = steps.some((_, i) => stepResults[i] === 'failed')

  const setStepResult = (index, value) => {
    setStepResults(prev => ({
      ...prev,
      [index]: prev[index] === value ? undefined : value
    }))
  }

  const handleConfirm = async () => {
    if (!result) return
    setSaving(true)
    try {
      if (isPlan && executingTC) {
        await onExecute(plan, executingTC, result, environment, notes)
        setExecutingTC(null)
        onClose()
      } else {
        await onExecute(result, environment, notes)
        onClose()
      }
    } finally {
      setSaving(false)
      setStep(1)
      setResult(null)
      setStepResults({})
      setEnvironment('sandbox')
      setNotes('')
    }
  }

  const handleCreateBug = () => {
    if (!onCreateBug || !currentTC) return
    const failedSteps = steps
      .map((s, i) => ({ index: i, text: s, result: stepResults[i] }))
      .filter(s => s.result === 'failed')
    onCreateBug(currentTC, failedSteps, notes)
    onClose()
  }

  // Determine if we're in step-checking mode (result not yet selected)
  const isStepCheckMode = !result

  // Render step checkboxes + expected result
  const renderStepCheckArea = (tc) => {
    const tSteps = (tc?.steps || []).filter(Boolean)
    return (
      <div className="space-y-3">
        {tSteps.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            <p className="text-xs text-gray-500">Marca cada paso como que pasó ✅ o falló ❌</p>
            {tSteps.map((stepText, i) => (
              <StepCheck key={i} index={i} text={stepText} result={stepResults[i]} onChange={setStepResult} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">Sin pasos definidos</p>
        )}
        {tc?.expected_result && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <span className="font-medium">Resultado esperado:</span> {tc.expected_result}
          </div>
        )}
      </div>
    )
  }

  // Render result selection buttons (constrained by step results)
  const renderResultButtons = () => {
    const passedDisabled = hasSteps && allStepsChecked && anyStepFailed
    const failedDisabled = hasSteps && allStepsChecked && !anyStepFailed

    const options = [
      { value: 'passed', emoji: '✅', label: 'Pasó', cls: 'border-green-200 hover:bg-green-50', disabled: passedDisabled },
      { value: 'failed', emoji: '❌', label: 'Falló', cls: 'border-red-200 hover:bg-red-50', disabled: failedDisabled },
      { value: 'blocked', emoji: '⚠️', label: 'Bloqueado', cls: 'border-yellow-200 hover:bg-yellow-50', disabled: false },
    ]

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 text-center">
          {hasSteps && allStepsChecked
            ? 'Resultado calculado de los pasos'
            : 'Selecciona el resultado de la ejecución'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {options.map(option => (
            <button key={option.value}
              onClick={() => { setResult(option.value); setStep(isPlan && executingTC ? 3 : 2) }}
              disabled={option.disabled}
              className={`flex flex-col items-center gap-2 p-4 border-2 rounded-2xl font-medium text-sm transition ${
                option.disabled
                  ? 'opacity-30 cursor-not-allowed border-gray-100 bg-gray-50'
                  : option.cls
              }`}>
              <span className="text-2xl">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        {anyStepFailed && onCreateBug && (
          <button onClick={handleCreateBug}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium hover:bg-orange-100 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Crear bug en ADO
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400">{contextLabel || (isPlan ? 'Ejecutar test plan' : 'Ejecutar test case')}</p>
            <h3 className="text-sm font-semibold text-gray-900">
              {isPlan ? (executingTC ? executingTC.title : plan?.name) : currentTC?.title}
            </h3>
            {currentTC && (
              <p className="text-xs text-gray-400 mt-1">{currentTC.module} · {currentTC.priority}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan TC list */}
        {isPlan && step === 1 && !executingTC && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">Test Cases en el plan</p>
              <div className="space-y-2">
                {plan?.test_plan_cases?.map((item, index) => {
                  const tcase = item.test_cases
                  return (
                    <div key={tcase.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
                      <span className="text-sm text-gray-400 flex-shrink-0">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{tcase.title}</p>
                        <p className="text-xs text-gray-400">{tcase.module} · {tcase.priority}</p>
                      </div>
                      <button
                        onClick={() => {
                          setExecutingTC(tcase)
                          setStepResults({})
                          setResult(null)
                          setStep(2)
                        }}
                        className="text-blue-500 hover:text-blue-700 text-xs px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition flex-shrink-0"
                      >
                        Ejecutar
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <button onClick={onClose}
              className="w-full text-xs text-gray-500 hover:text-gray-700 transition">
              Cancelar
            </button>
          </div>
        )}

        {/* Step checking + result selection */}
        {isStepCheckMode && !(isPlan && step === 1 && !executingTC) && (
          <div className="space-y-4">
            {renderStepCheckArea(currentTC)}
            {renderResultButtons()}
            <button onClick={onClose}
              className="w-full text-xs text-gray-500 hover:text-gray-700 transition">
              Cancelar
            </button>
          </div>
        )}

        {/* Confirm screen */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ResultIcon result={result} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{result === 'passed' ? 'Pasó' : result === 'failed' ? 'Falló' : 'Bloqueado'}</p>
                <p className="text-xs text-gray-500">Confirma el resultado y agrega contexto.</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Ambiente</p>
              <div className="grid grid-cols-2 gap-2">
                {['sandbox', 'production'].map(env => (
                  <button key={env}
                    onClick={() => setEnvironment(env)}
                    className={`py-2 rounded-lg border text-sm font-medium transition ${environment === env ? env === 'production' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {env === 'sandbox' ? '🧪 Sandbox' : '🚀 Producción'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Ej: Falló en el paso 3, error 500..." />
            </div>

            <div className="flex gap-2">
              <button onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => {
                  setResult(null)
                  if (isPlan && executingTC) {
                    setStep(2)
                  } else {
                    setStep(1)
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                Atrás
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExecutionModal
