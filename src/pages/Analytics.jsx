import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6']

const PERIOD_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: 0, label: 'Todo' },
]

const Analytics = () => {
  const [data, setData] = useState({
    jiraStatus: [], azureStatus: [], typeData: [], severityData: [],
    resultData: [], execDays: [], moduleData: [], topFailed: [], planData: []
  })
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState(30)

  useEffect(() => {
    const fetchAll = async () => {
      const [jiraR, azureR, execR, tcR, planR, planExecR] = await Promise.all([
        supabase.from('jira_cache').select('status, issue_type'),
        supabase.from('bugs_cache').select('status, severity'),
        supabase.from('test_executions').select('result, executed_at, test_case_id'),
        supabase.from('test_cases').select('id, title, module'),
        supabase.from('test_plans').select('id, name, status, test_plan_cases(test_case_id)'),
        supabase.from('plan_executions').select('result, test_case_id, executed_at'),
      ])

      const jiraItems = jiraR.data || []
      const azureItems = azureR.data || []
      const execs = execR.data || []
      const tcs = tcR.data || []
      const plans = planR.data || []
      const planExecs = planExecR.data || []

      const cutoff = periodFilter > 0 ? Date.now() - periodFilter * 86400000 : 0
      const filterByPeriod = items => cutoff === 0
        ? items
        : items.filter(i => i.executed_at && new Date(i.executed_at).getTime() >= cutoff)

      const filteredExecs = filterByPeriod(execs)
      const filteredPlanExecs = filterByPeriod(planExecs)

      // Estados Jira
      const jiraStatus = {}
      const jiraSrc = sourceFilter === 'azure' ? [] : jiraItems
      jiraSrc.forEach(i => { jiraStatus[i.status] = (jiraStatus[i.status] || 0) + 1 })
      const jiraStatusData = Object.entries(jiraStatus)
        .sort(([,a], [,b]) => b - a)
        .map(([name, value]) => ({ name, value }))

      // Estados Azure
      const azureStatus = {}
      const azureSrc = sourceFilter === 'jira' ? [] : azureItems
      azureSrc.forEach(i => { azureStatus[i.status] = (azureStatus[i.status] || 0) + 1 })
      const azureStatusData = Object.entries(azureStatus)
        .sort(([,a], [,b]) => b - a)
        .map(([name, value]) => ({ name, value }))

      // Tipo Jira
      const typeCount = {}
      jiraSrc.forEach(i => { typeCount[i.issue_type] = (typeCount[i.issue_type] || 0) + 1 })
      const typeData = Object.entries(typeCount)
        .sort(([,a], [,b]) => b - a)
        .map(([name, value]) => ({ name, value }))

      // Severidad Azure
      const sevCount = {}
      azureSrc.forEach(i => { sevCount[i.severity] = (sevCount[i.severity] || 0) + 1 })
      const severityData = Object.entries(sevCount)
        .sort(([,a], [,b]) => b - a)
        .map(([name, value]) => ({ name, value }))

      // Resultados
      const allExecs = [...filteredExecs, ...filteredPlanExecs]
      const resultCount = {}
      allExecs.forEach(e => { resultCount[e.result] = (resultCount[e.result] || 0) + 1 })
      const resultData = Object.entries(resultCount).map(([name, value]) => ({ name, value }))

      // Ejecuciones por día
      const dayCount = {}
      allExecs.forEach(e => {
        if (e.executed_at) {
          const day = e.executed_at.slice(0, 10)
          dayCount[day] = (dayCount[day] || 0) + 1
        }
      })
      const execDays = Object.entries(dayCount)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-Math.max(periodFilter, 30))
        .map(([date, ejecuciones]) => ({ date: date.slice(5), ejecuciones }))

      // Cobertura
      const moduleTotal = {}
      const moduleExecuted = {}
      tcs.forEach(tc => {
        const mod = tc.module || 'Sin módulo'
        moduleTotal[mod] = (moduleTotal[mod] || 0) + 1
      })
      const executedTCIds = new Set(filteredExecs.map(e => e.test_case_id).filter(Boolean))
      tcs.forEach(tc => {
        const mod = tc.module || 'Sin módulo'
        if (executedTCIds.has(tc.id)) {
          moduleExecuted[mod] = (moduleExecuted[mod] || 0) + 1
        }
      })
      const moduleData = Object.keys(moduleTotal).map(name => ({
        name,
        Totales: moduleTotal[name],
        Ejecutados: moduleExecuted[name] || 0,
      }))

      // Top fallados
      const failedCount = {}
      allExecs.forEach(e => {
        if (e.result === 'failed' && e.test_case_id) {
          failedCount[e.test_case_id] = (failedCount[e.test_case_id] || 0) + 1
        }
      })
      const topFailedData = Object.entries(failedCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([id, count]) => {
          const tc = tcs.find(t => t.id === id)
          return { name: tc?.title?.slice(0, 40) || id, fallos: count }
        })

      // Planes
      const planData = plans.map(p => {
        const total = p.test_plan_cases?.length || 0
        const execd = filteredPlanExecs.filter(e =>
          e.test_case_id && p.test_plan_cases?.some(tpc => tpc.test_case_id === e.test_case_id)
        )
        const passed = execd.filter(e => e.result === 'passed').length
        const failed = execd.filter(e => e.result === 'failed').length
        const blocked = execd.filter(e => e.result === 'blocked').length
        return {
          name: p.name?.slice(0, 25) || 'Sin nombre',
          Pasaron: passed, Fallaron: failed,
          Bloqueados: blocked, Pendientes: total - execd.length,
        }
      })

      setData({
        jiraStatus: jiraStatusData, azureStatus: azureStatusData,
        typeData, severityData, resultData, execDays,
        moduleData, topFailed: topFailedData, planData,
      })
      setLoading(false)
    }
    fetchAll()
  }, [sourceFilter, periodFilter])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
  )

  const totalJira = data.jiraStatus.reduce((s, i) => s + i.value, 0)
  const totalAzure = data.azureStatus.reduce((s, i) => s + i.value, 0)
  const totalExecs = data.resultData.reduce((s, i) => s + i.value, 0)
  const passed = data.resultData.find(i => i.name === 'passed')?.value || 0
  const passRate = totalExecs > 0 ? Math.round((passed / totalExecs) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>
        <div className="flex gap-3">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Todas las fuentes</option>
            <option value="jira">Solo Jira</option>
            <option value="azure">Solo Azure</option>
          </select>
          <select value={periodFilter} onChange={e => setPeriodFilter(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Items Jira', value: totalJira, color: '#f59e0b' },
          { label: 'Items Azure', value: totalAzure, color: '#3b82f6' },
          { label: 'Ejecuciones', value: totalExecs, color: '#10b981' },
          { label: 'Pass rate', value: `${passRate}%`, color: passRate > 70 ? '#10b981' : '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Fila 1: Estados separados + Resultados */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Estados — Jira</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.jiraStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Estados — Azure</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.azureStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Resultados de ejecución</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.resultData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {data.resultData.map((_, i) => <Cell key={i} fill={['#10b981', '#ef4444', '#f59e0b'][i] || '#6b7280'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila 2: Tipo Jira + Severidad Azure + Top fallados */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tipo de item (Jira)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {data.typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Severidad (Azure)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {data.severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Top TCs con más fallos</h3>
          {data.topFailed.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Sin fallos registrados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topFailed} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Bar dataKey="fallos" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Fila 3: Ejecuciones/día + Cobertura */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Ejecuciones por día</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.execDays}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="ejecuciones" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {data.execDays.length === 0 && <p className="text-xs text-gray-400 text-center">Sin datos</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Cobertura por módulo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.moduleData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Totales" fill="#d1d5db" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Ejecutados" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila 4: Progreso planes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Progreso de planes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.planData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Pasaron" stackId="a" fill="#10b981" />
            <Bar dataKey="Fallaron" stackId="a" fill="#ef4444" />
            <Bar dataKey="Bloqueados" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Pendientes" stackId="a" fill="#d1d5db" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Analytics
