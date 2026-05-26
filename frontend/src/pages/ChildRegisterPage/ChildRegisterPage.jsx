import { useEffect, useRef, useState } from 'react'
import styles from './ChildRegisterPage.module.css'
import { authHeaders, getAccessToken } from '../../lib/auth'
import { uploadImageFile } from '../../lib/fileUpload'

function ChildRegisterPage() {
  const [previewUrl, setPreviewUrl] = useState('')
  const [profileFile, setProfileFile] = useState(null)
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const previewUrlRef = useRef('')

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0]

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    if (!file) {
      setPreviewUrl('')
      setProfileFile(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    previewUrlRef.current = objectUrl
    setPreviewUrl(objectUrl)
    setProfileFile(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitMessage('')
    setSubmitError('')
    setIsSubmitting(true)

    try {
      if (!getAccessToken()) {
        throw new Error('로그인 후 이용해 주세요.')
      }

      let profileImageUrl = null
      if (profileFile) {
        profileImageUrl = await uploadImageFile(profileFile, 'profile')
      }

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: name.trim(),
          birthDate,
          profileImageUrl,
        }),
      })

      if (!response.ok) {
        let message = '등록에 실패했습니다.'
        try {
          const errorBody = await response.json()
          if (errorBody?.message) {
            message = errorBody.message
          }
        } catch {
          // noop
        }
        throw new Error(message)
      }

      setSubmitMessage('아이등록이 완료되었습니다.')
      setName('')
      setBirthDate('')
      setProfileFile(null)
      setPreviewUrl('')
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h2>아이등록</h2>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.profileSection}>
          <div className={styles.profileRing}>
            {previewUrl ? <img src={previewUrl} alt="프로필 미리보기" className={styles.profileImage} /> : <div className={styles.profileEmpty} />}
          </div>
          <label className={styles.uploadButton}>
            프로필 사진 선택
            <input
              className={styles.hiddenInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleProfileImageChange}
            />
          </label>
        </div>

        <label>
          <span>아이 이름</span>
          <input
            type="text"
            placeholder="이름 입력"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          <span>생년월일</span>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </label>

        {submitMessage ? <p className={styles.successMessage}>{submitMessage}</p> : null}
        {submitError ? <p className={styles.errorMessage}>{submitError}</p> : null}

        <div className={styles.actions}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ChildRegisterPage
