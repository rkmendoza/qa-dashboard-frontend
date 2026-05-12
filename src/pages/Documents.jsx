import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import MDEditor from '@uiw/react-md-editor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const Documents = () => {
  const [docs, setDocs]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [editing, setEditing]     = useState(false)
  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)

  const fetchDocs = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  const handleSelect = (doc) => {
    setSelected(doc)
    setTitle(doc.title)
    setContent(doc.content || '')
    setEditing(false)
  }

  const handleNew = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title: 'Nueva página',
        content: '# Nueva página\n\nEmpieza a escribir aquí...',
        created_by: user.id
      }])
      .select()
      .single()

    if (!error) {
      setDocs(prev => [data, ...prev])
      handleSelect(data)
      setEditing(true)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)

    const { data, error } = await supabase
      .from('documents')
      .update({
        title,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', selected.id)
      .select()
      .single()

    if (!error) {
      setDocs(prev => prev.map(d => d.id === data.id ? data : d))
      setSelected(data)
      setEditing(false)
    }
    setSaving(false)
  }

  const handleDelete = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    if (selected?.id === doc.id) {
      setSelected(null)
      setEditing(false)
    }
  }

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    return `hace ${Math.floor(hrs / 24)}d`
  }

  return (
    <div className="flex h-full gap-0 -m-6" style={{ height: 'calc(100vh - 0px)' }}>

      {/* Sidebar de documentos */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Documentación</h2>
            <button
              onClick={handleNew}
              className="text-gray-400 hover:text-blue-600 transition"
              title="Nueva página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <p className="text-xs text-gray-400 px-4 py-2">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-2">
              {search ? 'Sin resultados' : 'Sin páginas aún'}
            </p>
          ) : (
            filtered.map(doc => (
              <div
                key={doc.id}
                onClick={() => handleSelect(doc)}
                className={`group flex items-center justify-between px-4 py-2 cursor-pointer transition ${
                  selected?.id === doc.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">{timeAgo(doc.updated_at)}</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(doc) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition ml-1 flex-shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleNew}
            className="w-full text-xs text-gray-500 hover:text-blue-600 flex items-center gap-2 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nueva página
          </button>
        </div>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Wiki de QA</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Crea guías, políticas y documentación para tu equipo de QA
            </p>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Crear primera página
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {editing ? (
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="text-lg font-medium text-gray-800 border-none outline-none focus:ring-0 bg-transparent"
                    placeholder="Título de la página"
                  />
                ) : (
                  <h1 className="text-lg font-medium text-gray-800">{selected.title}</h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setTitle(selected.title)
                        setContent(selected.content || '')
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                  </button>
                )}
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
              {editing ? (
                <div data-color-mode="light" className="h-full">
                  <MDEditor
                    value={content}
                    onChange={setContent}
                    height="100%"
                    preview="live"
                    style={{ borderRadius: 0, border: 'none' }}
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto px-8 py-8">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content || '*Esta página está vacía. Haz clic en Editar para agregar contenido.*'}
                    </ReactMarkdown>
                  </div>
                  <p className="text-xs text-gray-300 mt-8">
                    Última modificación: {new Date(selected.updated_at).toLocaleString('es-ES')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Documents