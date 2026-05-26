import { useEffect, useState } from 'react'
import { authHeaders, getAccessToken } from '../../lib/auth'
import styles from './ChildManagePage.module.css'

function sortStudentsForManage(list) {
  const rank = (status) => {
    if (status === 'ACTIVE') return 0
    if (status === 'GRADUATED') return 1
    return 2
  }
  return [...list].sort((a, b) => {
    const statusOrder = rank(a.status) - rank(b.status)
    if (statusOrder !== 0) return statusOrder
    return (b.studentId ?? 0) - (a.studentId ?? 0)
  })
}

function ChildManagePage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [graduatingId, setGraduatingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadStudents() {
      setErrorMessage('')
      setLoading(true)
      try {
        if (!getAccessToken()) {
          throw new Error('로그인 후 이용해 주세요.')
        }
        const response = await fetch('/api/students', {
          headers: authHeaders(),
        })
        const data = await response.json().catch(() => [])
        if (!response.ok) {
          const message = data?.message || '아이 목록을 불러오지 못했습니다.'
          throw new Error(message)
        }
        if (!cancelled) {
          setStudents(sortStudentsForManage(Array.isArray(data) ? data : []))
        }
      } catch (error) {
        if (!cancelled) {
          setStudents([])
          setErrorMessage(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStudents()
    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (studentId, studentName) => {
    const ok = window.confirm(`${studentName} 아이 정보를 삭제할까요?`)
    if (!ok) {
      return
    }

    setErrorMessage('')
    setDeletingId(studentId)
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || '아이 삭제에 실패했습니다.')
      }
      setStudents((prev) => prev.filter((student) => student.studentId !== studentId))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleGraduate = async (studentId, studentName) => {
    const ok = window.confirm(`${studentName} 아이를 졸업 처리할까요?`)
    if (!ok) {
      return
    }

    setErrorMessage('')
    setGraduatingId(studentId)
    try {
      const response = await fetch(`/api/students/${studentId}/graduate`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || '졸업 처리에 실패했습니다.')
      }
      setStudents((prev) =>
        sortStudentsForManage(
          prev.map((student) =>
            student.studentId === studentId
              ? { ...student, status: data.status, graduatedAt: data.graduatedAt }
              : student,
          ),
        ),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setGraduatingId(null)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h2>아이관리</h2>
        <p>등록된 아이 정보를 확인할 수 있습니다.</p>
      </div>

      {loading ? <p className={styles.infoMessage}>불러오는 중…</p> : null}
      {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}

      {!loading && !errorMessage && students.length === 0 ? (
        <p className={styles.infoMessage}>등록된 아이가 없습니다.</p>
      ) : null}

      {!loading && !errorMessage && students.length > 0 ? (
        <ul className={styles.list}>
          {students.map((student) => (
            <li key={student.studentId} className={styles.item}>
              <div className={styles.profileRing}>
                {student.profileImageUrl ? (
                  <img src={student.profileImageUrl} alt={`${student.name} 프로필`} className={styles.profileImage} />
                ) : (
                  <div className={styles.profileFallback} aria-hidden>
                    {String(student.name || '?').slice(0, 1)}
                  </div>
                )}
              </div>
              <div className={styles.meta}>
                <div className={styles.nameRow}>
                  <p className={styles.name}>{student.name}</p>
                  {student.status === 'GRADUATED' ? <span className={styles.badge}>졸업</span> : null}
                </div>
                <p className={styles.birth}>생년월일: {student.birthDate || '-'}</p>
                <div className={styles.actions}>
                  {student.status !== 'GRADUATED' ? (
                    <button
                      type="button"
                      className={styles.graduateButton}
                      onClick={() => handleGraduate(student.studentId, student.name)}
                      disabled={graduatingId === student.studentId}
                    >
                      {graduatingId === student.studentId ? '처리 중…' : '졸업 처리'}
                    </button>
                  ) : (
                    <button type="button" className={styles.graduateDoneButton} disabled>
                      졸업 완료
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(student.studentId, student.name)}
                    disabled={deletingId === student.studentId}
                  >
                    {deletingId === student.studentId ? '삭제 중…' : '삭제'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default ChildManagePage
