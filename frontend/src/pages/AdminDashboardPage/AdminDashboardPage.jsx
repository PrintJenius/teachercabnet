import { useEffect, useState } from 'react'
import { createAdminTeacher, fetchAdminDashboard, fetchAdminTeachers } from '../../lib/admin'
import styles from './AdminDashboardPage.module.css'

function formatDateTime(iso) {
  if (!iso) {
    return '-'
  }
  try {
    return new Date(iso).toLocaleString('ko-KR')
  } catch {
    return iso
  }
}

function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [grantAdmin, setGrantAdmin] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState('')
  const [createError, setCreateError] = useState('')

  const loadTeachers = async () => {
    const list = await fetchAdminTeachers()
    setTeachers(list)
  }

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    setError('')
    Promise.all([fetchAdminDashboard(), fetchAdminTeachers()])
      .then(([dashboard, teacherList]) => {
        if (!cancelled) {
          setData(dashboard)
          setTeachers(teacherList)
          setPhase('done')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPhase('error')
          setError(err.message || '대시보드를 불러오지 못했습니다.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreateTeacher = async (event) => {
    event.preventDefault()
    setCreateMessage('')
    setCreateError('')
    setCreating(true)
    try {
      await createAdminTeacher({
        loginId: loginId.trim(),
        password,
        nickname: nickname.trim(),
        admin: grantAdmin,
      })
      setLoginId('')
      setPassword('')
      setNickname('')
      setGrantAdmin(false)
      await loadTeachers()
      setCreateMessage('사용자 계정을 만들었습니다.')
    } catch (err) {
      setCreateError(err.message || '계정 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  if (phase === 'loading') {
    return <p className={styles.loading}>운영 데이터를 불러오는 중…</p>
  }

  if (phase === 'error') {
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <p className={styles.muted}>관리자 권한이 있는 계정으로 로그인했는지 확인해 주세요.</p>
      </div>
    )
  }

  const summary = data?.summary ?? {}

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h2>운영 대시보드</h2>
        <p>지인 계정을 만들고, 자료 찾기·수업 선택 기록을 확인합니다.</p>
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>사용자 계정 만들기</h3>
        <form className={styles.accountForm} onSubmit={handleCreateTeacher}>
          <label className={styles.field}>
            <span>로그인 아이디</span>
            <input
              type="text"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="예: friend01"
              autoComplete="off"
              required
            />
          </label>
          <label className={styles.field}>
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="4자 이상"
              autoComplete="new-password"
              required
            />
          </label>
          <label className={styles.field}>
            <span>닉네임</span>
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="화면에 표시되는 이름"
              required
            />
          </label>
          <label className={styles.checkField}>
            <input
              type="checkbox"
              checked={grantAdmin}
              onChange={(event) => setGrantAdmin(event.target.checked)}
            />
            <span>관리자 권한 부여</span>
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={creating}>
              {creating ? '만드는 중…' : '계정 만들기'}
            </button>
          </div>
        </form>
        {createMessage ? <p className={styles.success}>{createMessage}</p> : null}
        {createError ? <p className={styles.errorInline}>{createError}</p> : null}

        <div className={`${styles.tableWrap} ${styles.teacherTableWrap}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>아이디</th>
                <th>닉네임</th>
                <th>권한</th>
                <th>생성일</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.muted}>
                    등록된 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                teachers.map((row) => (
                  <tr key={row.teacherId}>
                    <td>{row.loginId}</td>
                    <td>{row.nickname}</td>
                    <td>{row.admin ? '관리자' : '일반'}</td>
                    <td className={styles.muted}>{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>총 검색</p>
          <p className={styles.statValue}>{summary.totalSearches ?? 0}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>총 수업 선택</p>
          <p className={styles.statValue}>{summary.totalMaterialSelects ?? 0}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>최근 7일 검색</p>
          <p className={styles.statValue}>{summary.searchesLast7Days ?? 0}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>최근 7일 선택</p>
          <p className={styles.statValue}>{summary.selectsLast7Days ?? 0}</p>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>비용 확인 (외부 사이트)</h3>
        <div className={styles.linkGrid}>
          {(data?.billingLinks ?? []).map((link) => (
            <a
              key={link.url}
              className={styles.linkCard}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <p className={styles.linkLabel}>{link.label}</p>
              <p className={styles.linkDesc}>{link.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>교사별 검색 횟수 (상위)</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>닉네임</th>
                <th>검색 수</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topSearchTeachers ?? []).length === 0 ? (
                <tr>
                  <td colSpan={2} className={styles.muted}>
                    기록 없음
                  </td>
                </tr>
              ) : (
                data.topSearchTeachers.map((row) => (
                  <tr key={row.teacherId}>
                    <td>{row.nickname}</td>
                    <td>{row.searchCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>최근 검색</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>시각</th>
                <th>교사</th>
                <th>질문</th>
                <th>노출 자료</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentSearches ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.muted}>
                    기록 없음
                  </td>
                </tr>
              ) : (
                data.recentSearches.map((row) => (
                  <tr key={row.searchLogId}>
                    <td className={styles.muted}>{formatDateTime(row.createdAt)}</td>
                    <td>{row.teacherNickname}</td>
                    <td>{row.question}</td>
                    <td>
                      <ul className={styles.resultList}>
                        {(row.results ?? []).map((r) => (
                          <li key={`${row.searchLogId}-${r.rank}`}>
                            {r.source || r.title}
                            {r.page ? (
                              <>
                                {' '}
                                <span className={styles.badge}>p.{r.page}</span>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>최근 「수업으로 선택」</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>시각</th>
                <th>교사</th>
                <th>자료</th>
                <th>출처(JSON)</th>
                <th>검색 연결</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentSelects ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.muted}>
                    기록 없음
                  </td>
                </tr>
              ) : (
                data.recentSelects.map((row) => (
                  <tr key={row.selectLogId}>
                    <td className={styles.muted}>{formatDateTime(row.createdAt)}</td>
                    <td>{row.teacherNickname}</td>
                    <td>{row.title}</td>
                    <td>
                      {row.source || '-'}
                      {row.page ? (
                        <>
                          {' '}
                          <span className={styles.badge}>p.{row.page}</span>
                        </>
                      ) : null}
                    </td>
                    <td>{row.searchLogId ? `#${row.searchLogId}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default AdminDashboardPage
