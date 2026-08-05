import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const DOCUMENT_ID = '1vDq1UT5GiDb2h8pmDh47PEZTgVzFrgwhWm5MmqhSP9o'
const SHEETS = [
  { name: 'Холодные звонки', gid: '0', kind: 'lead', temperature: 'cold', clientType: 'seller' },
  // «Холодные звонки (копия)» — архивная копия 27 строк этого листа, не импортируем повторно.
  { name: 'Тёпые звонки', gid: '382810404', kind: 'lead', temperature: 'warm', clientType: 'seller' },
  { name: 'Входящие звонки', gid: '194164375', kind: 'lead', temperature: 'inbound', clientType: 'seller' },
  { name: 'Встречи', gid: '1768192617', kind: 'meeting', temperature: 'warm', clientType: 'seller' },
  { name: 'Планирование', gid: '426231194', kind: 'task' },
  { name: 'Подбор', gid: '586036728', kind: 'lead', temperature: 'warm', clientType: 'buyer' },
]

const applyChanges = process.argv.includes('--apply')
const argumentValue = name => process.argv.find(argument => argument.startsWith(`${name}=`))?.slice(name.length + 1)
const cwd = process.cwd()

async function readEnvFile(fileName) {
  try {
    const content = await fs.readFile(path.join(cwd, fileName), 'utf8')
    return Object.fromEntries(
      content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.includes('='))
        .map(line => {
          const separator = line.indexOf('=')
          const key = line.slice(0, separator).trim()
          const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
          return [key, value]
        }),
    )
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

const env = {
  ...(await readEnvFile('.env')),
  ...(await readEnvFile('.env.import.local')),
  ...process.env,
}
const serviceRoleKey = argumentValue('--service-key') || env.SUPABASE_SERVICE_ROLE_KEY
const explicitUserId = argumentValue('--user-id') || env.CRM_IMPORT_USER_ID

const importYear = Number(env.CRM_IMPORT_YEAR || new Date().getFullYear())

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

async function loadSheet(sheet) {
  const url = `https://docs.google.com/spreadsheets/d/${DOCUMENT_ID}/export?format=csv&gid=${sheet.gid}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Не удалось прочитать лист «${sheet.name}»: HTTP ${response.status}`)

  const table = parseCsv(await response.text())
  const headers = (table.shift() || []).map(value => String(value).trim())
  const rows = table
    .map((values, index) => ({
      rowNumber: index + 2,
      values: values.map(value => String(value).trim()),
    }))
    .filter(row => row.values.some(value => value && value !== '—' && value !== 'м²'))

  return { ...sheet, headers, rows }
}

function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 10) digits = `7${digits}`
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  return digits
}

function splitName(value) {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || 'Без имени', lastName: parts.slice(1).join(' ') }
}

function cleanText(value) {
  const text = String(value ?? '').trim()
  return text === '—' ? '' : text
}

function normalizeIdentityText(value) {
  return cleanText(value).toLowerCase().replaceAll('ё', 'е').replace(/[^a-zа-я0-9]+/gi, '')
}

function normalizeAddress(value) {
  return cleanText(value)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/\b(г|город)\.?\s*курск\b/gi, '')
    .replace(/\b(улица|ул)\.?\s*/gi, '')
    .replace(/\b(дом|д)\.?\s*/gi, '')
    .replace(/\b(квартира|кв)\.?\s*/gi, 'кв')
    .replace(/[^a-zа-я0-9/]+/gi, '')
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length]
}

function addressesLikelySame(left, right) {
  const normalizedLeft = normalizeAddress(left)
  const normalizedRight = normalizeAddress(right)
  if (!normalizedLeft || !normalizedRight) return false
  if (normalizedLeft === normalizedRight) return true
  const leftNumber = normalizedLeft.replace(/\D/g, '')
  const rightNumber = normalizedRight.replace(/\D/g, '')
  return leftNumber === rightNumber
    && normalizedLeft.length >= 5
    && normalizedRight.length >= 5
    && editDistance(normalizedLeft, normalizedRight) <= 1
}

