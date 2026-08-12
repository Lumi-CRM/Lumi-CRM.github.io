import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/50 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="lumi-panel lumi-text flex max-h-[96dvh] w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:mx-4 sm:max-h-[90vh] sm:rounded-2xl"
          >
            <div className="lumi-border flex items-center justify-between border-b px-4 py-4 sm:px-8 sm:py-6">
              {title && <h2 className="lumi-text min-w-0 pr-3 text-xl font-bold sm:text-2xl">{title}</h2>}
              <button
                onClick={onClose}
                className="lumi-control p-2 rounded-xl transition-colors"
                aria-label="Закрыть окно"
              >
                <X className="lumi-muted w-6 h-6" />
              </button>
            </div>
            <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal
