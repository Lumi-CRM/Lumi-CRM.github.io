export type UploadBucket = 'crm-documents' | 'crm-images'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', ...IMAGE_EXTENSIONS])
const DANGEROUS_MIME_TYPES = new Set(['text/html', 'image/svg+xml', 'application/xhtml+xml', 'application/javascript', 'text/javascript'])

export const validateCrmUpload = (file: Pick<File, 'name' | 'size' | 'type'>, bucket: UploadBucket) => {
  if (!file.name || file.name.length > 240) throw new Error('Имя файла пустое или слишком длинное')
  if (file.size <= 0) throw new Error('Нельзя загрузить пустой файл')
  if (file.size > MAX_FILE_SIZE) throw new Error('Файл больше 25 МБ')
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = bucket === 'crm-images' ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS
  if (!allowed.has(extension)) throw new Error(bucket === 'crm-images'
    ? 'Разрешены только JPG, PNG, WebP и GIF'
    : 'Разрешены PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG и WebP')
  const mime = file.type.toLowerCase()
  if (DANGEROUS_MIME_TYPES.has(mime)) throw new Error('Тип файла небезопасен и не поддерживается')
  if (bucket === 'crm-images' && mime && !mime.startsWith('image/')) throw new Error('Расширение и тип изображения не совпадают')
}
