import { authHeaders, getAccessToken } from './auth'
import { prepareImageFile } from './journalPhoto'

/**
 * 이미지를 로컬 저장소에 올리고 공개 URL을 반환합니다.
 * DB에는 이 URL 문자열만 저장합니다.
 *
 * @param {File} file
 * @param {'journal'|'profile'|'general'} category
 */
export async function uploadImageFile(file, category = 'general') {
  if (!getAccessToken()) {
    throw new Error('로그인 후 이용해 주세요.')
  }

  const prepared = await prepareImageFile(file)
  const formData = new FormData()
  formData.append('file', prepared, prepared.name || 'image.jpg')
  formData.append('category', category)

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || '파일 업로드에 실패했습니다.')
  }
  if (!data?.url) {
    throw new Error('업로드 URL을 받지 못했습니다.')
  }
  return data.url
}
