import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Folder, Image as ImageIcon, Loader2, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PropertyMediaPanel from '../components/PropertyMediaPanel'

interface PropertyFolder {
  id: string
  address: string
  createdAt: string
  imageCount: number
}

const GalleryPage = () => {
  const { user } = useAuth()
  const [folders, setFolders] = useState<PropertyFolder[]>([])
  const [selected, setSelected] = useState<PropertyFolder | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [propertiesResult, imagesResult] = await Promise.all([
        supabase
          .from('properties')
          .select('id,address,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('crm_files')
          .select('property_id')
          .eq('user_id', user.id)
          .eq('bucket', 'crm-images'),
      ])
      if (propertiesResult.error) throw propertiesResult.error
      if (imagesResult.error) throw imagesResult.error

      const counts = (imagesResult.data || []).reduce<Record<string, number>>((result, item) => {
        if (item.property_id) result[item.property_id] = (result[item.property_id] || 0) + 1
        return result
      }, {})

      setFolders((propertiesResult.data || []).map(item => ({
        id: item.id,
        address: item.address || 'Объект без адреса',
        createdAt: item.created_at,
        imageCount: counts[item.id] || 0,
      })))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить папки объектов')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const visibleFolders = useMemo(() => folders.filter(folder =>
    folder.address.toLowerCase().includes(query.trim().toLowerCase())
  ), [folders, query])

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setSelected(null); void load() }} className="lumi-control rounded-xl p-2.5" aria-label="Назад к объектам">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="lumi-muted text-sm">Галерея объекта</p>
            <h1 className="lumi-text text-2xl font-bold">{selected.address}</h1>
          </div>
        </div>
        <PropertyMediaPanel propertyId={selected.id} propertyAddress={selected.address} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="lumi-text text-3xl font-bold">Галерея объектов</h1>
        <p className="lumi-muted mt-2">Каждая квартира хранится в отдельной папке, а фотографии — по группам помещений.</p>
      </div>

      <div className="relative max-w-xl">
        <Search className="lumi-muted absolute left-3 top-3.5 h-5 w-5" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Найти папку по адресу…" className="lumi-control w-full rounded-xl py-3 pl-10 pr-4 outline-none" />
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500">{error}</p>}
      {loading ? (
        <div className="lumi-muted flex items-center gap-2 py-16"><Loader2 className="h-5 w-5 animate-spin" />Загрузка папок…</div>
      ) : visibleFolders.length === 0 ? (
        <div className="lumi-panel lumi-muted flex flex-col items-center rounded-2xl border py-20 text-center">
          <Folder className="mb-4 h-14 w-14" />
          <p className="lumi-text text-lg font-semibold">Папки объектов не найдены</p>
          <p className="mt-1 text-sm">Сначала создайте объект недвижимости</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleFolders.map((folder, index) => (
            <motion.button
              type="button"
              key={folder.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => setSelected(folder)}
              className="lumi-panel group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5"
            >
              <div className="lumi-panel-muted flex h-36 items-center justify-center border-b lumi-border">
                <div className="lumi-accent-soft rounded-2xl p-4"><Building2 className="h-10 w-10" /></div>
              </div>
              <div className="p-5">
                <h2 className="lumi-text truncate text-lg font-semibold">{folder.address}</h2>
                <div className="lumi-muted mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />{folder.imageCount} фото</span>
                  <span>{new Date(folder.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

export default GalleryPage
