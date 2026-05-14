import { useState, useEffect } from 'react'

const ResultIcon = ({ result }) => {
  if (result === 'passed') return <span className="text-green-500 text-sm">✅</span>
  if (result === 'failed') return <span className="text-red-500 text-sm">❌</span>
  if (result === 'blocked') return <span className="text-yellow-500 text-sm">⚠️</span>
  return <span className="text-gray-300 text-sm">⏳</span>
}

const ExecutionModal = ({ target, tc: tcProp, contextLabel, onClose, onExecute }) => {
  const effectiveTarget = target || (tcProp ? { type: 'tc', tc: tcProp } : null)
  const isPlan = effectiveTarget?.type === 'plan'
  const plan = isPlan ? effectiveTarget.plan : null
  //const targetTC = effectiveTarget?.tc || null
  const targetTC = isPlan ? effectiveTarget?.tc || null : null
  const [step, setStep] = useState(isPlan && targetTC ? 2 : 1)
  const [result, setResult] = useState(null)
  const [environment, setEnvironment] = useState('sandbox')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  //const [executingTC, setExecutingTC] = useState(targetTC)
  const [executingTC, setExecutingTC] = useState(isPlan ? targetTC : null)

  useEffect(() => {
    if (isPlan && targetTC) {
      setExecutingTC(targetTC)
      setStep(2)
    }
  }, [isPlan, targetTC])

  const tc = isPlan ? null : effectiveTarget?.tc || effectiveTarget

  const hasSteps = tc?.steps?.filter(Boolean).length > 0

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
      setEnvironment('sandbox')
      setNotes('')
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400">{contextLabel || (isPlan ? 'Ejecutar test plan' : 'Ejecutar test case')}</p>
            <h3 className="text-sm font-semibold text-gray-900">{isPlan ? plan.name : tc.title}</h3>
            {isPlan ? (
              <p className="text-xs text-gray-400 mt-1">{plan.module} · {plan.test_plan_cases?.length || 0} TCs</p>
            ) : (
              tc.module && <p className="text-xs text-gray-400 mt-1">{tc.module} · {tc.priority}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {isPlan ? (
              <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">Test Cases en el plan</p>
                <div className="space-y-2">
                  {plan.test_plan_cases?.map((item, index) => {
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
            ) : (
              hasSteps && (
                <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">Pasos</p>
                  <ol className="space-y-2">
                    {tc.steps.filter(Boolean).map((stepText, index) => (
                      <li key={index} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-gray-400 flex-shrink-0">{index + 1}.</span>
                        <span>{stepText}</span>
                      </li>
                    ))}
                  </ol>
                  {tc.expected_result && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Resultado esperado</p>
                      <p className="text-sm text-gray-700 mt-1">{tc.expected_result}</p>
                    </div>
                  )}
                </div>
              )
            )}

            {!isPlan && (
              <>
                <p className="text-xs text-gray-500 text-center">Selecciona el resultado de la ejecución</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'passed', emoji: '✅', label: 'Pasó', cls: 'border-green-200 hover:bg-green-50' },
                    { value: 'failed', emoji: '❌', label: 'Falló', cls: 'border-red-200 hover:bg-red-50' },
                    { value: 'blocked', emoji: '⚠️', label: 'Bloqueado', cls: 'border-yellow-200 hover:bg-yellow-50' },
                  ].map(option => (
                    <button key={option.value}
                      onClick={() => { setResult(option.value); setStep(2) }}
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-2xl font-medium text-sm transition ${option.cls}`}>
                      <span className="text-2xl">{option.emoji}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={onClose}
              className="w-full text-xs text-gray-500 hover:text-gray-700 transition">
              Cancelar
            </button>
          </div>
        ) : isPlan && executingTC && !result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Ejecutando:</span>
              <p className="text-sm font-semibold text-gray-900">{executingTC.title}</p>
            </div>
            {executingTC.steps?.filter(Boolean).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">Pasos</p>
                <ol className="space-y-2">
                  {executingTC.steps.filter(Boolean).map((stepText, index) => (
                    <li key={index} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-gray-400 flex-shrink-0">{index + 1}.</span>
                      <span>{stepText}</span>
                    </li>
                  ))}
                </ol>
                {executingTC.expected_result && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Resultado esperado</p>
                    <p className="text-sm text-gray-700 mt-1">{executingTC.expected_result}</p>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 text-center">Selecciona el resultado de la ejecución</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'passed', emoji: '✅', label: 'Pasó', cls: 'border-green-200 hover:bg-green-50' },
                { value: 'failed', emoji: '❌', label: 'Falló', cls: 'border-red-200 hover:bg-red-50' },
                { value: 'blocked', emoji: '⚠️', label: 'Bloqueado', cls: 'border-yellow-200 hover:bg-yellow-50' },
              ].map(option => (
                <button key={option.value}
                  onClick={() => setResult(option.value)}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-2xl font-medium text-sm transition ${option.cls}`}>
                  <span className="text-2xl">{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            {/* <button onClick={() => setExecutingTC(null)}
              className="w-full text-xs text-gray-500 hover:text-gray-700 transition">
              Volver al plan
            </button> */}
          </div>
        ) : (
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

                  if (isPlan) {
                    setStep(1)
                    setExecutingTC(null)
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
