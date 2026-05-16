import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import axios from 'axios'
import WorkItemModal from '../components/WorkItemModal'
import JiraItemModal from '../components/JiraItemModal'

const BACKEND = import.meta.env.VITE_BACKEND_URL

const statusColors = {
  'Ready for QA': '#3b82f6',
  'Blocked': '#ef4444',
  'New': '#8b5cf6',
  'Committed': '#f59e0b',
  'Approved': '#10b981',
  'Done': '#6b7280',
  'Completed': '#6b7280',
  'Rejected': '#f43f5e',
  'Failed': '#ef4444',
  'QA Validated': '#10b981',
  'To Do': '#8b5cf6',
  'In Progress': '#f59e0b',
  'Validated': '#10b981',
  'READY TO DEV': '#f59e0b',
  'In QA': '#3b82f6',
}

const severityColors = {
  '1 - Critical': '#ef4444',
  '2 - High': '#f59e0b',
  '3 - Medium': '#3b82f6',
  '4 - Low': '#10b981',
  'P1': '#ef4444',
  'P2': '#f59e0b',
  'P3': '#3b82f6',
  'P4': '#10b981',
}

const StatusBadge = ({ status }) => {
  const color = statusColors[status] || '#6b7280'
  return (
    <span style={{ background: color + '20', color, border: `1px solid ${color}40` }}
      className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
      {status}
    </span>
  )
}

const PAGE_SIZE = 20

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('azure')
  const [items, setItems] = useState([])
  const [jiraItems, setJiraItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingJira, setSyncingJira] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sprintFilter, setSprintFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)

  const currentItems = activeTab === 'azure' ? items : jiraItems
  const isAzure = activeTab === 'azure'

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('bugs_cache')
      .select('*')
      .order('synced_at', { ascending: false })

    if (error) {
      console.error('Error fetch:', error)
    } else {
      setItems(data || [])
      if (data?.length > 0) setLastSync(data[0].synced_at)
    }
    setLoading(false)
  }

  const fetchJiraItems = async () => {
    const { data, error } = await supabase
      .from('jira_cache')
      .select('*')
      .order('synced_at', { ascending: false })
    if (error) {
      console.error('Error fetch jira:', error)
    } else {
      setJiraItems(data || [])
    }
  }

  useEffect(() => { fetchItems(); fetchJiraItems() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    try {
      await axios.get(`${BACKEND}/api/azure/sync`)
      await fetchItems()
    } catch {
      setError('Error al sincronizar con Azure DevOps')
    }
    setSyncing(false)
  }

  const handleJiraSync = async () => {
    setSyncingJira(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await axios.get(`${BACKEND}/api/jira/sync`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      await fetchJiraItems()
    } catch {
      setError('Error al sincronizar con Jira')
    }
    setSyncingJira(false)
  }

  const handleItemUpdated = (id, newStatus) => {
    const HIDDEN = ['Completed', 'Rejected']
    setItems(prev => HIDDEN.includes(newStatus)
      ? prev.filter(i => i.id !== id)
      : prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    setJiraItems(prev => HIDDEN.includes(newStatus)
      ? prev.filter(i => i.id !== id)
      : prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(0)
  }

  const activeItems = currentItems.filter(i => i.status === (isAzure ? 'Ready for QA' : 'In QA') || i.status === 'Ready for QA')
  const validatedItems = currentItems.filter(i => i.status === (isAzure ? 'QA Validated' : 'Validated'))
  const failedItems = currentItems.filter(i => i.status === 'Failed')

  const tableItems = showDone ? currentItems : currentItems.filter(i => i.status !== 'Done')

  const statuses = [...new Set(tableItems.map(i => i.status))].filter(Boolean).sort()
  const sprints = [...new Set(tableItems.map(i => i.sprint).filter(Boolean))].sort()

  const filtered = tableItems.filter(item => {
    const matchStatus = statusFilter === 'todos' || item.status === statusFilter
    const matchSev = filter === 'todos' || item.severity === filter
    const matchSprint = sprintFilter === 'todos' || item.sprint === sprintFilter
    const matchSearch = (item.title || '').toLowerCase().includes(search.toLowerCase())
      || (item.assignee || '').toLowerCase().includes(search.toLowerCase())
      || (item.id || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSev && matchSprint && matchSearch
  }).sort((a, b) => {
    let av, bv
    if (sortField === 'id') { av = a.id; bv = b.id }
    else if (sortField === 'title') { av = a.title?.toLowerCase(); bv = b.title?.toLowerCase() }
    else if (sortField === 'severity') { av = a.severity || ''; bv = b.severity || '' }
    else if (sortField === 'sprint') { av = a.sprint || ''; bv = b.sprint || '' }
    else if (sortField === 'assignee') { av = a.assignee || ''; bv = b.assignee || '' }
    else if (sortField === 'status') { av = a.status || ''; bv = b.status || '' }
    else { av = a.id; bv = b.id }
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

  const statCards = [
    { label: isAzure ? 'Ready for QA' : 'In QA / Ready for QA', value: activeItems.length, color: '#3b82f6' },
    { label: isAzure ? 'QA Validated' : 'Validated', value: validatedItems.length, color: '#10b981' },
    { label: 'Failed', value: failedItems.length, color: '#ef4444' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Cargando...
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => { setActiveTab('azure'); setPage(0); setSearch(''); setStatusFilter('todos'); setFilter('todos'); setSprintFilter('todos') }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${isAzure ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Azure DevOps
        </button>
        <button onClick={() => { setActiveTab('jira'); setPage(0); setSearch(''); setStatusFilter('todos'); setFilter('todos'); setSprintFilter('todos') }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${!isAzure ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Jira
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-800">{isAzure ? 'Ready for QA' : 'In QA / Ready for QA'}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAzure ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
              {isAzure ? 'Azure' : 'Jira'}
            </span>
          </div>
          {lastSync && isAzure && (
            <p className="text-xs text-gray-400 mt-0.5">
              Última sync: {new Date(lastSync).toLocaleString('es-ES')}
            </p>
          )}
          {!isAzure && (
            <p className="text-xs text-gray-400 mt-0.5">
              {currentItems.length} items sincronizados desde Jira
            </p>
          )}
        </div>
        {isAzure ? (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {syncing ? 'Sincronizando...' : 'Sync Azure DevOps'}
          </button>
        ) : (
          <button
            onClick={handleJiraSync}
            disabled={syncingJira}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition"
          >
            {syncingJira ? 'Sincronizando...' : 'Sync Jira'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por título, asignado o ID..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los estados</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas las severidades</option>
          {isAzure ? (
            <>
              <option value="1 - Critical">Critical</option>
              <option value="2 - High">High</option>
              <option value="3 - Medium">Medium</option>
              <option value="4 - Low">Low</option>
            </>
          ) : (
            <>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </>
          )}
        </select>
        <select
          value={sprintFilter}
          onChange={e => { setSprintFilter(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los sprints</option>
          {sprints.map(s => <option key={s}>{s}</option>)}
        </select>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={showDone} onChange={e => { setShowDone(e.target.checked); setPage(0) }}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
            Mostrar Done
          </label>
        <span className="text-xs text-gray-400">{filtered.length} items</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {[
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Título' },
                { key: 'severity', label: 'Severidad' },
                { key: 'sprint', label: isAzure ? 'Sprint' : 'Tipo' },
                { key: 'assignee', label: 'Asignado' },
                { key: 'status', label: 'Estado' },
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
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  No hay items que coincidan
                </td>
              </tr>
            ) : (
              paged.map((item, i) => (
                <tr key={item.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {item.id}
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs">
                    <span className="line-clamp-2">{item.title}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-medium"
                      style={{ color: severityColors[item.severity] || '#6b7280' }}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {isAzure ? (item.sprint || '—') : (item.issue_type || '—')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                    {item.assignee}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-blue-500 hover:text-blue-700 text-xs whitespace-nowrap"
                    >
                      Ver →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{filtered.length} items</p>
        {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ← Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`text-xs w-7 h-7 rounded-lg transition ${
                  i === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Siguiente →
          </button>
        </div>
      )}
      </div>

      {selectedItem && isAzure && (
        <WorkItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdated={handleItemUpdated}
        />
      )}
      {selectedItem && !isAzure && (
        <JiraItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdated={handleItemUpdated}
        />
      )}
    </div>
  )
}

export default Dashboard
