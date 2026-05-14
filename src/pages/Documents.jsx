import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import MDEditor from '@uiw/react-md-editor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mammoth from 'mammoth'
import TurndownService from 'turndown'

const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })

const TEMPLATES = [
  {
    name: 'Página en blanco',
    icon: '📄',
    content: '# {title}\n\n'
  },
  {
    name: 'Reporte de Bug',
    icon: '🐛',
    content: `# {title}

## Resumen

## Ambiente
- **Navegador:**
- **SO:**
- **Versión:**

## Pasos para reproducir
1.
2.
3.

## Resultado esperado

## Resultado actual

## Evidencias
`
  },
  {
    name: 'Plan de Pruebas',
    icon: '🧪',
    content: `# {title}

## Alcance

## Fuera de alcance

## Estrategia de pruebas

## Criterios de entrada

## Criterios de salida

## Riesgos
`
  },
  {
    name: 'Minuta de Reunión',
    icon: '📝',
    content: `# {title}

- **Fecha:**
- **Asistentes:**
- **Duración:**

## Temas tratados

## Acuerdos

## Próximos pasos
`
  },
  {
    name: 'Guía / Wiki',
    icon: '📖',
    content: `# {title}

## Propósito

## Procedimiento

## Notas importantes
`
  },
  {
    name: 'Anotaciones Varias',
    icon: '💡',
    content: `# {title}

## Notas

## Ideas

## Referencias
`
  },
  {
    name: 'Todo List',
    icon: '✅',
    content: `# {title}

## Pendiente
- [ ] 
- [ ] 
- [ ] 

## En progreso
- [ ] 

## Completado
- [x] 
`
  },
  {
    name: 'Reporte de Ejecuciones',
    icon: '📊',
    content: `# {title}

- **Fecha:**
- **Responsable:**
- **Plan / Suite:**

## Resumen
| Total | Pasaron | Fallaron | Bloqueados |
|-------|---------|----------|------------|
| 0     | 0       | 0        | 0          |

## Detalle

| # | TC | Resultado | Notas |
|---|-----|-----------|-------|
| 1 |     |           |       |
| 2 |     |           |       |
| 3 |     |           |       |

## Observaciones

## Acciones pendientes
`
  }
]

const EMOJIS = [
  '📄', '📝', '📖', '📋', '📌', '📎', '🔖', '🏷️',
  '🐛', '🧪', '✅', '❌', '⚠️', '🚀', '🎯', '💡',
  '📊', '📈', '📉', '🗂️', '📁', '📂', '📃', '📑',
  '🔴', '🟡', '🟢', '🔵', '🟣', '🟠', '⚪', '🟤',
  '⭐', '🌟', '✨', '🔥', '💎', '🧠', '⚡', '🎨',
  '👤', '👥', '🔐', '🔒', '🔓', '🕐', '📅', '🎉'
]

const buildTree = (docs) => {
  const map = {}
  const roots = []
  docs.forEach(d => { map[d.id] = { ...d, children: [] } })
  docs.forEach(d => {
    if (d.parent_id && map[d.parent_id]) {
      map[d.parent_id].children.push(map[d.id])
    } else {
      roots.push(map[d.id])
    }
  })
  const sortByPosition = (nodes) => nodes.sort((a, b) => (a.position || 0) - (b.position || 0))
  sortByPosition(roots)
  roots.forEach(r => sortByPosition(r.children))
  return roots
}

const getBreadcrumbs = (doc, allDocs) => {
  if (!doc) return []
  const crumbs = [{ id: doc.id, title: doc.title }]
  let current = doc
  const visited = new Set()
  while (current.parent_id && !visited.has(current.parent_id)) {
    visited.add(current.parent_id)
    const parent = allDocs.find(d => d.id === current.parent_id)
    if (!parent) break
    crumbs.unshift({ id: parent.id, title: parent.title })
    current = parent
  }
  return crumbs
}

const parseDocxToMd = async (arrayBuffer) => {
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const md = turndownService.turndown(result.value)
  return md
}

