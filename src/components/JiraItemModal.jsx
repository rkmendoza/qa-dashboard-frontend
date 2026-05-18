import { useState, useEffect } from 'react'
import axios from 'axios'
import { supabase } from '../supabaseClient'
import ExecutionModal from './ExecutionModal'

const BACKEND = import.meta.env.VITE_BACKEND_URL

const ResultIcon = ({ result }) => {
  if (result === 'passed') return <span className="text-green-500 text-sm">✅</span>
  if (result === 'failed') return <span className="text-red-500 text-sm">❌</span>
  if (result === 'blocked') return <span className="text-yellow-500 text-sm">⚠️</span>
  return <span className="text-gray-300 text-sm">⏳</span>
}

const priorityColors = {
  'Highest': '#ef4444',
  'High': '#f59e0b',
  'Medium': '#3b82f6',
  'Low': '#10b981',
  'Lowest': '#6b7280',
}

const JiraItemModal = ({ item, onClose, onUpdated }) => {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(item.status)
  const [transitionId, setTransitionId] = useState('')
  const [transitions, setTransitions] = useState([])
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')
  const [showAssocModal, setShowAssocModal] = useState(null)
  const [allPlans, setAllPlans] = useState([])
  const [allTCs, setAllTCs] = useState([])
  const [associations, setAssociations] = useState([])
  const [assocSearch, setAssocSearch] = useState('')
  const [assocLoading, setAssocLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedPlanCases, setSelectedPlanCases] = useState([])
  const [planDetailLoading, setPlanDetailLoading] = useState(false)
  const [executingTarget, setExecutingTarget] = useState(null)

  const fetchAssociations = async () => {
    const { data } = await supabase
      .from('bug_associations')
      .select(`
        *,
        test_plans(
          id, name, module, status,
          test_plan_cases(test_case_id, test_cases(id, title, priority, module, steps, expected_result, test_executions(result, executed_at))),
          plan_executions(result)
        ),
        test_cases(
          id, title, priority, module, steps, expected_result,
          test_executions(result, executed_at)
        )
      `)
      .eq('bug_id', item.id)
      .order('created_at')
    setAssociations(data || [])
  }

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/api/jira/detail/${item.id}`)
        setDetail(data)

        const { data: tx } = await axios.get(`${BACKEND}/api/jira/transitions/${item.id}`)
        setTransitions(tx || [])
        if (tx?.length > 0) {
          setTransitionId(tx[0].id)
        }
      } catch {
        setError('No se pudo cargar el detalle')
      }
      setLoading(false)
    }

    const fetchPlansAndTCs = async () => {
      const [{ data: plans }, { data: tcs }] = await Promise.all([
        supabase.from('test_plans').select('id, name, module, status, test_plan_cases(test_case_id)').order('name'),
        supabase.from('test_cases').select('id, title, priority, module').order('title')
      ])
      setAllPlans(plans || [])
      setAllTCs(tcs || [])
    }

    fetchDetail()
    fetchAssociations()
    fetchPlansAndTCs()
  }, [item.id])

  const handleTransition = async () => {
    if (!transitionId) return
    setSaving(true)
    setError('')
    try {
      const tx = transitions.find(t => t.id === transitionId)
      await axios.patch(`${BACKEND}/api/jira/transition/${item.id}`, {
        transitionId,
        status: tx?.to?.name || status
      })
      setStatus(tx?.to?.name || status)
      setSuccessMsg('Estado actualizado en Jira')
      onUpdated && onUpdated(item.id, tx?.to?.name || status)
      setTimeout(() => setSuccessMsg(''), 3000)

      const { data: newTx } = await axios.get(`${BACKEND}/api/jira/transitions/${item.id}`)
      setTransitions(newTx || [])
      if (newTx?.length > 0) setTransitionId(newTx[0].id)
    } catch {
      setError('Error al actualizar el estado')
    }
    setSaving(false)
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return
    setCommenting(true)
    setError('')
    try {
      const { data } = await axios.post(`${BACKEND}/api/jira/comment/${item.id}`, { text: comment })
      setDetail(prev => ({
        ...prev,
        comments: [...(prev.comments || []), {
          id: data.id,
          text: comment,
          author: 'Tú',
          date: new Date().toISOString()
        }]
      }))
      setComment('')
      setSuccessMsg('Comentario enviado a Jira')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message || 'Error al agregar el comentario')
    }
    setCommenting(false)
  }

  const handleAssociate = async (type, targetId) => {
    setAssocLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const exists = associations.find(a =>
        type === 'plan' ? a.test_plan_id === targetId : a.test_case_id === targetId
      )
      if (exists) {
        setError('Esta asociación ya existe')
        setAssocLoading(false)
        setShowAssocModal(null)
        setTimeout(() => setError(''), 3000)
        return
      }

      const { error } = await supabase.from('bug_associations').insert([{
        bug_id: item.id,
        test_plan_id: type === 'plan' ? targetId : null,
        test_case_id: type === 'tc' ? targetId : null,
        created_by: user.id
      }])

      if (error) throw error
      await fetchAssociations()
      setSuccessMsg('Asociación agregada correctamente')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Error al asociar: ' + err.message)
    }
    setAssocLoading(false)
    setShowAssocModal(null)
    setAssocSearch('')
  }

  const handleRemoveAssoc = async (assocId) => {
    await supabase.from('bug_associations').delete().eq('id', assocId)
    setAssociations(prev => prev.filter(a => a.id !== assocId))
  }

  const fetchPlanDetail = async (planId) => {
    setPlanDetailLoading(true)
    setSelectedPlanCases([])
    try {
      const { data: tpData, error } = await supabase
        .from('test_plan_cases')
        .select('order_index, test_cases(id, title, priority, module, steps, expected_result)')
        .eq('test_plan_id', planId)
        .order('order_index')

      if (error) throw error

      const { data: planExecs } = await supabase
        .from('plan_executions')
        .select('test_case_id, result, executed_at, environment')
        .eq('test_plan_id', planId)
        .order('executed_at', { ascending: false })

      const merged = (tpData || []).map(item => ({
        ...item,
        test_cases: {
          ...item.test_cases,
          test_executions: (planExecs || [])
            .filter(e => e.test_case_id === item.test_cases.id)
            .map(e => ({ result: e.result, executed_at: e.executed_at }))
        }
      }))

      setSelectedPlanCases(merged)
    } catch {
      setError('No se pudo cargar el plan asociado')
    }
    setPlanDetailLoading(false)
  }

  const openPlanDetail = async (plan) => {
    setSelectedPlan(plan)
    await fetchPlanDetail(plan.id)
  }

  const handleExecuteBugTC = async (tc, result, environment, notes) => {
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('test_executions').insert([{
        test_case_id: tc.id,
        result, environment, notes,
        executed_by: user.id
      }])
      if (error) throw error
      setExecutingTarget(null)
      onUpdated && onUpdated(item.id, status)
      await fetchAssociations()
      setSuccessMsg('Ejecución guardada correctamente')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Error al guardar la ejecución: ' + err.message)
    }
  }

  const handleExecuteBugPlanTC = async (plan, tc, result, environment, notes) => {
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('plan_executions').insert([{
        test_plan_id: plan.id,
        test_case_id: tc.id,
        result, environment, notes,
        executed_by: user.id
      }])
      if (error) throw error
      setExecutingTarget(null)
      await fetchPlanDetail(plan.id)
      await fetchAssociations()
      onUpdated && onUpdated(item.id, status)
      setSuccessMsg('Ejecución guardada correctamente')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Error al guardar la ejecución: ' + err.message)
    }
  }

  const handleCreateBugFromExecution = async (tc, failedSteps, notes) => {
    setError('')
    try {
      const stepsText = (tc.steps || []).filter(Boolean)
        .map((s, i) => {
          const failed = failedSteps.find(fs => fs.index === i)
          return `${i + 1}. ${s}${failed ? ' ❌ FALLÓ' : ''}`
        }).join('\n')

      const payload = {
        title: `[QA] ${tc.title} — Paso ${failedSteps.map(fs => fs.index + 1).join(', ')} falló`,
        description: `**Test Case:** ${tc.title}\n\n**Módulo:** ${tc.module || '—'}\n\n**Pasos:**\n${stepsText}\n\n**Resultado esperado:** ${tc.expected_result || 'N/A'}\n\n**Notas:** ${notes || '—'}`,
        priority: 'Medium',
        projectKey: 'RMBL'
      }

      await axios.post(`${BACKEND}/api/jira/create`, payload)
      setSuccessMsg('Bug creado en Jira')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Error al crear bug en Jira: ' + (err.response?.data?.error || err.message))
    }
  }

  const getTCResult = (tc) => {
    if (!tc?.test_executions?.length) return null
    const sorted = tc.test_executions.sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
    return sorted[0].result
  }

  const getPlanProgress = (plan) => {
    const executions = plan?.plan_executions || []
    const total = plan?.test_plan_cases?.length || 0
    const executed = executions.length
    const failed = executions.filter(e => e.result === 'failed').length
    const blocked = executions.filter(e => e.result === 'blocked').length
    return { total, executed, failed, blocked }
  }

  const sevColor = priorityColors[item.severity] || '#6b7280'

  const selectedTransition = transitions.find(t => t.id === transitionId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                {item.id}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                style={{ color: sevColor, background: sevColor + '15', borderColor: sevColor + '40' }}>
                {item.severity}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                {item.issue_type || 'Bug'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {status}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 leading-snug">{item.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Cargando detalle...
          </div>
        ) : (
          <>
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 p-5 border-b border-gray-100">
              {[
                { label: 'Asignado a', value: detail?.assignee },
                { label: 'Tipo', value: detail?.type },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-700">{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Descripción */}
            {detail?.description && (
              <div className="p-5 border-b border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Descripción</p>
                <div
                  className="text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: detail.description }}
                />
              </div>
            )}

            {/* Transiciones de estado */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Cambiar estado en Jira</p>
              <div className="flex gap-2">
                <select
                  value={transitionId}
                  onChange={e => setTransitionId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {transitions.length === 0 && <option value="">Sin transiciones disponibles</option>}
                  {transitions.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.to?.name || t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTransition}
                  disabled={saving || !transitionId}
                  className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {saving ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {/* Verificación */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">Plan de verificación</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAssocModal('plan'); setAssocSearch('') }}
                    className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded-lg transition">
                    + Test Plan
                  </button>
                  <button
                    onClick={() => { setShowAssocModal('tc'); setAssocSearch('') }}
                    className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg transition">
                    + TC suelto
                  </button>
                </div>
              </div>

              {associations.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-4">
                  Sin verificaciones asociadas aún
                </p>
              ) : (
                <div className="space-y-2">
                  {associations.map(assoc => {
                    if (assoc.test_plan_id) {
                      const plan = assoc.test_plans
                      const { total, executed, failed, blocked } = getPlanProgress(plan)
                      return (
                        <div key={assoc.id} className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                          <span className="text-base flex-shrink-0">📋</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{plan?.name}</p>
                            <p className="text-xs text-gray-400">{plan?.module} · {total} TCs · {executed}/{total} {failed} {blocked}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                            plan?.status === 'active' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            plan?.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {plan?.status === 'active' ? 'Activo' : plan?.status === 'completed' ? 'Completado' : 'Borrador'}
                          </span>
                          <button onClick={() => openPlanDetail(plan)}
                            className="text-green-500 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-200 hover:bg-green-50 transition flex-shrink-0 mr-2">
                            Ejecutar
                          </button>
                          <button onClick={() => openPlanDetail(plan)}
                            className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition flex-shrink-0 mr-2">
                            Ver plan
                          </button>
                          <button onClick={() => handleRemoveAssoc(assoc.id)}
                            className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    } else {
                      const tc = assoc.test_cases
                      const lastResult = getTCResult(tc)
                      return (
                        <div key={assoc.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                          <span className="text-base flex-shrink-0">🧪</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{tc?.title}</p>
                            <p className="text-xs text-gray-400">{tc?.module} · {tc?.priority}</p>
                            {lastResult && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <ResultIcon result={lastResult} />
                                Último: {lastResult === 'passed' ? 'Pasó' : lastResult === 'failed' ? 'Falló' : 'Bloqueado'}
                              </p>
                            )}
                          </div>
                          <button onClick={() => setExecutingTarget({ type: 'tc', tc })}
                            className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition flex-shrink-0 mr-2">
                            Ejecutar
                          </button>
                          <button onClick={() => handleRemoveAssoc(assoc.id)}
                            className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    }
                  })}
                </div>
              )}
            </div>

            {/* Modal asociar plan/TC */}
            {showAssocModal && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                onClick={e => e.target === e.currentTarget && setShowAssocModal(null)}>
                <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h4 className="text-sm font-medium text-gray-800">
                      {showAssocModal === 'plan' ? 'Asociar Test Plan' : 'Agregar TC suelto'}
                    </h4>
                    <button onClick={() => setShowAssocModal(null)} className="text-gray-400 hover:text-gray-600">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <input
                      value={assocSearch}
                      onChange={e => setAssocSearch(e.target.value)}
                      placeholder={showAssocModal === 'plan' ? 'Buscar plan...' : 'Buscar test case...'}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {showAssocModal === 'plan' ? (
                        allPlans
                          .filter(p => p.name.toLowerCase().includes(assocSearch.toLowerCase()))
                          .map(plan => {
                            const already = associations.some(a => a.test_plan_id === plan.id)
                            return (
                              <button key={plan.id}
                                onClick={() => !already && handleAssociate('plan', plan.id)}
                                disabled={already || assocLoading}
                                className={`w-full text-left px-3 py-2.5 rounded-lg border transition ${already
                                  ? 'bg-green-50 border-green-200 cursor-default'
                                  : 'border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-gray-700">{plan.name}</p>
                                    <p className="text-xs text-gray-400">
                                      {plan.module} · {plan.test_plan_cases?.length || 0} TCs
                                    </p>
                                  </div>
                                  {already && <span className="text-xs text-green-600">✓ Asociado</span>}
                                </div>
                              </button>
                            )
                          })
                      ) : (
                        allTCs
                          .filter(tc => tc.title.toLowerCase().includes(assocSearch.toLowerCase()))
                          .map(tc => {
                            const already = associations.some(a => a.test_case_id === tc.id)
                            return (
                              <button key={tc.id}
                                onClick={() => !already && handleAssociate('tc', tc.id)}
                                disabled={already || assocLoading}
                                className={`w-full text-left px-3 py-2.5 rounded-lg border transition ${already
                                  ? 'bg-green-50 border-green-200 cursor-default'
                                  : 'border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-gray-700 truncate">{tc.title}</p>
                                    <p className="text-xs text-gray-400">{tc.module} · {tc.priority}</p>
                                  </div>
                                  {already && <span className="text-xs text-green-600 flex-shrink-0">✓ Asociado</span>}
                                </div>
                              </button>
                            )
                          })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comentarios */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-3">
                Comentarios ({detail?.comments?.length || 0})
              </p>
              {detail?.comments?.length === 0 ? (
                <p className="text-sm text-gray-400">Sin comentarios aún</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {detail?.comments?.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{c.author}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.date).toLocaleString('es-ES', {
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed comment-text" dangerouslySetInnerHTML={{ __html: c.text }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nuevo comentario */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Agregar comentario en Jira</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Escribe un comentario..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={commenting || !comment.trim()}
                className="mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50 transition"
              >
                {commenting ? 'Enviando...' : 'Agregar comentario'}
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4">
              {successMsg && (
                <span className="text-xs text-green-600 font-medium">{successMsg}</span>
              )}
              {error && (
                <span className="text-xs text-red-500">{error}</span>
              )}
              {!successMsg && !error && <span />}
              <a
                href={detail?.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                Ver en Jira
              </a>
            </div>
          </>
        )}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => e.target === e.currentTarget && setSelectedPlan(null)}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Plan asociado</p>
                <h3 className="text-sm font-medium text-gray-800">{selectedPlan.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{selectedPlan.module} · {selectedPlan.status}</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {planDetailLoading ? (
                <div className="text-sm text-gray-500">Cargando contenido del plan...</div>
              ) : selectedPlanCases.length === 0 ? (
                <div className="text-sm text-gray-500">No hay test cases vinculados a este plan.</div>
              ) : (
                <div className="space-y-3">
                  {selectedPlanCases.map((item) => {
                    const tc = item.test_cases
                    const lastResult = tc.test_executions?.length
                      ? tc.test_executions.sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))[0].result
                      : null
                    return (
                      <div key={tc.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{tc.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{tc.module} · {tc.priority}</p>
                            {lastResult && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <ResultIcon result={lastResult} />
                                Último: {lastResult === 'passed' ? 'Pasó' : lastResult === 'failed' ? 'Falló' : 'Bloqueado'}
                              </p>
                            )}
                          </div>
                          <button onClick={() => setExecutingTarget({ type: 'plan', plan: selectedPlan, tc })}
                            className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded-lg px-2 py-1 transition">
                            Ejecutar
                          </button>
                        </div>
                        {tc.steps?.filter(Boolean).length > 0 && (
                          <div className="mt-3 text-xs text-gray-600 space-y-1">
                            <p className="font-medium text-gray-700">Pasos</p>
                            <ol className="list-decimal list-inside space-y-1">
                              {tc.steps.filter(Boolean).map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {tc.expected_result && (
                          <div className="mt-3 text-xs text-gray-600">
                            <p className="font-medium text-gray-700">Resultado esperado</p>
                            <p>{tc.expected_result}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {executingTarget && (
        <ExecutionModal
          target={executingTarget}
          contextLabel={executingTarget.type === 'plan'
            ? `Ejecución en plan: ${executingTarget.plan?.name || ''}`
            : 'Ejecución de TC asociado'}
          onClose={() => setExecutingTarget(null)}
          onExecute={(...args) => {
            if (executingTarget?.type === 'plan') {
              handleExecuteBugPlanTC(args[0], args[1], args[2], args[3], args[4])
            } else {
              handleExecuteBugTC(executingTarget?.tc, args[0], args[1], args[2])
            }
          }}
          onCreateBug={handleCreateBugFromExecution}
        />
      )}
    </div>
  )
}

export default JiraItemModal
