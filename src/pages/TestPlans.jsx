import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ExecutionModal from '../components/ExecutionModal'

const STATUS_LABELS = { draft: 'Borrador', active: 'Activo', completed: 'Completado' }
const STATUS_COLORS = {
  draft:     'bg-gray-50 text-gray-600 border-gray-200',
  active:    'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
}

const StatusBadge = ({ value }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[value] || STATUS_COLORS.draft}`}>
    {STATUS_LABELS[value] || value}
  </span>
)

const EnvBadge = ({ env }) => env === 'production'
  ? <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded">PRO</span>
  : <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">SBX</span>

const ResultIcon = ({ result }) => {
  if (result === 'passed')  return <span className="text-green-500 text-sm">✅</span>
  if (result === 'failed')  return <span className="text-red-500 text-sm">❌</span>
  if (result === 'blocked') return <span className="text-yellow-500 text-sm">⚠️</span>
  return <span className="text-gray-300 text-sm">⏳</span>
}

const ProgressBar = ({ passed, total }) => {
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100)
  const color = pct === 100 ? '#10b981' : pct > 50 ? '#3b82f6' : '#f59e0b'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{passed}/{total}</span>
    </div>
  )
}

// Formulario crear/editar plan
const PlanFormModal = ({ initial, allCases, onSave, onClose, modules }) => {
  const [name, setName]         = useState(initial?.name || '')
  const [description, setDesc]  = useState(initial?.description || '')
  const [module, setModule]     = useState(initial?.module || 'Otros')
  const [status, setStatus]     = useState(initial?.status || 'draft')
  const [selected, setSelected] = useState(initial?.caseIds || [])
  const [search, setSearch]     = useState('')

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const filtered = allCases.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.module || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-800">
            {initial ? 'Editar plan' : 'Nuevo test plan'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre del plan</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Regresión Sprint 41 - Pagos" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Módulo</label>
              <select value={module} onChange={e => setModule(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {modules.map(m => <option key={m.id || m}>{m.name || m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="Objetivo de este plan..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">
                Test cases
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {selected.length} seleccionados
                </span>
              </label>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título o módulo..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No hay test cases disponibles</p>
              ) : (
                filtered.map(tc => (
                  <div key={tc.id} onClick={() => toggle(tc.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition ${
                      selected.includes(tc.id) ? 'bg-blue-50' : ''
                    }`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                      selected.includes(tc.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {selected.includes(tc.id) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{tc.title}</p>
                      <p className="text-xs text-gray-400">{tc.module} · {tc.priority}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose}
            className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={() => onSave({ name, description, module, status, caseIds: selected })}
            disabled={!name.trim()}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            Guardar plan
          </button>
        </div>
      </div>
    </div>
  )
}

