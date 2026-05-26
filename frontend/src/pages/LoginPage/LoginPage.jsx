import { useState } from 'react'
import styles from './LoginPage.module.css'
import { setAccessToken } from '../../lib/auth'

function LoginPage({ onBack, onLoginSuccess }) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const trimmedId = loginId.trim()
    if (!trimmedId || !password) {
      setErrorMessage('아이디와 비밀번호를 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: trimmedId.toLowerCase(), password }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || '로그인에 실패했습니다.')
      }

      if (!data?.accessToken) {
        throw new Error('토큰을 받지 못했습니다.')
      }

      setAccessToken(data.accessToken)
      await onLoginSuccess?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.loginCard}>
        <button
          type="button"
          className={styles.backButton}
          aria-label="뒤로가기"
          onClick={onBack}
        >
          &#x2039;
        </button>

        <p className={styles.hint}>전용 계정으로 로그인해 주세요.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.inputLabel}>
            <span>아이디</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="아이디 입력"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
            />
          </label>

          <label className={styles.inputLabel}>
            <span>비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}

          <button type="submit" className={styles.loginButton} disabled={isSubmitting}>
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
