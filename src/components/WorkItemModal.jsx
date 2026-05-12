import { useState, useEffect } from 'react'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL

const severityColors = {
    '1 - Critical': '#ef4444',
    '2 - High': '#f59e0b',
    '3 - Medium': '#3b82f6',
    '4 - Low': '#10b981',
}

const ESTADOS = [
    'Ready for QA',
    'QA Validated',
    'Committed',
    'Blocked',
    'Approved',
    'Done',
    'Rejected'
]

const WorkItemModal = ({ item, onClose, onUpdated }) => {
    const [detail, setDetail] = useState(null)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState(item.status)
    const [comment, setComment] = useState('')
    const [saving, setSaving] = useState(false)
    const [commenting, setCommenting] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const { data } = await axios.get(`${BACKEND}/api/azure/detail/${item.id}`)
                setDetail(data)
                setStatus(data.status)
            } catch (err) {
                setError('No se pudo cargar el detalle')
            }
            setLoading(false)
        }
        fetchDetail()
    }, [item.id])

    const handleUpdateStatus = async () => {
        setSaving(true)
        setError('')
        try {
            await axios.patch(`${BACKEND}/api/azure/update/${item.id}`, { status })
            setSuccessMsg('Estado actualizado en Azure DevOps')
            onUpdated && onUpdated(item.id, status)
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (err) {
            setError('Error al actualizar el estado')
        }
        setSaving(false)
    }

    const handleAddComment = async () => {
        if (!comment.trim()) return
        setCommenting(true)
        setError('')
        try {
            const { data } = await axios.post(`${BACKEND}/api/azure/comment/${item.id}`, { text: comment })
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
            setSuccessMsg('Comentario agregado en Azure DevOps')
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (err) {
            setError('Error al agregar el comentario')
        }
        setCommenting(false)
    }

    const sevColor = severityColors[item.severity] || '#6b7280'

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
                                { label: 'Iteración', value: detail?.iteration?.split('\\').pop() },
                                { label: 'Área', value: detail?.area?.split('\\').pop() },
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

                        {/* Descripción */}
                        {detail?.reprosteps && (
                            <div className="p-5 border-b border-gray-100">
                                <p className="text-xs text-gray-400 mb-2">Repro Steps</p>
                                <div
                                    className="text-sm text-gray-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: detail.reprosteps }}
                                />
                            </div>
                        )}

                        {/* Cambiar estado */}
                        <div className="p-5 border-b border-gray-100">
                            <p className="text-xs text-gray-400 mb-2">Cambiar estado en Azure DevOps</p>
                            <div className="flex gap-2">
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ESTADOS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={saving || status === detail?.status}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                                >
                                    {saving ? 'Guardando...' : 'Actualizar'}
                                </button>
                            </div>
                        </div>

                        {/* Comentarios anteriores */}
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
                                            <p className="text-xs text-gray-600 leading-relaxed comment-text"
                                                dangerouslySetInnerHTML={{ __html: c.text }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Nuevo comentario */}
                        <div className="p-5 border-b border-gray-100">
                            <p className="text-xs text-gray-400 mb-2">Agregar comentario</p>
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
                                Ver en Azure DevOps
                            </a>
                        </div>

                    </>
                )
                }
            </div >
        </div >
    )
}

export default WorkItemModal