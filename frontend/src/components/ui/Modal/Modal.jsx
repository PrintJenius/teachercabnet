import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  closeDisabled = false,
  dialogLabel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !closeDisabled) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, closeDisabled])

  if (!open) {
    return null
  }

  const handleBackdropClick = () => {
    if (!closeDisabled) {
      onClose()
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={handleBackdropClick} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id={dialogLabel} className={styles.title}>
              {title}
            </h2>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
