import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Owner, Property, Buyer, Task, Meeting, Call, Comment, Deal, Folder, GalleryItem, Document, User, Note, Goal } from '../types'

interface AppState {
  // Сущности - ПУСТЫЕ ИЗ КОРОБКИ
  owners: Owner[]
  properties: Property[]
  buyers: Buyer[]
  tasks: Task[]
  meetings: Meeting[]
  calls: Call[]
  comments: Comment[]
  deals: Deal[]
  folders: Folder[]
  galleryItems: GalleryItem[]
  documents: Document[]
  goals: Goal[]
  user: User
  isAuthenticated: boolean

  // OWNERS
  addOwner: (owner: Omit<Owner, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'notes'>) => void
  updateOwner: (id: string, data: Partial<Owner>) => void
  deleteOwner: (id: string) => void
  addOwnerPhoto: (ownerId: string, photo: Omit<GalleryItem, 'id' | 'createdAt'>) => void
  addOwnerDocument: (ownerId: string, doc: Omit<Document, 'id' | 'createdAt'>) => void
  addOwnerNote: (ownerId: string, note: Omit<Note, 'id' | 'createdAt'>) => void

  // PROPERTIES
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'notes'>) => void
  updateProperty: (id: string, data: Partial<Property>) => void
  deleteProperty: (id: string) => void
  addPropertyPhoto: (propertyId: string, photo: Omit<GalleryItem, 'id' | 'createdAt'>) => void
  addPropertyDocument: (propertyId: string, doc: Omit<Document, 'id' | 'createdAt'>) => void
  addPropertyNote: (propertyId: string, note: Omit<Note, 'id' | 'createdAt'>) => void
  deletePropertyPhoto: (propertyId: string, photoId: string) => void
  deletePropertyDocument: (propertyId: string, docId: string) => void
  deletePropertyNote: (propertyId: string, noteId: string) => void

  // BUYERS
  addBuyer: (buyer: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'notes'>) => void
  updateBuyer: (id: string, data: Partial<Buyer>) => void
  deleteBuyer: (id: string) => void
  addBuyerPhoto: (buyerId: string, photo: Omit<GalleryItem, 'id' | 'createdAt'>) => void
  addBuyerDocument: (buyerId: string, doc: Omit<Document, 'id' | 'createdAt'>) => void
  addBuyerNote: (buyerId: string, note: Omit<Note, 'id' | 'createdAt'>) => void

  // TASKS
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void
  updateTask: (id: string, data: Partial<Task>) => void
  deleteTask: (id: string) => void

  // MEETINGS
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => void
  updateMeeting: (id: string, data: Partial<Meeting>) => void
  deleteMeeting: (id: string) => void

  // CALLS
  addCall: (call: Omit<Call, 'id' | 'createdAt'>) => void
  updateCall: (id: string, data: Partial<Call>) => void
  deleteCall: (id: string) => void

  // DEALS
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateDeal: (id: string, data: Partial<Deal>) => void
  deleteDeal: (id: string) => void

  // COMMENTS
  addComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => void
  updateComment: (id: string, data: Partial<Comment>) => void
  deleteComment: (id: string) => void

  // FOLDERS
  addFolder: (folder: Omit<Folder, 'id' | 'createdAt'>) => void
  updateFolder: (id: string, data: Partial<Folder>) => void
  deleteFolder: (id: string) => void

  // GALLERY ITEMS (Глобальные - для общей галереи)
  addGalleryItem: (item: Omit<GalleryItem, 'id' | 'createdAt'>) => void
  updateGalleryItem: (id: string, data: Partial<GalleryItem>) => void
  deleteGalleryItem: (id: string) => void

  // DOCUMENTS (Глобальные - для общего файлового менеджера)
  addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void
  updateDocument: (id: string, data: Partial<Document>) => void
  deleteDocument: (id: string) => void

  // GOALS
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted'>) => void
  updateGoal: (id: string, data: Partial<Goal>) => void
  deleteGoal: (id: string) => void

  // USER
  updateUser: (data: Partial<User>) => void
  setAuthenticated: (value: boolean) => void
}

// Начальный пользователь (но пустой стейт для данных)
const initialUser: User = {
  id: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  position: 'Риэлтор',
  darkMode: false,
  notifications: true,
  meetingReminders: true
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Начальное состояние - ВСЕ ПУСТО
      owners: [],
      properties: [],
      buyers: [],
      tasks: [],
      meetings: [],
      calls: [],
      comments: [],
      deals: [],
      folders: [],
      galleryItems: [],
      documents: [],
      goals: [],
      user: initialUser,
      isAuthenticated: false,

      // ===== OWNERS =====
      addOwner: (owner) => set((state) => ({
        owners: [...state.owners, {
          ...owner,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
          documents: [],
          notes: []
        }]
      })),
      updateOwner: (id, data) => set((state) => ({
        owners: state.owners.map((owner) =>
          owner.id === id ? { ...owner, ...data, updatedAt: new Date().toISOString() } : owner
        )
      })),
      deleteOwner: (id) => set((state) => ({
        owners: state.owners.filter((owner) => owner.id !== id)
      })),
      addOwnerPhoto: (ownerId, photo) => set((state) => ({
        owners: state.owners.map((owner) =>
          owner.id === ownerId
            ? {
                ...owner,
                photos: [...(owner.photos || []), {
                  ...photo,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  ownerId
                }],
                updatedAt: new Date().toISOString()
              }
            : owner
        )
      })),
      addOwnerDocument: (ownerId, doc) => set((state) => ({
        owners: state.owners.map((owner) =>
          owner.id === ownerId
            ? {
                ...owner,
                documents: [...(owner.documents || []), {
                  ...doc,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  ownerId
                }],
                updatedAt: new Date().toISOString()
              }
            : owner
        )
      })),
      addOwnerNote: (ownerId, note) => set((state) => ({
        owners: state.owners.map((owner) =>
          owner.id === ownerId
            ? {
                ...owner,
                notes: [...(owner.notes || []), {
                  ...note,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString()
                }],
                updatedAt: new Date().toISOString()
              }
            : owner
        )
      })),

      // ===== PROPERTIES =====
      addProperty: (property) => set((state) => ({
        properties: [...state.properties, {
          ...property,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
          documents: [],
          notes: []
        }]
      })),
      updateProperty: (id, data) => set((state) => ({
        properties: state.properties.map((property) =>
          property.id === id ? { ...property, ...data, updatedAt: new Date().toISOString() } : property
        )
      })),
      deleteProperty: (id) => set((state) => ({
        properties: state.properties.filter((property) => property.id !== id)
      })),
      addPropertyPhoto: (propertyId, photo) => set((state) => ({
        properties: state.properties.map((prop) =>
          prop.id === propertyId
            ? {
                ...prop,
                photos: [...(prop.photos || []), {
                  ...photo,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  propertyId
                }],
                updatedAt: new Date().toISOString()
              }
            : prop
        )
      })),
      addPropertyDocument: (propertyId, doc) => set((state) => ({
        properties: state.properties.map((prop) =>
          prop.id === propertyId
            ? {
                ...prop,
                documents: [...(prop.documents || []), {
                  ...doc,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  propertyId
                }],
                updatedAt: new Date().toISOString()
              }
            : prop
        )
      })),
      addPropertyNote: (propertyId, note) => set((state) => ({
        properties: state.properties.map((prop) =>
          prop.id === propertyId
            ? {
                ...prop,
                notes: [...(prop.notes || []), {
                  ...note,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString()
                }],
                updatedAt: new Date().toISOString()
              }
            : prop
        )
      })),
      deletePropertyPhoto: (propertyId, photoId) => set((state) => ({
        properties: state.properties.map((prop) =>
          prop.id === propertyId
            ? {
                ...prop,
                photos: (prop.photos || []).filter((p) => p.id !== photoId),
                updatedAt: new Date().toISOString()
              }
            : prop
        )
      })),
      deletePropertyDocument: (propertyId, docId) => set((state) => ({
        properties: state.properties.map((prop) =>
          prop.id === propertyId
            ? {
                ...prop,
                documents: (prop.documents || []).filter((d) => d.id !== docId),
                updatedAt: new Date().toISOString()
              }
            : prop
        )
      })),
      deletePropertyNote: (propertyId, noteId) => set((state) => ({
        properties: state.properties.map((prop) =>
          prop.id === propertyId
            ? {
                ...prop,
                notes: (prop.notes || []).filter((n) => n.id !== noteId),
                updatedAt: new Date().toISOString()
              }
            : prop
        )
      })),

      // ===== BUYERS =====
      addBuyer: (buyer) => set((state) => ({
        buyers: [...state.buyers, {
          ...buyer,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
          documents: [],
          notes: []
        }]
      })),
      updateBuyer: (id, data) => set((state) => ({
        buyers: state.buyers.map((buyer) =>
          buyer.id === id ? { ...buyer, ...data, updatedAt: new Date().toISOString() } : buyer
        )
      })),
      deleteBuyer: (id) => set((state) => ({
        buyers: state.buyers.filter((buyer) => buyer.id !== id)
      })),
      addBuyerPhoto: (buyerId, photo) => set((state) => ({
        buyers: state.buyers.map((buyer) =>
          buyer.id === buyerId
            ? {
                ...buyer,
                photos: [...(buyer.photos || []), {
                  ...photo,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  buyerId
                }],
                updatedAt: new Date().toISOString()
              }
            : buyer
        )
      })),
      addBuyerDocument: (buyerId, doc) => set((state) => ({
        buyers: state.buyers.map((buyer) =>
          buyer.id === buyerId
            ? {
                ...buyer,
                documents: [...(buyer.documents || []), {
                  ...doc,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  buyerId
                }],
                updatedAt: new Date().toISOString()
              }
            : buyer
        )
      })),
      addBuyerNote: (buyerId, note) => set((state) => ({
        buyers: state.buyers.map((buyer) =>
          buyer.id === buyerId
            ? {
                ...buyer,
                notes: [...(buyer.notes || []), {
                  ...note,
                  id: Date.now().toString(),
                  createdAt: new Date().toISOString()
                }],
                updatedAt: new Date().toISOString()
              }
            : buyer
        )
      })),

      // ===== TASKS =====
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, { ...task, id: Date.now().toString(), createdAt: new Date().toISOString(), isCompleted: false }]
      })),
      updateTask: (id, data) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === id ? { ...task, ...data } : task)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id)
      })),

      // ===== MEETINGS =====
      addMeeting: (meeting) => set((state) => ({
        meetings: [...state.meetings, { ...meeting, id: Date.now().toString(), createdAt: new Date().toISOString(), isCompleted: false }]
      })),
      updateMeeting: (id, data) => set((state) => ({
        meetings: state.meetings.map((meeting) => meeting.id === id ? { ...meeting, ...data } : meeting)
      })),
      deleteMeeting: (id) => set((state) => ({
        meetings: state.meetings.filter((meeting) => meeting.id !== id)
      })),

      // ===== CALLS =====
      addCall: (call) => set((state) => ({
        calls: [...state.calls, { ...call, id: Date.now().toString(), createdAt: new Date().toISOString(), isCompleted: false }]
      })),
      updateCall: (id, data) => set((state) => ({
        calls: state.calls.map((c) => c.id === id ? { ...c, ...data } : c)
      })),
      deleteCall: (id) => set((state) => ({
        calls: state.calls.filter((c) => c.id !== id)
      })),

      // ===== DEALS =====
      addDeal: (deal) => set((state) => ({
        deals: [...state.deals, { ...deal, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),
      updateDeal: (id, data) => set((state) => ({
        deals: state.deals.map((deal) =>
          deal.id === id ? { ...deal, ...data, updatedAt: new Date().toISOString() } : deal
        )
      })),
      deleteDeal: (id) => set((state) => ({
        deals: state.deals.filter((deal) => deal.id !== id)
      })),

      // ===== COMMENTS =====
      addComment: (comment) => set((state) => ({
        comments: [...state.comments, { ...comment, id: Date.now().toString(), createdAt: new Date().toISOString() }]
      })),
      updateComment: (id, data) => set((state) => ({
        comments: state.comments.map((c) => c.id === id ? { ...c, ...data } : c)
      })),
      deleteComment: (id) => set((state) => ({
        comments: state.comments.filter((c) => c.id !== id)
      })),

      // ===== FOLDERS =====
      addFolder: (folder) => set((state) => ({
        folders: [...state.folders, { ...folder, id: Date.now().toString(), createdAt: new Date().toISOString() }]
      })),
      updateFolder: (id, data) => set((state) => ({
        folders: state.folders.map((f) => f.id === id ? { ...f, ...data } : f)
      })),
      deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter((f) => f.id !== id)
      })),

      // ===== GALLERY ITEMS =====
      addGalleryItem: (item) => set((state) => ({
        galleryItems: [...state.galleryItems, { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() }]
      })),
      updateGalleryItem: (id, data) => set((state) => ({
        galleryItems: state.galleryItems.map((item) => item.id === id ? { ...item, ...data } : item)
      })),
      deleteGalleryItem: (id) => set((state) => ({
        galleryItems: state.galleryItems.filter((item) => item.id !== id)
      })),

      // ===== DOCUMENTS =====
      addDocument: (doc) => set((state) => ({
        documents: [...state.documents, { ...doc, id: Date.now().toString(), createdAt: new Date().toISOString() }]
      })),
      updateDocument: (id, data) => set((state) => ({
        documents: state.documents.map((d) => d.id === id ? { ...d, ...data } : d)
      })),
      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter((d) => d.id !== id)
      })),

      // ===== GOALS =====
      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, {
          ...goal,
          isCompleted: false,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      })),
      updateGoal: (id, data) => set((state) => ({
        goals: state.goals.map((goal) =>
          goal.id === id ? { ...goal, ...data, updatedAt: new Date().toISOString() } : goal
        )
      })),
      deleteGoal: (id) => set((state) => ({
        goals: state.goals.filter((goal) => goal.id !== id)
      })),

      // ===== USER =====
      updateUser: (data) => set((state) => ({
        user: { ...state.user, ...data }
      })),

      setAuthenticated: (value) => set({ isAuthenticated: value })
    }),
    {
      name: 'lumi-crm-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
