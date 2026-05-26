import { useEffect, useMemo, useState } from 'react'
import { authHeaders, getAccessToken } from '../../lib/auth'
import { formatDiaryDate, toDateInputValue } from '../../lib/journalDateUtils'
import JournalCalendar from './JournalCalendar'
import styles from './JournalPage.module.css'

function sortForView(items) {
  const rank = (status) => {
    if (status === 'ACTIVE') return 0
    if (status === 'GRADUATED') return 1
    return 2
  }
  return [...items].sort((a, b) => {
    const r = rank(a.status) - rank(b.status)
    if (r !== 0) return r
    return (b.studentId ?? 0) - (a.studentId ?? 0)
  })
}

function JournalViewPage() {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()))
  const [items, setItems] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedItem = useMemo(
    () => items.find((item) => item.studentId === selectedStudentId) ?? null,
    [items, selectedStudentId],
  )
  const entries = selectedItem?.entries ?? []

  useEffect(() => {
    let cancelled = false
    async function fetchItems() {
      setLoading(true)
      setErrorMessage('')
      try {
        if (!getAccessToken()) {
          throw new Error('로그인 후 이용해 주세요.')
        }
        const response = await fetch(`/api/journals/view?date=${encodeURIComponent(selectedDate)}`, {
          headers: authHeaders(),
        })
        const data = await response.json().catch(() => [])
        if (!response.ok) {
          throw new Error(data?.message || '일지 데이터를 불러오지 못했습니다.')
        }
        if (cancelled) return
        const list = sortForView(Array.isArray(data) ? data : [])
        setItems(list)
        setSelectedStudentId((prev) =>
          prev && list.some((x) => x.studentId === prev) ? prev : list[0]?.studentId ?? null,
        )
      } catch (error) {
        if (!cancelled) {
          setItems([])
          setSelectedStudentId(null)
          setErrorMessage(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchItems()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  return (
    <section className={styles.page}>
      <JournalCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className={styles.contentPane}>
        <div className={styles.listWrap}>
          <h3>아이 목록</h3>
          {loading ? <p className={styles.info}>불러오는 중…</p> : null}
          {!loading && items.length === 0 ? <p className={styles.info}>등록된 아이가 없습니다.</p> : null}
          <ul className={styles.studentList}>
            {items.map((item) => (
              <li key={item.studentId}>
                <button
                  type="button"
                  className={`${styles.studentButton} ${selectedStudentId === item.studentId ? styles.active : ''}`}
                  onClick={() => setSelectedStudentId(item.studentId)}
                >
                  <span className={styles.studentName}>
                    {item.studentName}
                    {item.status === 'GRADUATED' ? ' (졸업)' : ''}
                  </span>
                  <span className={styles.studentBirth}>{item.birthDate ?? '-'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.editorWrap}>
          <h3>일지 보기</h3>
          {selectedItem ? (
            <>
              <p className={styles.targetText}>
                <strong>{selectedItem.studentName}</strong>
                {selectedItem.status === 'GRADUATED' ? ' (졸업)' : ''} · {formatDiaryDate(selectedDate)}
              </p>
              {entries.length === 0 ? (
                <p className={styles.info}>이 날짜에 작성된 일지가 없습니다.</p>
              ) : (
                <div className={`${styles.diaryBook} ${styles.diaryBookReadonly}`}>
                  {entries.map((entry, index) => (
                    <article key={`view-entry-${index}`} className={styles.diaryEntry}>
                      <div className={styles.diaryPhotoArea}>
                        {entry.photoUrl ? (
                          <img
                            src={entry.photoUrl}
                            alt={`일지 사진 ${index + 1}`}
                            className={styles.diaryPhoto}
                          />
                        ) : (
                          <div className={styles.diaryPhotoPlaceholder}>사진 없음</div>
                        )}
                      </div>
                      <div className={styles.diaryMemoReadonly}>
                        <span>메모</span>
                        <p>{entry.memo?.trim() ? entry.memo : '메모가 없습니다.'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className={styles.info}>아이를 선택해 주세요.</p>
          )}
          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  )
}

export default JournalViewPage
