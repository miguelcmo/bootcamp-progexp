import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function AvatarUploader({ userId, currentAvatarUrl, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl)

  async function uploadAvatar(event) {
    try {
      setUploading(true)

      const file = event.target.files?.[0]
      if (!file) return

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida')
        return
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen debe ser menor a 2MB')
        return
      }

      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      // Eliminar avatar anterior si existe
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
      }

      // Subir nueva imagen
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)

      setPreviewUrl(publicUrl)

      // Notificar al componente padre
      if (onUploadSuccess) {
        onUploadSuccess(publicUrl)
      }

      alert('Avatar actualizado exitosamente')
    } catch (error) {
      console.error('Error al subir avatar:', error)
      alert('Error al subir la imagen: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function removeAvatar() {
    try {
      setUploading(true)

      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').slice(-2).join('/')
        const { error } = await supabase.storage.from('avatars').remove([oldPath])

        if (error) throw error
      }

      setPreviewUrl(null)

      if (onUploadSuccess) {
        onUploadSuccess('')
      }

      alert('Avatar eliminado exitosamente')
    } catch (error) {
      console.error('Error al eliminar avatar:', error)
      alert('Error al eliminar la imagen: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="avatar-uploader">
      <div className="avatar-preview-container">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar preview"
            className="avatar-preview"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        ) : (
          <div className="avatar-placeholder">
            <i className="bi bi-person-fill fs-1"></i>
          </div>
        )}
      </div>

      <div className="avatar-actions">
        <label htmlFor="avatar-upload" className={`btn btn-sm btn-primary ${uploading ? 'disabled' : ''}`}>
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Subiendo...
            </>
          ) : (
            <>
              <i className="bi bi-upload me-2"></i>
              Subir foto
            </>
          )}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          style={{ display: 'none' }}
        />

        {previewUrl && (
          <button
            className="btn btn-sm btn-danger"
            onClick={removeAvatar}
            disabled={uploading}
          >
            <i className="bi bi-trash me-2"></i>
            Eliminar
          </button>
        )}
      </div>

      <small className="text-muted d-block mt-2">
        Formatos: JPG, PNG, GIF. Tamaño máximo: 2MB
      </small>
    </div>
  )
}