// Formulario de ejecución en dos pasos
// Modal detalle del plan con historial por TC
const PlanDetailModal = ({ plan, onClose, onUpdated }) => {
  const [cases, setCases]       = useState([])
  const [executions, setExecs]  = useState([])
  const [loading, setLoading]   = useState(true)
  const [executing, setExecuting] = useState(null)
  const [expandedTc, setExpanded] = useState(null)

  const fetchData = async () => {
    const [{ data: casesData }, { data: execData }] = await Promise.all([
      supabase.from('test_plan_cases')
        .select(`id, order_index, test_cases(id, title, priority, module, steps, expected_result)`)
        .eq('test_plan_id', plan.id)
        .order('order_index'),
      supabase.from('plan_executions')
        .select(`*, profiles(full_name, email)`)
        .eq('test_plan_id', plan.id)
        .order('executed_at', { ascending: false })
    ])
    setCases(casesData || [])
    setExecs(execData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [plan.id])

  // Última ejecución de un TC en este plan
  const lastExecForTc = (tcId) =>
    executions.find(e => e.test_case_id === tcId)

  // Todas las ejecuciones de un TC en este plan
  const historyForTc = (tcId) =>
    executions.filter(e => e.test_case_id === tcId)

  const handleExecute = async (tc, result, environment, notes) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('plan_executions').insert([{
      test_plan_id: plan.id,
      test_case_id: tc.id,
      result,
      environment,
      notes,
      executed_by: user.id
    }])
    setExecuting(null)
    fetchData()
    onUpdated && onUpdated()
  }

  const passed = cases.filter(c => lastExecForTc(c.test_cases.id)?.result === 'passed').length
  const total  = cases.length

  const formatDate = (d) => new Date(d).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge value={plan.status} />
                <span className="text-xs text-gray-400">{plan.module}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-800">{plan.name}</h3>
              {plan.description && (
                <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="mt-3">
            <ProgressBar passed={passed} total={total} />
          </div>
        </div>

        {/* Lista de TCs */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin test cases en este plan</div>
          ) : (
            cases.map(({ test_cases: tc }) => {
              const last    = lastExecForTc(tc.id)
              const history = historyForTc(tc.id)
              const isExpanded = expandedTc === tc.id

              return (
                <div key={tc.id} className="border-b border-gray-50">
                  {/* Fila principal del TC */}
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ResultIcon result={last?.result} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 truncate">{tc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{tc.module} · {tc.priority}</span>
                          {last && (
                            <>
                              <EnvBadge env={last.environment} />
                              <span className="text-xs text-gray-300">{formatDate(last.executed_at)}</span>
                            </>
                          )}
                          {history.length > 1 && (
                            <span className="text-xs text-gray-400">{history.length} ejecuciones</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {history.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : tc.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition">
                          {isExpanded ? 'Ocultar' : 'Historial'}
                        </button>
                      )}
                      <button onClick={() => setExecuting(tc)}
                        className="text-xs text-blue-500 hover:text-blue-700 transition">
                        Ejecutar
                      </button>
                    </div>
                  </div>

                  {/* Historial expandido */}
                  {isExpanded && history.length > 0 && (
                    <div className="px-5 pb-3 bg-gray-50">
                      <p className="text-xs text-gray-400 mb-2 pt-2">Historial en este plan</p>
                      <div className="space-y-1.5">
                        {history.map((ex, i) => (
                          <div key={ex.id}
                            className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <ResultIcon result={ex.result} />
                            <EnvBadge env={ex.environment} />
                            <span className="text-gray-500 flex-1">
                              {ex.result === 'passed' ? 'Pasó' : ex.result === 'failed' ? 'Falló' : 'Bloqueado'}
                              {ex.notes && ` — ${ex.notes}`}
                            </span>
                            <span className="text-gray-300">{formatDate(ex.executed_at)}</span>
                            {i === 0 && (
                              <span className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded border border-blue-100">
                                último
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal ejecutar */}
      {executing && (
        <ExecutionModal
          tc={executing}
          contextLabel={`Ejecución de ${executing.title}`}
          onClose={() => setExecuting(null)}
          onExecute={(result, environment, notes) => handleExecute(executing, result, environment, notes)}
        />
      )}
    </div>
  )
}

// Página principal
const TestPlans = () => {
  const [plans, setPlans]           = useState([])
  const [allCases, setAllCases]     = useState([])
  const [planStats, setPlanStats]   = useState({})
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [viewing, setViewing]       = useState(null)
  const [filterStatus, setFilter]   = useState('todos')
  const [modules, setModules]       = useState([])

  const fetchAll = async () => {
    const [{ data: plansData }, { data: casesData }, { data: execData }, { data: modData }] = await Promise.all([
      supabase.from('test_plans')
        .select('*, test_plan_cases(test_case_id)')
        .order('created_at', { ascending: false }),
      supabase.from('test_cases')
        .select('id, title, module, priority')
        .order('title'),
      supabase.from('plan_executions')
        .select('test_plan_id, test_case_id, result, executed_at')
        .order('executed_at', { ascending: false }),
      supabase.from('modules').select('*').order('name')
    ])

    // Calcular progreso real por plan
    const stats = {}
    if (plansData && execData) {
      plansData.forEach(plan => {
        const planExecs = execData.filter(e => e.test_plan_id === plan.id)
        const tcIds = plan.test_plan_cases?.map(c => c.test_case_id) || []

        // Última ejecución por TC en este plan
        const lastByTc = {}
        planExecs.forEach(ex => {
          if (!lastByTc[ex.test_case_id]) lastByTc[ex.test_case_id] = ex
        })

        const passed = tcIds.filter(id => lastByTc[id]?.result === 'passed').length
        stats[plan.id] = { passed, total: tcIds.length }
      })
    }

    setPlans(plansData || [])
    setAllCases(casesData || [])
    setPlanStats(stats)
    setModules(modData || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async ({ name, description, module, status, caseIds }) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (editing) {
      await supabase.from('test_plans')
        .update({ name, description, module, status, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
      await supabase.from('test_plan_cases').delete().eq('test_plan_id', editing.id)
      if (caseIds.length > 0) {
        await supabase.from('test_plan_cases').insert(
          caseIds.map((id, i) => ({ test_plan_id: editing.id, test_case_id: id, order_index: i }))
        )
      }
    } else {
      const { data: plan } = await supabase.from('test_plans')
        .insert([{ name, description, module, status, created_by: user.id }])
        .select().single()
      if (plan && caseIds.length > 0) {
        await supabase.from('test_plan_cases').insert(
          caseIds.map((id, i) => ({ test_plan_id: plan.id, test_case_id: id, order_index: i }))
        )
      }
    }

    setShowForm(false)
    setEditing(null)
    fetchAll()
  }

  const handleDelete = async (plan) => {
    if (!confirm(`¿Eliminar "${plan.name}"?`)) return
    await supabase.from('test_plans').delete().eq('id', plan.id)
    fetchAll()
  }

  const filtered = plans.filter(p => filterStatus === 'todos' || p.status === filterStatus)

  const globalStats = {
    total:     plans.length,
    active:    plans.filter(p => p.status === 'active').length,
    completed: plans.filter(p => p.status === 'completed').length,
    draft:     plans.filter(p => p.status === 'draft').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Test Plans</h2>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Nuevo plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: globalStats.total,     color: '#3b82f6' },
          { label: 'Activos',     value: globalStats.active,    color: '#10b981' },
          { label: 'Completados', value: globalStats.completed, color: '#6b7280' },
          { label: 'Borradores',  value: globalStats.draft,     color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['todos', 'active', 'draft', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              filterStatus === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}>
            {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16">
          <p className="text-sm text-gray-400 mb-3">No hay planes de prueba</p>
          <button onClick={() => setShowForm(true)}
            className="text-sm text-blue-500 hover:text-blue-700">
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Módulo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">TCs</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-36">Progreso</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((plan, i) => {
                const s = planStats[plan.id] || { passed: 0, total: plan.test_plan_cases?.length || 0 }
                return (
                  <tr key={plan.id}
                    onClick={() => setViewing(plan)}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{plan.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{plan.module || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge value={plan.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.total} TCs</td>
                    <td className="px-4 py-3 w-36">
                      <ProgressBar passed={s.passed} total={s.total} />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setEditing(plan); setShowForm(true) }}
                          className="text-xs text-gray-400 hover:text-blue-600 transition">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(plan)}
                          className="text-xs text-gray-400 hover:text-red-500 transition">
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PlanFormModal
          initial={editing ? {
            ...editing,
            caseIds: editing.test_plan_cases?.map(c => c.test_case_id) || []
          } : null}
          allCases={allCases}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          modules={modules}
        />
      )}

      {viewing && (
        <PlanDetailModal
          plan={viewing}
          onClose={() => setViewing(null)}
          onUpdated={fetchAll}
        />
      )}
    </div>
  )
}

export default TestPlans