const Documents = () => {
  const [docs, setDocs] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(new Set())
  const [showImport, setShowImport] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [parsedPreview, setParsedPreview] = useState(null)
  const [importTitle, setImportTitle] = useState('')
  const [importContent, setImportContent] = useState('')
  const [importParent, setImportParent] = useState('')
  const emojiPickerRef = useRef(null)

  const tree = useMemo(() => buildTree(docs), [docs])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('position', { ascending: true })
        .order('updated_at', { ascending: false })
      setDocs(data || [])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasChildren = (id) => docs.some(d => d.parent_id === id)

  const toggleExpand = (e, id) => {
    e.stopPropagation()
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelect = (doc) => {
    setSelected(doc)
    setTitle(doc.title)
    setContent(doc.content || '')
    setEditing(false)
  }

  const handleNewFromTemplate = async (template) => {
    const { data: { user } } = await supabase.auth.getUser()
    const mdContent = template.content.replace('{title}', template.title || template.name)
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title: template.name === 'Página en blanco' ? 'Nueva página' : template.name,
        content: mdContent,
        icon: template.icon,
        created_by: user.id
      }])
      .select()
      .single()

    if (!error) {
      setDocs(prev => [data, ...prev])
      handleSelect(data)
      setEditing(true)
      setShowTemplates(false)
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

  const handleDelete = async (e, doc) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    if (selected?.id === doc.id) {
      setSelected(null)
      setEditing(false)
    }
  }

  const toggleFavorite = async (e, doc) => {
    e.stopPropagation()
    const next = !doc.is_favorite
    const { data } = await supabase
      .from('documents')
      .update({ is_favorite: next })
      .eq('id', doc.id)
      .select()
      .single()
    if (data) {
      setDocs(prev => prev.map(d => d.id === data.id ? data : d))
      if (selected?.id === doc.id) setSelected(data)
    }
  }

  const changeIcon = async (doc, emoji) => {
    const { data } = await supabase
      .from('documents')
      .update({ icon: emoji })
      .eq('id', doc.id)
      .select()
      .single()
    if (data) {
      setDocs(prev => prev.map(d => d.id === data.id ? data : d))
      if (selected?.id === doc.id) setSelected(data)
    }
    setShowEmojiPicker(false)
  }

  const moveDoc = async (docId, newParentId) => {
    const { data } = await supabase
      .from('documents')
      .update({ parent_id: newParentId || null })
      .eq('id', docId)
      .select()
      .single()
    if (data) {
      setDocs(prev => prev.map(d => d.id === data.id ? data : d))
    }
  }

  const handleDragStart = (e, docId) => {
    setDragId(docId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', docId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnDoc = async (e, targetId) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId === targetId) return
    const sourceDoc = docs.find(d => d.id === sourceId)
    if (!sourceDoc) return
    if (sourceDoc.parent_id === targetId) return

    await moveDoc(sourceId, targetId)
    setExpanded(prev => new Set([...prev, targetId]))
    setDragId(null)
  }

  const indentDoc = async (doc) => {
    const siblings = docs
      .filter(d => (d.parent_id || null) === (doc.parent_id || null))
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    const idx = siblings.findIndex(d => d.id === doc.id)
    if (idx > 0) {
      const newParent = siblings[idx - 1]
      await moveDoc(doc.id, newParent.id)
      setExpanded(prev => new Set([...prev, newParent.id]))
    }
  }

  const outdentDoc = async (doc) => {
    if (!doc.parent_id) return
    const parent = docs.find(d => d.id === doc.parent_id)
    if (!parent) return
    const { data } = await supabase
      .from('documents')
      .update({ parent_id: parent.parent_id || null })
      .eq('id', doc.id)
      .select()
      .single()
    if (data) {
      setDocs(prev => prev.map(d => d.id === data.id ? data : d))
    }
  }

  const handleImportOpen = () => {
    setParsedPreview(null)
    setImportTitle('')
    setImportContent('')
    setImportParent('')
    setShowImport(true)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const baseName = file.name.replace(/\.[^.]+$/, '')
    setImportTitle(baseName)

    if (file.name.endsWith('.md')) {
      const text = await file.text()
      setImportContent(text)
      setParsedPreview({ type: 'md', content: text })
    } else if (file.name.endsWith('.docx')) {
      const buf = await file.arrayBuffer()
      const md = await parseDocxToMd(buf)
      setImportContent(md)
      setParsedPreview({ type: 'docx', content: md })
    } else {
      alert('Formato no soportado. Usa .md o .docx')
    }
  }

  const handleImportConfirm = async () => {
    if (!importTitle.trim()) return alert('El título es obligatorio')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        title: importTitle.trim(),
        content: importContent,
        icon: '📄',
        parent_id: importParent || null,
        created_by: user.id
      }])
      .select()
      .single()

    if (error) { alert('Error al importar: ' + error.message); return }
    setDocs(prev => [data, ...prev])
    setShowImport(false)
    handleSelect(data)
    setEditing(true)
  }

  const renderTreeItem = (node, depth = 0) => {
    const isExpanded = expanded.has(node.id)
    const hasKids = hasChildren(node.id)
    const isSelected = selected?.id === node.id

    return (
      <div key={node.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnDoc(e, node.id)}
          onClick={() => handleSelect(node)}
          className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-lg transition mx-2 text-sm ${
            isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
          } ${dragId === node.id ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${12 + depth * 18}px` }}
        >
          {hasKids ? (
            <button
              onClick={(e) => toggleExpand(e, node.id)}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(prev => prev === node.id ? false : node.id) }}
            className="flex-shrink-0 text-base leading-none hover:scale-110 transition-transform"
          >
            {node.icon || '📄'}
          </button>

          <span className="truncate flex-1 min-w-0 ml-0.5">{node.title}</span>

          <button
            onClick={(e) => toggleFavorite(e, node)}
            className={`flex-shrink-0 transition ml-1 ${node.is_favorite ? 'text-yellow-400' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
            title={node.is_favorite ? 'Quitar favorito' : 'Agregar a favoritos'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={node.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>

        {showEmojiPicker === node.id && (
          <div
            ref={emojiPickerRef}
            className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 grid grid-cols-8 gap-1"
            style={{ transform: `translate(${12 + depth * 18}px, 0)` }}
          >
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => changeIcon(node, emoji)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg text-base transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {hasKids && isExpanded && (
          <div className="relative">
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gray-200" />
            {node.children
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderTreeRoot = (nodes) => {
    return nodes.map(node => renderTreeItem(node, 0))
  }

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree
    const q = search.toLowerCase()
    const matchingIds = new Set()
    docs.forEach(d => {
      if (d.title.toLowerCase().includes(q)) matchingIds.add(d.id)
    })
    const filterNodes = (nodes) => {
      return nodes.filter(n => {
        const filteredChildren = filterNodes(n.children)
        if (matchingIds.has(n.id) || filteredChildren.length > 0) {
          n.children = filteredChildren
          return true
        }
        return false
      })
    }
    return filterNodes(tree.map(n => ({ ...n, children: [...n.children] })))
  }, [tree, search, docs])

  const breadcrumbs = useMemo(() => getBreadcrumbs(selected, docs), [selected, docs])

  return (
    <div className="flex h-full gap-0 -m-6" style={{ height: 'calc(100vh - 0px)' }}>
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 relative">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Documentación</h2>
            <button
              onClick={() => setShowTemplates(true)}
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
          ) : search ? (
            filteredTree.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-2">Sin resultados</p>
            ) : (
              renderTreeRoot(filteredTree)
            )
          ) : (
            <>
              {docs.filter(d => d.is_favorite).length > 0 && (
                <div className="mb-2">
                  <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">⭐ Favoritos</p>
                  {docs.filter(d => d.is_favorite).map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => handleSelect(doc)}
                      className={`group flex items-center gap-2 px-4 py-1.5 cursor-pointer rounded-lg transition mx-2 text-sm ${
                        selected?.id === doc.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{doc.icon || '📄'}</span>
                      <span className="truncate flex-1 min-w-0">{doc.title}</span>
                      <button
                        onClick={(e) => toggleFavorite(e, doc)}
                        className="flex-shrink-0 text-yellow-400 transition ml-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mb-2">
                <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">📄 Páginas</p>
                {tree.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-gray-400 italic">Sin páginas</p>
                ) : (
                  renderTreeRoot(tree)
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button
            onClick={() => setShowTemplates(true)}
            className="w-full text-xs text-gray-500 hover:text-blue-600 flex items-center gap-2 transition px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nueva página
          </button>
          <button
            onClick={handleImportOpen}
            className="w-full text-xs text-gray-500 hover:text-blue-600 flex items-center gap-2 transition px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Importar
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Wiki de QA</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Crea guías, políticas y documentación para tu equipo de QA
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                Crear primera página
              </button>
              <button
                onClick={handleImportOpen}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Importar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-8 pt-3 pb-0">
              <nav className="flex items-center gap-1.5 text-xs text-gray-400">
                <button
                  onClick={() => setSelected(null)}
                  className="hover:text-blue-600 transition"
                >
                  Documentación
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.id} className="flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                    {i === breadcrumbs.length - 1 ? (
                      <span className="text-gray-600 font-medium">{crumb.title}</span>
                    ) : (
                      <button
                        onClick={() => {
                          const doc = docs.find(d => d.id === crumb.id)
                          if (doc) handleSelect(doc)
                        }}
                        className="hover:text-blue-600 transition"
                      >
                        {crumb.title}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            </div>

            <div className="flex items-center justify-between px-8 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {editing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => setShowEmojiPicker('title')}
                      className="flex-shrink-0 text-2xl hover:scale-110 transition-transform"
                    >
                      {selected.icon || '📄'}
                    </button>
                    {showEmojiPicker === 'title' && (
                      <div
                        ref={emojiPickerRef}
                        className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 grid grid-cols-8 gap-1"
                        style={{ transform: 'translate(0, 40px)' }}
                      >
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => changeIcon(selected, emoji)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg text-base transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="text-lg font-medium text-gray-800 border-none outline-none focus:ring-0 bg-transparent flex-1 min-w-0"
                      placeholder="Título de la página"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.icon || '📄'}</span>
                    <h1 className="text-lg font-medium text-gray-800">{selected.title}</h1>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
                {!editing && (
                  <>
                    {selected.parent_id && (
                      <button
                        onClick={() => outdentDoc(selected)}
                        className="text-xs text-gray-400 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1"
                        title="Mover a nivel superior"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 8l4 4-4 4M3 12h18M3 6v12"/>
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => indentDoc(selected)}
                      className="text-xs text-gray-400 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1"
                      title="Anidar bajo el elemento anterior"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 8l-4 4 4 4M21 12H3M21 6v12"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleFavorite(null, selected)}
                      className={`text-xs px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1 ${
                        selected.is_favorite ? 'text-yellow-500 border-yellow-200' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={selected.is_favorite ? 'Quitar favorito' : 'Favorito'}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={selected.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      onClick={(e) => handleDelete(e, selected)}
                      className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1"
                      title="Eliminar"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

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

      {showTemplates && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800">Nueva página</h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Selecciona una plantilla para empezar</p>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => handleNewFromTemplate(tpl)}
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition text-left"
                >
                  <span className="text-2xl flex-shrink-0">{tpl.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tpl.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {i === 0 ? 'Página vacía con editor markdown' :
                       i === 1 ? 'Bug report con campos estándar' :
                       i === 2 ? 'Estructura para plan de pruebas' :
                       i === 3 ? 'Minuta con agenda y acuerdos' :
                       'Documentación con procedimientos'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800">Importar documento</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {!parsedPreview ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-blue-300 transition">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm text-gray-500 mb-2">Arrastra un archivo aquí o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400 mb-4">Markdown (.md) o Word (.docx)</p>
                <input
                  type="file"
                  accept=".md,.docx"
                  onChange={handleFileSelect}
                  className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
                  <input
                    type="text"
                    value={importTitle}
                    onChange={e => setImportTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ubicación (opcional)</label>
                  <select
                    value={importParent}
                    onChange={e => setImportParent(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Raíz (sin padre)</option>
                    {docs.map(d => (
                      <option key={d.id} value={d.id}>{d.icon || '📄'} {d.title}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vista previa</label>
                  <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <div className="prose prose-xs max-w-none text-sm text-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {importContent || '*Sin contenido*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setParsedPreview(null)}
                    className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Importar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Documents
