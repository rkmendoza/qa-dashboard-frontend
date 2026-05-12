import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const PRIORIDADES = ['Smoke', 'Crítica', 'Normal']
const MODULOS = ['Login', 'Reservas', 'Pagos', 'Ancillaries', 'Check-in', 'Cancelaciones', 'Otros']

const PrioridadBadge = ({ value }) => {
  const colors = {
    'Smoke': 'bg-purple-50 text-purple-700 border-purple-200',
    'Crítica': 'bg-red-50 text-red-700 border-red-200',
    'Normal': 'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[value] || colors['Normal']}`}>
      {value}
    </span>
  )
}

const ResultadoBadge = ({ value }) => {
  const colors = {
    'passed': 'bg-green-50 text-green-700 border-green-200',
    'failed': 'bg-red-50 text-red-700 border-red-200',
    'blocked': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  }
  const labels = { passed: 'Pasó', failed: 'Falló', blocked: 'Bloqueado' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[value] || ''}`}>
      {labels[value] || value}
    </span>
  )
}

const FormModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    title: '', description: '', steps: [''], expected_result: '', priority: 'Normal', module: 'Otros'
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setStep = (i, v) => {
    const steps = [...form.steps]
    steps[i] = v
    setField('steps', steps)
  }

  const addStep = () => setField('steps', [...form.steps, ''])
  const removeStep = (i) => setField('steps', form.steps.filter((_, idx) => idx !== i))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-800">
            {initial ? 'Editar caso de prueba' : 'Nuevo caso de prueba'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Título</label>
            <input value={form.title} onChange={e => setField('title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Verificar login con credenciales válidas" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prioridad</label>
              <select value={form.priority} onChange={e => setField('priority', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Módulo</label>
              <select value={form.module} onChange={e => setField('module', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MODULOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Descripción del caso..." />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Pasos</label>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                  <input value={step} onChange={e => setStep(i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Paso ${i + 1}`} />
                  {form.steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-gray-300 hover:text-red-400 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addStep}
              className="mt-2 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition">
              + Agregar paso
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Resultado esperado</label>
            <textarea value={form.expected_result} onChange={e => setField('expected_result', e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="¿Qué debería pasar al final?" />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose}
            className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={() => onSave(form)}
            disabled={!form.title.trim()}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

const TestCases = () => {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filterPrio, setFilterPrio] = useState('todos')
  const [filterMod, setFilterMod] = useState('todos')
  const [search, setSearch] = useState('')
  const [executing, setExecuting] = useState(null)

  // const fetchCases = async () => {
  //   const { data } = await supabase
  //     .from('test_cases')
  //     .select('*, test_executions(result, executed_at)')
  //     .order('created_at', { ascending: false })
  //   setCases(data || [])
  //   setLoading(false)
  // }

  const fetchCases = async () => {
    const { data } = await supabase
      .from('test_cases')
      .select(`
      *,
      test_executions(id, result, environment, executed_at),
      plan_executions(
        id, result, environment, executed_at,
        test_plans(name)
      )
    `)
      .order('created_at', { ascending: false })
    setCases(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCases() }, [])

  const handleSave = async (form) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (editing) {
      const { data, error } = await supabase
        .from('test_cases')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
        .select('*, test_executions(result, executed_at)')
        .single()
      if (!error) {
        setCases(prev => prev.map(c => c.id === data.id ? data : c))
        if (selected?.id === data.id) setSelected(data)
      }
    } else {
      const { data, error } = await supabase
        .from('test_cases')
        .insert([{ ...form, created_by: user.id }])
        .select('*, test_executions(result, executed_at)')
        .single()
      if (!error) setCases(prev => [data, ...prev])
    }
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = async (tc) => {
    if (!confirm(`¿Eliminar "${tc.title}"?`)) return
    await supabase.from('test_cases').delete().eq('id', tc.id)
    setCases(prev => prev.filter(c => c.id !== tc.id))
    if (selected?.id === tc.id) setSelected(null)
  }

  const handleExecute = async (tc, result) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('test_executions').insert([{
      test_case_id: tc.id,
      result,
      executed_by: user.id
    }])
    setExecuting(null)
    fetchCases()
  }

  const filtered = cases.filter(c => {
    const matchPrio = filterPrio === 'todos' || c.priority === filterPrio
    const matchMod = filterMod === 'todos' || c.module === filterMod
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    return matchPrio && matchMod && matchSearch
  })

  // const lastResult = (tc) => tc.test_executions?.[tc.test_executions.length - 1]?.result

  // const stats = {
  //   total: cases.length,
  //   passed: cases.filter(c => lastResult(c) === 'passed').length,
  //   failed: cases.filter(c => lastResult(c) === 'failed').length,
  //   sin: cases.filter(c => !lastResult(c)).length,
  // }

  const lastResult = (tc) => {
    const sueltas = tc.test_executions || []
    const planes = tc.plan_executions || []
    const all = [...sueltas, ...planes]
      .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
    return all[0]?.result
  }

  const stats = {
    total: cases.length,
    pasaron: cases.filter(c => lastResult(c) === 'passed').length,
    fallaron: cases.filter(c => lastResult(c) === 'failed').length,
    sin: cases.filter(c => !lastResult(c)).length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Test Cases</h2>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Nuevo caso
        </button>
      </div>

      {/* Stats */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {[
    { label: 'Total',        value: stats.total,    color: '#3b82f6' },
    { label: 'Pasaron',      value: stats.pasaron,  color: '#10b981' },
    { label: 'Fallaron',     value: stats.fallaron, color: '#ef4444' },
    { label: 'Sin ejecutar', value: stats.sin,      color: '#6b7280' },
  ].map(({ label, value, color }) => (
    <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  ))}
</div>

{/* Filtros */}
<div className="flex flex-wrap gap-3 items-center">
  <input type="text" placeholder="Buscar casos..."
    value={search} onChange={e => setSearch(e.target.value)}
    className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
  <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)}
    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
    <option value="todos">Todas las prioridades</option>
    {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
  </select>
  <select value={filterMod} onChange={e => setFilterMod(e.target.value)}
    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
    <option value="todos">Todos los módulos</option>
    {MODULOS.map(m => <option key={m}>{m}</option>)}
  </select>
  <span className="text-xs text-gray-400">{filtered.length} casos</span>
</div>
      

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No hay casos de prueba</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-blue-500 hover:text-blue-700">
              Crear el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Título</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Módulo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Último resultado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tc, i) => (
                <tr key={tc.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  onClick={() => setSelected(tc)}>
                  <td className="px-4 py-3 text-gray-800 max-w-xs">
                    <span className="line-clamp-1">{tc.title}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{tc.module || '—'}</td>
                  <td className="px-4 py-3"><PrioridadBadge value={tc.priority} /></td>
                  <td className="px-4 py-3">
                    {lastResult(tc)
                      ? <ResultadoBadge value={lastResult(tc)} />
                      : <span className="text-xs text-gray-300">Sin ejecutar</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setExecuting(tc)}
                        className="text-xs text-green-600 hover:text-green-800 transition">
                        Ejecutar
                      </button>
                      <button onClick={() => { setEditing(tc); setShowForm(true) }}
                        className="text-xs text-gray-400 hover:text-blue-600 transition">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(tc)}
                        className="text-xs text-gray-400 hover:text-red-500 transition">
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PrioridadBadge value={selected.priority} />
                  <span className="text-xs text-gray-400">{selected.module}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-800">{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selected.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Descripción</p>
                  <p className="text-sm text-gray-700">{selected.description}</p>
                </div>
              )}

              {selected.steps?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Pasos</p>
                  <ol className="space-y-1">
                    {selected.steps.filter(Boolean).map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {selected.expected_result && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Resultado esperado</p>
                  <p className="text-sm text-gray-700">{selected.expected_result}</p>
                </div>
              )}

              {selected.test_executions?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Historial de ejecuciones</p>
                  <div className="space-y-1">
                    {[...selected.test_executions].reverse().slice(0, 5).map((ex, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                        <ResultadoBadge value={ex.result} />
                        <span className="text-gray-400">
                          {new Date(ex.executed_at).toLocaleString('es-ES', {
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => { setEditing(selected); setSelected(null); setShowForm(true) }}
                className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                Editar
              </button>
              <button onClick={() => { setExecuting(selected); setSelected(null) }}
                className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                Ejecutar caso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ejecutar */}
      {executing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && setExecuting(null)}>
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm p-6">
            <h3 className="text-sm font-medium text-gray-800 mb-1">Registrar ejecución</h3>
            <p className="text-xs text-gray-400 mb-5 line-clamp-2">{executing.title}</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => handleExecute(executing, 'passed')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 transition">
                <span className="text-2xl">✅</span>
                <span className="text-xs text-green-700 font-medium">Pasó</span>
              </button>
              <button onClick={() => handleExecute(executing, 'failed')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-red-200 rounded-xl hover:bg-red-50 transition">
                <span className="text-2xl">❌</span>
                <span className="text-xs text-red-700 font-medium">Falló</span>
              </button>
              <button onClick={() => handleExecute(executing, 'blocked')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-yellow-200 rounded-xl hover:bg-yellow-50 transition">
                <span className="text-2xl">⚠️</span>
                <span className="text-xs text-yellow-700 font-medium">Bloqueado</span>
              </button>
            </div>
            <button onClick={() => setExecuting(null)}
              className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <FormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

export default TestCases