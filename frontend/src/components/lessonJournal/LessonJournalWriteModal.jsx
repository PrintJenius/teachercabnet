import { useEffect, useId, useState } from 'react'
import { LESSON_DOMAIN_VALUES, isValidLessonDomain } from '../../constants/lessonJournalDomains'
import { saveManualLessonEntry } from '../../lib/lessonJournal'
import Modal from '../ui/Modal/Modal'
import styles from './LessonJournalWriteModal.module.css'

export default function LessonJournalWriteModal({ open, targetDate, onClose, onSaved }) {
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('')
  const [phase, setPhase] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setDomain('')
      setMessage('')
      setPhase('idle')
    }
  }, [open])

  const loading = phase === 'loading'
  const closeDisabled = loading

  const handleClose = () => {
    if (loading) {
      return
    }
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setMessage('수업·활동 이름을 입력해 주세요.')
      setPhase('error')
      return
    }
    if (!isValidLessonDomain(domain)) {
      setMessage('누리과정 영역을 선택해 주세요.')
      setPhase('error')
      return
    }
    setPhase('loading')
    setMessage('')
    try {
      await saveManualLessonEntry({
        targetDate,
        title: trimmedTitle,
        description,
        domain,
      })
      onSaved()
      onClose()
    } catch (err) {
      setPhase('error')
      setMessage(err.message || '저장에 실패했습니다.')
    }
  }

  return (
    <Modal
      open={open}
      title="수업일지 작성"
      subtitle={`${targetDate}에 저장됩니다`}
      onClose={handleClose}
      closeDisabled={closeDisabled}
      dialogLabel={titleId}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>수업·활동 이름</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 가을 낙엽 관찰 놀이"
            maxLength={500}
            disabled={loading}
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span>
            누리과정 영역 <span className={styles.requiredMark}>*</span>
          </span>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} disabled={loading} required>
            <option value="">영역을 선택해 주세요</option>
            {LESSON_DOMAIN_VALUES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>수업 내용·메모 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="아이들 반응, 준비물, 진행 순서 등"
            rows={4}
            disabled={loading}
          />
        </label>
        {message ? (
          <p className={phase === 'error' ? styles.messageError : styles.message} role="alert">
            {message}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={loading}>
            취소
          </button>
          <button type="submit" className={styles.saveBtn} disabled={loading}>
            {loading ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
