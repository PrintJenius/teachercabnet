/**
 * 업로드 전 클라이언트에서 이미지 리사이즈·JPEG 압축
 */
export async function prepareImageFile(file, maxWidth = 1200) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const scale = image.width > maxWidth ? maxWidth / image.width : 1
    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('이미지를 처리할 수 없습니다.')
    }
    context.drawImage(image, 0, 0, width, height)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
    const baseName = file.name?.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지를 처리할 수 없습니다.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    image.src = src
  })
}
