import { Owner, Property, Buyer, Comment, Task, Meeting, Call } from '../types'

export const mockOwners: Owner[] = [
  {
    id: '1',
    firstName: 'Иван',
    lastName: 'Смирнов',
    middleName: 'Петрович',
    photo: '',
    phone: '+7 (926) 123-45-67',
    additionalPhones: [],
    email: 'ivan.smirnov@mail.ru',
    telegram: '@ivan_smirnov',
    whatsapp: '',
    address: 'Москва, ул. Ленина, 15',
    passportData: '',
    comment: '',
    source: '',
    status: 'active',
    tags: ['постоянный клиент', 'квартира'],
    isFavorite: false,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20'
  },
  {
    id: '2',
    firstName: 'Мария',
    lastName: 'Кузнецова',
    middleName: '',
    photo: '',
    phone: '+7 (916) 987-65-43',
    additionalPhones: [],
    email: '',
    telegram: '',
    whatsapp: '',
    address: '',
    passportData: '',
    comment: '',
    source: '',
    status: 'active',
    tags: ['дом'],
    isFavorite: false,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-05'
  }
]

export const mockProperties: Property[] = [
  {
    id: '1',
    address: 'Москва, ул. Пушкина, 23, кв. 45',
    price: 8500000,
    rooms: 2,
    area: 52,
    floor: 5,
    totalFloors: 9,
    status: 'available',
    ownerId: '1',
    tags: ['центр', 'метро'],
    isFavorite: true,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-25'
  },
  {
    id: '2',
    address: 'Москва, ул. Ленина, 15, кв. 78',
    price: 12300000,
    rooms: 3,
    area: 75,
    floor: 8,
    totalFloors: 12,
    status: 'reserved',
    ownerId: '',
    tags: ['новостройка'],
    isFavorite: false,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-10'
  }
]

export const mockBuyers: Buyer[] = [
  {
    id: '1',
    firstName: 'Александр',
    lastName: 'Васильев',
    phone: '+7 (903) 456-78-90',
    email: 'alex.vasiliev@yandex.ru',
    budget: 10000000,
    rooms: 2,
    districts: ['Центральный', 'Северный'],
    mortgage: true,
    tags: ['ипотека одобрена'],
    isFavorite: true,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-25'
  }
]

export const mockComments: Comment[] = [
  {
    id: '1',
    entityType: 'owner',
    entityId: '1',
    content: 'Очень общительный клиент, готов к показам в любое время.',
    createdAt: '2024-01-20 14:30',
    author: 'Даниил Петров'
  }
]

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Позвонить Ивану Смирнову',
    description: 'Уточнить детали по квартире',
    status: 'todo',
    priority: 'high',
    dueDate: '2024-06-30',
    isFavorite: false,
    createdAt: '2024-06-28'
  },
  {
    id: '2',
    title: 'Подготовить документы для показа',
    description: '',
    status: 'inprogress',
    priority: 'medium',
    dueDate: '',
    isFavorite: false,
    createdAt: '2024-06-27'
  }
]

export const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Показ квартиры Александру',
    date: '2024-06-30',
    time: '14:00',
    type: 'showing',
    location: 'Москва, ул. Пушкина, 23',
    notes: 'Взять паспорт',
    isFavorite: false,
    createdAt: '2024-06-28',
    relatedClientId: '1',
    relatedClientType: 'buyer',
    relatedPropertyId: '1'
  }
]

export const mockCalls: Call[] = [
  {
    id: '1',
    title: 'Холодный звонок потенциальному покупателю',
    date: '2024-06-29',
    time: '10:00',
    type: 'call',
    notes: 'Обговорить условия ипотеки',
    isFavorite: false,
    createdAt: '2024-06-29',
    relatedClientId: '1',
    relatedClientType: 'buyer'
  }
]
