import { useEffect, useMemo, useState } from 'react'
import { authHeaders, getAccessToken } from '../../lib/auth'
import { formatDiaryDate, toDateInputValue } from '../../lib/journalDateUtils'
import { uploadImageFile } from '../../lib/fileUpload'
import JournalCalendar from './JournalCalendar'
import styles from './JournalPage.module.css'

function emptyEntry() {
  return { photoUrl: '', memo: '', sortOrder: 0 }
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [emptyEntry()]
  }
  return entries.map((entry, index) => ({
    photoUrl: entry?.photoUrl ?? '',
    memo: entry?.memo ?? '',
    sortOrder: entry?.sortOrder ?? index,
  }))
}

function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()))
  const [items, setItems] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [entries, setEntries] = useState([emptyEntry()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const selectedItem = useMemo(
    () => items.find((item) => item.studentId === selectedStudentId) ?? null,
    [items, selectedStudentId],
  )

  const hydrateEditorState = (item) => {
    setEntries(normalizeEntries(item?.entries))
  }

  useEffect(() => {
    let cancelled = false
    async function fetchItems() {
      setLoading(true)
      setErrorMessage('')
      setMessage('')
      try {
        if (!getAccessToken()) {
          throw new Error('로그인 후 이용해 주세요.')
        }
        const response = await fetch(`/api/journals?date=${encodeURIComponent(selectedDate)}`, {
          headers: authHeaders(),
        })
        const data = await response.json().catch(() => [])
        if (!response.ok) {
          throw new Error(data?.message || '일지 데이터를 불러오지 못했습니다.')
        }
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setItems(list)
        const nextId = list[0]?.studentId ?? null
        setSelectedStudentId(nextId)
        hydrateEditorState(list.find((x) => x.studentId === nextId) ?? null)
      } catch (error) {
        if (!cancelled) {
          setItems([])
          setSelectedStudentId(null)
          hydrateEditorState(null)
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

  const handleSave = async () => {
    if (!selectedItem) return
    setSaving(true)
    setErrorMessage('')
    setMessage('')
    try {
      const payloadEntries = entries
        .map((entry, index) => ({
          photoUrl: entry.photoUrl?.trim() || null,
          memo: entry.memo?.trim() || null,
          sortOrder: index,
        }))
        .filter((entry) => entry.photoUrl || entry.memo)

      const response = await fetch('/api/journals', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          studentId: selectedItem.studentId,
          targetDate: selectedDate,
          entries: payloadEntries,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || '일지 저장에 실패했습니다.')
      }
      setItems((prev) =>
        prev.map((item) => (item.studentId === data.studentId ? { ...item, ...data } : item)),
      )
      hydrateEditorState(data)
      setMessage('일지를 저장했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (index, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingIndex(index)
    setErrorMessage('')
    try {
      const url = await uploadImageFile(file, 'journal')
      setEntries((prev) =>
        prev.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, photoUrl: url } : entry,
        ),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '사진을 불러오지 못했습니다.')
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, { ...emptyEntry(), sortOrder: prev.length }])
  }

  const handleRemoveEntry = (index) => {
    setEntries((prev) => {
      if (prev.length <= 1) {
        return [emptyEntry()]
      }
      return prev.filter((_, entryIndex) => entryIndex !== index)
    })
  }

  return (
    <section className={styles.page}>
      <JournalCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className={styles.contentPane}>
        <div className={styles.listWrap}>
          <h3>등록 아이</h3>
          {loading ? <p className={styles.info}>불러오는 중…</p> : null}
          {!loading && items.length === 0 ? <p className={styles.info}>등록된 아이가 없습니다.</p> : null}
          <ul className={styles.studentList}>
            {items.map((item) => (
              <li key={item.studentId}>
                <button
                  type="button"
                  className={`${styles.studentButton} ${selectedStudentId === item.studentId ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedStudentId(item.studentId)
                    hydrateEditorState(item)
                  }}
                >
                  <span className={styles.studentName}>{item.studentName}</span>
                  <span className={styles.studentBirth}>{item.birthDate ?? '-'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.editorWrap}>
          <h3>일지 작성</h3>
          {selectedItem ? (
            <>
              <p className={styles.targetText}>
                <strong>{selectedItem.studentName}</strong> · {formatDiaryDate(selectedDate)}
              </p>
              <div className={styles.diaryBook}>
                {entries.map((entry, index) => (
                  <article key={`entry-${index}`} className={styles.diaryEntry}>
                    <div className={styles.diaryPhotoArea}>
                      {entry.photoUrl ? (
                        <img src={entry.photoUrl} alt={`일지 사진 ${index + 1}`} className={styles.diaryPhoto} />
                      ) : (
                        <div className={styles.diaryPhotoPlaceholder}>사진을 올려 주세요</div>
                      )}
                      <label className={styles.photoUploadBtn}>
                        {uploadingIndex === index ? '업로드 중…' : entry.photoUrl ? '사진 변경' : '사진 올리기'}
                        <input
                          className={styles.hiddenInput}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingIndex !== null}
                          onChange={(event) => handlePhotoChange(index, event)}
                        />
                      </label>
                    </div>
                    <label className={styles.diaryMemoField}>
                      <span>메모</span>
                      <textarea
                        value={entry.memo}
                        onChange={(event) =>
                          setEntries((prev) =>
                            prev.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, memo: event.target.value } : row,
                            ),
                          )
                        }
                        rows={3}
                        placeholder="오늘 있었던 일을 적어 주세요"
                      />
                    </label>
                    {entries.length > 1 ? (
                      <button
                        type="button"
                        className={styles.removeEntryBtn}
                        onClick={() => handleRemoveEntry(index)}
                      >
                        이 항목 삭제
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className={styles.diaryActions}>
                <button type="button" className={styles.addEntryBtn} onClick={handleAddEntry}>
                  + 사진·메모 추가
                </button>
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? '저장 중…' : '일지 저장'}
                </button>
              </div>
            </>
          ) : (
            <p className={styles.info}>아이를 선택해 주세요.</p>
          )}
          {message ? <p className={styles.success}>{message}</p> : null}
          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  )
}

export default JournalPage
