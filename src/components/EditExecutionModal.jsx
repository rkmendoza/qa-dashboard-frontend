import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function EditExecutionModal ({ execution, table, onClose, onSaved }) {
  const [notes, setNotes] = useState(execution?.notes || '')
  const [existingImages, setExistingImages] = useState(execution?.evidence || [])
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!execution) onClose()
  }, [execution])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'))
    setNewFiles(prev => [...prev, ...files])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = (ev) => setNewPreviews(prev => [...prev, ev.target.result])
      reader.readAsDataURL(f)
    })
  }

  const removeExisting = (idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  const removeNew = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx))
    setNewPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const sanitizeFilename = (name) => {
    const ext = name.split('.').pop()
    const base = name.slice(0, -(ext.length + 1))
    const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
    return `${sanitized}.${ext}`
  }

  const handleSave = async () => {
    if (!execution) return
    setSaving(true)

    const removed = (execution.evidence || []).filter(p => !existingImages.includes(p))

    try {
      if (removed.length > 0) {
        await supabase.storage.from('execution-evidence').remove(removed)
      }

      const uploaded = []
      const { data: { user } } = await supabase.auth.getUser()
      for (const file of newFiles) {
        const path = `${user.id}/${Date.now()}-${sanitizeFilename(file.name)}`
        const { data, error } = await supabase.storage
          .from('execution-evidence')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (error) throw new Error(`Error al subir imagen: ${error.message}`)
        if (data) uploaded.push(data.path)
      }

      const finalEvidence = [...existingImages, ...uploaded]
      const { error } = await supabase
        .from(table)
        .update({ notes, evidence: finalEvidence })
        .eq('id', execution.id)

      if (error) throw new Error(error.message)

      onSaved && onSaved()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400">Editar ejecución</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {new Date(execution?.executed_at).toLocaleString('es-ES', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Comentarios de la ejecución..." />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Evidencias</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />

            <div className="flex flex-wrap gap-2 mb-2">
              {existingImages.map((path, i) => (
                <div key={`e-${i}`} className="relative group">
                  <img src={`${SUPABASE_URL}/storage/v1/object/public/execution-evidence/${path}`}
                    className="w-16 h-16 rounded-lg border border-gray-200 object-cover" />
                  <button onClick={() => removeExisting(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    ×
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={`n-${i}`} className="relative group">
                  <img src={src} className="w-16 h-16 rounded-lg border border-gray-200 object-cover opacity-70" />
                  <button onClick={() => removeNew(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-100 transition">
                    ×
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-300 transition text-xl">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
