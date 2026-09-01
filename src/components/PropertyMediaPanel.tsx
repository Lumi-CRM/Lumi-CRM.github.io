import { useRef, useState } from 'react'
import { Camera, Download, Image as ImageIcon, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCrmFiles, type CrmFileView } from '../hooks/useCrmFiles'

const MEDIA_GROUPS = [
  'Фасад и двор', 'Планировка', 'Прихожая', 'Кухня', 'Гостиная', 'Спальня',
  'Детская', 'Санузел', 'Балкон и лоджия', 'Вид из окон', 'Прочее',
]

interface PropertyMediaPanelProps {
  propertyId: string
  propertyAddress: string
}

const PropertyMediaPanel = ({ propertyId, propertyAddress }: PropertyMediaPanelProps) => {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [group, setGroup] = useState('Кухня')
  const [error, setError] = useState('')
  const { data: files = [], isPending: loading, error: queryError, uploadFiles, setPrimary, removeFile, uploading } = useCrmFiles({ userId: user?.id, bucket: 'crm-images', propertyId, withUrls: true })
  const loadError = queryError instanceof Error ? queryError.message : queryError ? 'Не удалось загрузить фотографии' : ''

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    if (!user || selected.length === 0) return
    setError('')
    try {
      await uploadFiles(selected, group, true)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить фотографии')
    } finally {
      event.target.value = ''
    }
  }

  const makePrimary = async (file: CrmFileView) => {
    try {
      await setPrimary(file)
    } catch (primaryError) {
      setError(primaryError instanceof Error ? primaryError.message : 'Не удалось выбрать главное фото')
    }
  }

  const remove = async (file: CrmFileView) => {
    try {
      await removeFile(file)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить фотографию')
    }
  }

  const groups = MEDIA_GROUPS.map(name => ({ name, files: files.filter(file => (file.category || 'Прочее') === name) }))
  const visibleGroups = groups.filter(item => item.files.length > 0)

  return (
    <div className="space-y-5">
      <section className="lumi-panel rounded-2xl border p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="lumi-muted-strong min-w-56 flex-1 text-sm font-medium">Группа помещения
            <select value={group} onChange={event => setGroup(event.target.value)} className="lumi-control mt-2 w-full rounded-xl px-4 py-3 outline-none">
              {MEDIA_GROUPS.map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="lumi-gradient-button inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:opacity-60">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? 'Загружаем…' : 'Добавить фотографии'}
          </button>
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={upload} />
        </div>
        <p className="lumi-muted mt-3 text-sm">Папка объекта: {propertyAddress}. Файлы сохраняются отдельно по выбранным группам.</p>
        {(error || loadError) && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error || loadError}</p>}
      </section>

      {loading ? (
        <div className="lumi-muted flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Загружаем фотографии…</div>
      ) : visibleGroups.length === 0 ? (
        <div className="lumi-panel lumi-muted flex flex-col items-center rounded-2xl border py-16 text-center">
          <Camera className="mb-3 h-12 w-12" />
          <p className="lumi-text font-semibold">В папке квартиры пока нет фотографий</p>
          <p className="mt-1 text-sm">Выберите группу помещения и загрузите изображения</p>
        </div>
      ) : visibleGroups.map(section => (
        <section key={section.name} className="space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="lumi-accent-text h-5 w-5" />
            <h3 className="lumi-text text-lg font-semibold">{section.name}</h3>
            <span className="lumi-accent-soft rounded-full px-2.5 py-1 text-xs font-semibold">{section.files.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {section.files.filter(file => file.signedUrl).map(file => (
              <article key={file.id} className="lumi-panel group overflow-hidden rounded-2xl border">
                <div className="aspect-[4/3] overflow-hidden bg-black/10"><img src={file.signedUrl} alt={file.name} className="h-full w-full object-cover transition group-hover:scale-105" /></div>
                <div className="flex items-center gap-2 p-3">
                  <p className="lumi-text min-w-0 flex-1 truncate text-sm font-medium">{file.name}</p>
                  <button type="button" onClick={() => void makePrimary(file)} className={`rounded-lg p-2 ${file.is_primary ? 'bg-amber-500/15 text-amber-500' : 'lumi-control'}`} title={file.is_primary ? 'Главное фото' : 'Сделать главным'}><Star className={`h-4 w-4 ${file.is_primary ? 'fill-current' : ''}`} /></button>
                  <a href={file.signedUrl} target="_blank" rel="noreferrer" className="lumi-control rounded-lg p-2" title="Открыть"><Download className="h-4 w-4" /></a>
                  <button type="button" onClick={() => void remove(file)} className="rounded-lg bg-red-500/10 p-2 text-red-500" title="Удалить"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default PropertyMediaPanel
