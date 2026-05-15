import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ExecutionModal from '../components/ExecutionModal'
import EditExecutionModal from '../components/EditExecutionModal'
import * as XLSX from 'xlsx'

const PRIORIDADES = ['Smoke', 'Crítica', 'Normal']

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

const EnvironmentBadge = ({ value }) => {
  if (!value) return null
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${value === 'production' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
      {value === 'production' ? '🚀 Prod' : '🧪 Sandbox'}
    </span>
  )
}

const COLUMN_MAP = {
  title: ['title', 'titulo', 'título', 'name', 'nombre', 'test case', 'caso'],
  description: ['description', 'descripcion', 'descripción', 'desc'],
  steps: ['steps', 'pasos', 'step', 'paso'],
  expected_result: ['expected_result', 'expected result', 'resultado esperado', 'expected'],
  priority: ['priority', 'prioridad', 'prio', 'severity', 'severidad'],
  module: ['module', 'modulo', 'módulo', 'area', 'area'],
}

const detectColumn = (header) => {
  const h = String(header).toLowerCase().trim()
  for (const [key, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some(a => h === a || h.includes(a))) return key
  }
  return null
}

const parsePriority = (val) => {
  const v = String(val || '').toLowerCase().trim()
  if (['smoke', 'critical', 'critica', 'crítica', 'p0'].some(x => v.includes(x))) return 'Smoke'
  if (['normal', 'medium', 'p2', 'p3'].some(x => v.includes(x))) return 'Normal'
  return 'Crítica'
}