function parseNumber(value) {
  const normalized = cleanText(value).replace(/[^\d,.-]/g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseMoney(value) {
  const digits = cleanText(value).replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function parseRooms(value) {
  const match = cleanText(value).match(/(\d+)\s*[-–]?\s*к/i)
  return match ? Number(match[1]) : null
}

function parseFloor(value) {
  const [floor, totalFloors] = cleanText(value).split('/').map(part => Number.parseInt(part, 10))
  return {
    floor: Number.isFinite(floor) ? floor : null,
    totalFloors: Number.isFinite(totalFloors) ? totalFloors : null,
  }
}

function parseDate(value) {
  const text = cleanText(value)
  if (!text) return null
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/)
  if (!match) return null
  let year = match[3] ? Number(match[3]) : importYear
  if (year < 100) year += 2000
  const month = Number(match[2])
  const day = Number(match[1])
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function toTimestamp(dateValue, timeValue = '12:00') {
  const date = parseDate(dateValue)
  if (!date) return null
  const timeMatch = cleanText(timeValue).match(/(\d{1,2}):(\d{2})/)
  const time = timeMatch
    ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}:00`
    : '12:00:00'
  return `${date}T${time}+03:00`
}

function fingerprint(sheetName, rowNumber, values) {
  return createHash('sha256')
    .update(`${DOCUMENT_ID}|${sheetName}|${rowNumber}|${JSON.stringify(values)}`)
    .digest('hex')
}

function compact(values) {
  return values.map(cleanText).filter(Boolean).join('\n') || null
}

function assertResult(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`)
  return result.data
}

const sheetData = []
for (const sheet of SHEETS) sheetData.push(await loadSheet(sheet))

const summary = sheetData.map(sheet => ({
  sheet: sheet.name,
  rows: sheet.rows.length,
  columns: sheet.headers.filter(Boolean).length,
}))

console.table(summary)
console.log(`Всего строк для обработки: ${summary.reduce((sum, item) => sum + item.rows, 0)}`)

if (!applyChanges) {
  console.log('Проверка завершена без записи. Для переноса используйте: npm run import:sheets -- --apply')
  process.exit(0)
}

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = serviceRoleKey || env.VITE_SUPABASE_ANON_KEY
const email = env.CRM_IMPORT_EMAIL
const password = env.CRM_IMPORT_PASSWORD

if (!supabaseUrl || !supabaseKey) throw new Error('В .env отсутствуют VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY')
if ((!email || !password) && (!serviceRoleKey || !explicitUserId)) {
  throw new Error('Создайте .env.import.local с CRM_IMPORT_EMAIL и CRM_IMPORT_PASSWORD')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
let userId = explicitUserId
if (!serviceRoleKey) {
  const auth = await supabase.auth.signInWithPassword({ email, password })
  if (auth.error || !auth.data.user) throw new Error(`Не удалось войти в Supabase: ${auth.error?.message ?? 'нет пользователя'}`)
  userId = auth.data.user.id
}
if (!userId) throw new Error('Не указан пользователь для импорта')

const importRun = assertResult(
  await supabase
    .from('crm_imports')
    .insert({ user_id: userId, source_document_id: DOCUMENT_ID, status: 'running' })
    .select('id')
    .single(),
  'Не удалось создать запуск импорта. Сначала примените миграцию 20260730_crm_foundation.sql',
)

const importId = importRun.id
let importedRows = 0
let skippedRows = 0

try {
  const clients = assertResult(await supabase.from('clients').select('*'), 'Не удалось прочитать клиентов') ?? []
  const properties = assertResult(await supabase.from('properties').select('*'), 'Не удалось прочитать объекты') ?? []
  const knownRows = assertResult(
    await supabase.from('crm_import_rows').select('fingerprint').eq('source_document_id', DOCUMENT_ID),
    'Не удалось проверить историю импорта',
  ) ?? []
  const knownFingerprints = new Set(knownRows.map(row => row.fingerprint))

  async function ensureClient({ type, name, phone, address, source, contactMethod, temperature, status, description, nextContact }) {
    const normalizedPhone = normalizePhone(phone)
    let found = clients.find(client => normalizedPhone && normalizePhone(client.phone) === normalizedPhone)
    if (!found && normalizeIdentityText(name) && normalizeAddress(address)) {
      const linkedProperty = properties.find(property => addressesLikelySame(property.address, address))
      const candidate = linkedProperty ? clients.find(client => client.id === linkedProperty.owner_id) : null
      if (candidate && normalizeIdentityText(`${candidate.first_name || ''}${candidate.last_name || ''}`) === normalizeIdentityText(name)) found = candidate
    }
    const parsedName = splitName(name)
    const payload = {
      type,
      first_name: parsedName.firstName,
      last_name: parsedName.lastName,
      phone: normalizedPhone || cleanText(phone) || `unknown-${Date.now()}`,
      source: cleanText(source) || null,
      contact_method: cleanText(contactMethod) || null,
      lead_temperature: temperature || null,
      status: cleanText(status) || null,
      description: cleanText(description) || null,
      next_contact_at: nextContact || null,
      roles: Array.from(new Set([...(found?.roles || []), type === 'buyer' ? 'buyer' : 'seller'])),
      updated_at: new Date().toISOString(),
    }

    if (found) {
      assertResult(await supabase.from('clients').update(payload).eq('id', found.id), `Не удалось обновить клиента ${payload.phone}`)
      Object.assign(found, payload)
      return found
    }

    const created = assertResult(
      await supabase.from('clients').insert({ ...payload, user_id: userId }).select('*').single(),
      `Не удалось создать клиента ${payload.phone}`,
    )
    clients.push(created)
    return created
  }

  async function ensureProperty({ client, address, propertyType, sourceUrl, area, floorText, price, description }) {
    const cleanAddress = cleanText(address)
    if (!cleanAddress) return null
    const found = properties.find(property => addressesLikelySame(property.address, cleanAddress))
    if (found) {
      if (!found.owner_id && client?.type === 'seller') {
        assertResult(await supabase.from('properties').update({ owner_id: client.id }).eq('id', found.id), `Не удалось связать объект ${cleanAddress}`)
        found.owner_id = client.id
      }
      return found
    }

    const floor = parseFloor(floorText)
    const created = assertResult(
      await supabase.from('properties').insert({
        user_id: userId,
        owner_id: client?.type === 'seller' ? client.id : null,
        address: cleanAddress,
        property_type: cleanText(propertyType) || null,
        source_url: cleanText(sourceUrl) || null,
        rooms: parseRooms(propertyType),
        area: parseNumber(area),
        floor: floor.floor,
        total_floors: floor.totalFloors,
        price: parseMoney(price),
        description: cleanText(description) || null,
        status: 'available',
        listing_type: 'sale',
      }).select('*').single(),
      `Не удалось создать объект ${cleanAddress}`,
    )
    properties.push(created)
    return created
  }

  for (const sheet of sheetData) {
    for (const row of sheet.rows) {
      const values = row.values
      const rowFingerprint = fingerprint(sheet.name, row.rowNumber, values)
      if (knownFingerprints.has(rowFingerprint)) {
        skippedRows += 1
        continue
      }

      let entityType = null
      let entityId = null

      if (sheet.kind === 'task') {
        const statusText = cleanText(values[7]).toLowerCase()
        const resultText = cleanText(values[19]).toLowerCase()
        const completed = /^(выполнено|готово|сделано)$/.test(statusText) || /^(выполнено|готово|сделано)$/.test(resultText)
        const inProgress = /в работе|процесс/.test(statusText)
        const priorityText = (values[6] || '').toLowerCase()
        const priority = priorityText.includes('выс') ? 'high' : priorityText.includes('низ') ? 'low' : 'medium'
        const externalKey = `google:${rowFingerprint}`
        const task = assertResult(
          await supabase.from('tasks').insert({
            user_id: userId,
            title: cleanText(values[2]) || 'Задача из Google Sheets',
            description: compact([values[3], values[8], values[5] ? `Время: ${values[5]}` : '']),
            category: cleanText(values[1]) || null,
            project: cleanText(values[1]) || null,
            due_date: parseDate(values[4]),
            priority,
            status: completed ? 'done' : inProgress ? 'inprogress' : 'todo',
            is_completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
            external_key: externalKey,
          }).select('id').single(),
          `Не удалось импортировать задачу из строки ${row.rowNumber}`,
        )
        entityType = 'task'
        entityId = task.id
      } else if (sheet.kind === 'meeting') {
        const client = await ensureClient({
          type: sheet.clientType,
          name: values[2],
          phone: values[3],
          address: values[4],
          source: values[7],
          contactMethod: 'Встреча',
          temperature: sheet.temperature,
          status: 'Встреча',
          description: values[11],
          nextContact: null,
        })
        const property = await ensureProperty({
          client,
          address: values[4],
          propertyType: '',
          sourceUrl: values[5],
          area: '',
          floorText: '',
          price: values[6],
          description: values[11],
        })
        const event = assertResult(
          await supabase.from('events').insert({
            user_id: userId,
            type: 'meeting',
            title: `Встреча: ${cleanText(values[2]) || cleanText(values[4]) || 'без названия'}`,
            event_date: parseDate(values[0]) || `${importYear}-01-01`,
            event_time: cleanText(values[1]) || null,
            location: cleanText(values[4]) || null,
            notes: compact([values[8], values[10], values[11]]),
            outcome: cleanText(values[9]) || null,
            related_client_id: client.id,
            related_client_type: 'owner',
            related_property_id: property?.id ?? null,
            external_key: `google:${rowFingerprint}`,
          }).select('id').single(),
          `Не удалось импортировать встречу из строки ${row.rowNumber}`,
        )
        assertResult(await supabase.from('crm_activities').insert({
          user_id: userId,
          client_id: client.id,
          property_id: property?.id ?? null,
          type: 'meeting',
          status: 'completed',
          title: `Встреча: ${cleanText(values[2]) || 'контакт'}`,
          occurred_at: toTimestamp(values[0], values[1]),
          outcome: cleanText(values[9]) || null,
          notes: compact([values[8], values[10], values[11]]),
          source: cleanText(values[7]) || 'Google Sheets',
          external_key: `google:${rowFingerprint}:activity`,
          metadata: { sheet: sheet.name, source_row: row.rowNumber },
        }), `Не удалось создать активность встречи из строки ${row.rowNumber}`)
        entityType = 'event'
        entityId = event.id
      } else {
        const client = await ensureClient({
          type: sheet.clientType,
          name: values[4],
          phone: values[5],
          address: values[6],
          source: values[2],
          contactMethod: values[3],
          temperature: sheet.temperature,
          status: values[1],
          description: compact([values[16], values[18]]),
          nextContact: toTimestamp(values[13]),
        })
        const property = sheet.clientType === 'seller'
          ? await ensureProperty({
              client,
              address: values[6],
              propertyType: values[7],
              sourceUrl: values[8],
              area: values[9],
              floorText: values[10],
              price: values[11],
              description: compact([values[15], values[16]]),
            })
          : null
        const method = (values[3] || '').toLowerCase()
        const activity = assertResult(
          await supabase.from('crm_activities').insert({
            user_id: userId,
            client_id: client.id,
            property_id: property?.id ?? null,
            type: method.includes('сообщ') ? 'message' : 'call',
            status: 'completed',
            title: `${method.includes('сообщ') ? 'Сообщение' : 'Звонок'}: ${cleanText(values[4]) || client.phone}`,
            occurred_at: toTimestamp(values[12] || values[0]),
            due_at: toTimestamp(values[13]),
            outcome: cleanText(values[15]) || null,
            notes: compact([values[16], values[17], values[18]]),
            source: cleanText(values[2]) || 'Google Sheets',
            external_key: `google:${rowFingerprint}`,
            metadata: { sheet: sheet.name, source_row: row.rowNumber, original: values },
          }).select('id').single(),
          `Не удалось импортировать касание из строки ${row.rowNumber}`,
        )
        if (sheet.clientType === 'buyer') {
          assertResult(await supabase.from('client_requirements').upsert({
            user_id: userId,
            client_id: client.id,
            purpose: 'sale',
            request_type: cleanText(values[1]) || null,
            property_type: cleanText(values[7]) || 'Квартира',
            price_max: parseMoney(values[11]),
            total_area_min: parseNumber(values[9]),
            rooms: parseRooms(values[7]) ? [parseRooms(values[7])] : [],
            locations: cleanText(values[6]) ? [cleanText(values[6])] : [],
            object_criteria: { source_link: cleanText(values[8]), excluded: cleanText(values[7]) },
            private_notes: compact([values[16], values[18]]),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'client_id,purpose' }), `Не удалось создать критерии покупателя из строки ${row.rowNumber}`)
        }
        entityType = 'activity'
        entityId = activity.id
      }

      assertResult(await supabase.from('crm_import_rows').insert({
        import_id: importId,
        user_id: userId,
        source_document_id: DOCUMENT_ID,
        sheet_name: sheet.name,
        source_row_number: row.rowNumber,
        fingerprint: rowFingerprint,
        entity_type: entityType,
        entity_id: entityId,
        raw_data: Object.fromEntries(sheet.headers.map((header, index) => [header || `column_${index + 1}`, values[index] || ''])),
      }), `Не удалось сохранить историю импорта для строки ${row.rowNumber}`)

      knownFingerprints.add(rowFingerprint)
      importedRows += 1
    }
  }

  assertResult(await supabase.from('crm_imports').update({
    status: 'completed',
    imported_rows: importedRows,
    skipped_rows: skippedRows,
    finished_at: new Date().toISOString(),
  }).eq('id', importId), 'Не удалось завершить запуск импорта')

  console.log(`Импорт завершён: добавлено ${importedRows}, пропущено ${skippedRows}.`)
} catch (error) {
  await supabase.from('crm_imports').update({
    status: 'failed',
    imported_rows: importedRows,
    skipped_rows: skippedRows,
    error_message: String(error.message || error),
    finished_at: new Date().toISOString(),
  }).eq('id', importId)
  throw error
} finally {
  if (!serviceRoleKey) await supabase.auth.signOut()
}
