import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import axios from 'axios'
import WorkItemModal from '../components/WorkItemModal'

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
}

const severityOrder = ['1 - Critical', '2 - High', '3 - Medium', '4 - Low']
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

const Dashboard = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)

  const fetchItems = async () => {
    const { data: { session } } = await supabase.auth.getSession()

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

  useEffect(() => { fetchItems() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    try {
      await axios.get(`${BACKEND}/api/azure/sync`)
      await fetchItems()
    } catch (err) {
      setError('Error al sincronizar con Azure DevOps')
    }
    setSyncing(false)
  }

  const handleItemUpdated = (id, newStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
  }

  const filtered = items.filter(item => {
    const matchFilter = filter === 'todos' || item.severity === filter
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase())
      || item.assignee.toLowerCase().includes(search.toLowerCase())
      || item.id.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  // Datos para el gráfico por severidad
  const chartData = severityOrder.map(sev => ({
    name: sev.split(' - ')[1] || sev,
    total: items.filter(i => i.severity === sev).length,
    fill: severityColors[sev]
  })).filter(d => d.total > 0)

  // Datos para el gráfico por assignee (top 5)
  const assigneeData = Object.entries(
    items.reduce((acc, item) => {
      acc[item.assignee] = (acc[item.assignee] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name: name.split(' ')[0], total }))

  const statCards = [
    { label: 'Total Ready for QA', value: items.length, color: '#3b82f6' },
    { label: 'Alta prioridad', value: items.filter(i => i.severity === '2 - High' || i.severity === '1 - Critical').length, color: '#ef4444' },
    { label: 'Sin asignar', value: items.filter(i => i.assignee === 'Sin asignar').length, color: '#f59e0b' },
    { label: 'Bloqueados', value: items.filter(i => i.status === 'Blocked').length, color: '#8b5cf6' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Cargando...
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Ready for QA</h2>
          {lastSync && (
            <p className="text-xs text-gray-400 mt-0.5">
              Última sync: {new Date(lastSync).toLocaleString('es-ES')}
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {syncing ? 'Sincronizando...' : 'Sync Azure DevOps'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-4">Por severidad</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-4">Top asignados</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={assigneeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por título, asignado o ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas las severidades</option>
          <option value="1 - Critical">Critical</option>
          <option value="2 - High">High</option>
          <option value="3 - Medium">Medium</option>
          <option value="4 - Low">Low</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} items</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Título</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Severidad</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Asignado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  No hay items que coincidan
                </td>
              </tr>
            ) : (
              filtered.map((item, i) => (
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
      {selectedItem && (
        <WorkItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdated={handleItemUpdated}
        />
      )}
    </div>
  )
}

export default Dashboard