const ImportModal = ({ onClose, onImport }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [columns, setColumns] = useState({})
  const [error, setError] = useState('')

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    setFile(f)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        if (json.length === 0) {
          setError('El archivo está vacío')
          return
        }

        const headers = Object.keys(json[0])
        const detected = {}
        headers.forEach(h => {
          const key = detectColumn(h)
          if (key) detected[key] = h
        })

        setColumns(detected)
        setPreview(json.slice(0, 20))
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que sea un Excel o CSV válido.')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleConfirm = async () => {
    if (!file || preview.length === 0) return
    onImport(file, columns)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-800">Importar test cases</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition cursor-pointer"
            onClick={() => document.getElementById('import-file-input').click()}>
            <input id="import-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            <p className="text-sm text-gray-500 mb-1">
              {file ? file.name : 'Haz clic para seleccionar un archivo Excel o CSV'}
            </p>
            <p className="text-xs text-gray-400">Columnas detectadas: título, descripción, pasos, resultado esperado, prioridad, módulo</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {preview.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{preview.length} filas</span>
                {Object.keys(columns).length > 0 && (
                  <span className="text-green-600">Columnas mapeadas: {Object.keys(columns).join(', ')}</span>
                )}
                {Object.keys(columns).length < 3 && (
                  <span className="text-orange-600">Faltan columnas obligatorias (al menos título)</span>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {Object.keys(preview[0]).map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                          {h}
                          {columns.title === h && <span className="ml-1 text-green-500">✓</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Object.keys(row).map(h => (
                          <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-40">{String(row[h])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose}
            className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleConfirm}
            disabled={preview.length === 0 || !columns.title}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            Importar {preview.length} casos
          </button>
        </div>
      </div>
    </div>
  )
}

const FormModal = ({ initial, onSave, onClose, modules }) => {
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
                {modules.map(m => <option key={m.id || m}>{m.name || m}</option>)}
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
  const [showImport, setShowImport] = useState(false)
  const [editExec, setEditExec] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [modules, setModules] = useState([])
  const [showModuleMgr, setShowModuleMgr] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchModules = async () => {
    const { data } = await supabase.from('modules').select('*').order('name')
    setModules(data || [])
  }

  const fetchCases = async () => {
    const { data } = await supabase
      .from('test_cases')
      .select(`
      *,
      test_executions(id, result, environment, executed_at, notes, evidence),
      plan_executions(
        id, result, environment, executed_at, notes, evidence,
        test_plans(name)
      )
    `)
      .order('created_at', { ascending: false })
    setCases(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCases(); fetchModules() }, [])

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

  const handleExecute = async (tc, result, environment, notes, evidence) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('test_executions').insert([{
      test_case_id: tc.id,
      result,
      environment,
      notes,
      evidence: evidence || [],
      executed_by: user.id
    }])
    if (error) {
      alert('Error al guardar ejecución: ' + error.message)
      return
    }
    setExecuting(null)
    fetchCases()
  }

  const handleImport = async (file, columns) => {
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const { data: { user } } = await supabase.auth.getUser()

        const rows = json.map(row => {
          const stepsRaw = String(row[columns.steps] || '').trim()
          const steps = stepsRaw ? stepsRaw.split('\n').filter(Boolean) : ['']

          return {
            title: String(row[columns.title] || '').trim(),
            description: String(row[columns.description] || '').trim(),
            steps,
            expected_result: String(row[columns.expected_result] || '').trim(),
            priority: columns.priority ? parsePriority(row[columns.priority]) : 'Normal',
            module: columns.module ? String(row[columns.module] || '').trim() : 'Otros',
            created_by: user.id
          }
        }).filter(r => r.title)

        if (rows.length === 0) return

        const { data: existing } = await supabase
          .from('test_cases')
          .select('title')
        const existingTitles = new Set((existing || []).map(r => r.title.toUpperCase()))

        const newRows = rows.filter(r => !existingTitles.has(r.title.toUpperCase()))
        const skipped = rows.length - newRows.length

        if (newRows.length === 0) {
          alert('Todos los casos ya existen en la base de datos.')
          return
        }

        const { error } = await supabase.from('test_cases').insert(newRows)
        if (error) throw error

        setShowImport(false)
        fetchCases()
        alert(`Importados ${newRows.length} caso(s). ${skipped > 0 ? skipped + ' omitido(s) por duplicado.' : ''}`)
      } catch (err) {
        alert('Error al importar: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

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

  const priorityOrder = { Smoke: 0, Crítica: 1, Normal: 2 }

  const filtered = cases.filter(c => {
    const matchPrio = filterPrio === 'todos' || c.priority === filterPrio
    const matchMod = filterMod === 'todos' || c.module === filterMod
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    return matchPrio && matchMod && matchSearch
  }).sort((a, b) => {
    let av, bv
    if (sortField === 'title') { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
    else if (sortField === 'module') { av = a.module || ''; bv = b.module || '' }
    else if (sortField === 'priority') { av = priorityOrder[a.priority] ?? 99; bv = priorityOrder[b.priority] ?? 99 }
    else if (sortField === 'result') { av = lastResult(a) || 'zzz'; bv = lastResult(b) || 'zzz' }
    else { av = a.created_at || ''; bv = b.created_at || '' }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className={`transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`}>
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Test Cases</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Importar
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            + Nuevo caso
          </button>
        </div>
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
          value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filterPrio} onChange={e => { setFilterPrio(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todos">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterMod} onChange={e => { setFilterMod(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todos">Todos los módulos</option>
          {modules.map(m => <option key={m.id || m}>{m.name || m}</option>)}
        </select>
        <button onClick={() => setShowModuleMgr(true)}
          className="text-xs text-gray-400 hover:text-blue-600 transition px-2 py-1.5 rounded-lg border border-gray-200 hover:border-blue-200">
          Gestionar
        </button>
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
          <><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { key: 'title', label: 'Título' },
                  { key: 'module', label: 'Módulo' },
                  { key: 'priority', label: 'Prioridad' },
                  { key: 'result', label: 'Último resultado' },
                ].map(({ key, label }) => (
                  <th key={key}
                    onClick={() => handleSort(key)}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    <span className="flex items-center gap-1">
                      {label}
                      <SortIcon field={key} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((tc, i) => (
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">{filtered.length} casos</p>
              {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  ← Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i)}
                      className={`text-xs w-7 h-7 rounded-lg transition ${i === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </>)}
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

              {(() => {
                const history = [
                  ...(selected.test_executions || []).map(e => ({ ...e, _source: 'suelta', _planName: null })),
                  ...(selected.plan_executions || []).map(e => ({ ...e, _source: 'plan', _planName: e.test_plans?.name || 'Plan' }))
                ].sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
                if (history.length === 0) return null
                return (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Historial de ejecuciones</p>
                    <div className="space-y-1">
                      {history.slice(0, 10).map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 flex-wrap">
                          <ResultadoBadge value={ex.result} />
                          <EnvironmentBadge value={ex.environment} />
                          <span className={`text-xs font-medium ${ex._source === 'plan' ? 'text-purple-500' : 'text-gray-400'}`}>
                            {ex._source === 'plan' ? `📋 ${ex._planName}` : '🧪 Suelta'}
                          </span>
                          <span className="text-gray-400 ml-auto">
                            {new Date(ex.executed_at).toLocaleString('es-ES', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {ex._source === 'suelta' && (
                            <button onClick={() => setEditExec({ ...ex, table: 'test_executions' })}
                              className="text-gray-500 hover:text-blue-600 transition ml-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {ex.notes && <p className="text-gray-400 w-full mt-0.5 italic">{ex.notes}</p>}
                          {ex.evidence?.length > 0 && (
                            <div className="flex gap-1 w-full mt-1">
                              {ex.evidence.map((path, j) => (
                                <a key={j} href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/execution-evidence/${path}`} target="_blank" rel="noreferrer">
                                  <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/execution-evidence/${path}`}
                                    className="w-10 h-10 rounded border border-gray-200 object-cover hover:opacity-80 transition" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
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
        <ExecutionModal
          tc={executing}
          contextLabel="Ejecución de TC suelto"
          onClose={() => setExecuting(null)}
          onExecute={(result, environment, notes, evidence) => handleExecute(executing, result, environment, notes, evidence)}
        />
      )}

      {/* Modal form */}
      {showForm && (
        <FormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          modules={modules}
        />
      )}

      {/* Modal importar */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {/* Modal gestionar módulos */}
      {showModuleMgr && (
        <ModuleManager
          modules={modules}
          onRefresh={fetchModules}
          onClose={() => setShowModuleMgr(false)}
        />
      )}

      {/* Modal editar ejecución */}
      {editExec && (
        <EditExecutionModal
          execution={editExec}
          table={editExec.table}
          onClose={() => setEditExec(null)}
          onSaved={() => { setEditExec(null); fetchCases() }}
        />
      )}
    </div>
  )
}

const ModuleManager = ({ modules, onRefresh, onClose }) => {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setError('')
    const { error: err } = await supabase.from('modules').insert({ name }).select().single()
    if (err) { setError(err.message); return }
    setNewName('')
    onRefresh()
  }

  const handleRename = async (id) => {
    const name = editName.trim()
    if (!name) return
    setError('')
    const { error: err } = await supabase.from('modules').update({ name }).eq('id', id)
    if (err) { setError(err.message); return }
    setEditingId(null)
    onRefresh()
  }

  const handleDelete = async (id, name) => {
    if (name === 'Otros') { setError('No se puede eliminar el módulo "Otros"'); return }
    if (!confirm(`¿Eliminar el módulo "${name}"?`)) return
    setError('')
    const { error: err } = await supabase.from('modules').delete().eq('id', id)
    if (err) { setError(err.message); return }
    onRefresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-800">Gestionar módulos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {modules.map(m => (
              <div key={m.id}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg group">
                {editingId === m.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(m.id)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus />
                    <button onClick={() => handleRename(m.id)}
                      className="text-xs text-blue-600 hover:text-blue-800">OK</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600">X</button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-700">{m.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => { setEditingId(m.id); setEditName(m.name) }}
                        className="text-xs text-gray-400 hover:text-blue-600 px-1.5 py-1 rounded hover:bg-white transition"
                        title="Renombrar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(m.id, m.name)}
                        className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-white transition"
                        title="Eliminar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Nuevo módulo..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleCreate}
              disabled={!newName.trim()}
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestCases
