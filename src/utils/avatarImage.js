const AVATAR_EDGE = 320
const AVATAR_QUALITY = 0.9

export async function prepareAvatarImage(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const sourceSize = Math.min(bitmap.width, bitmap.height)
    const sourceX = Math.max(0, Math.floor((bitmap.width - sourceSize) / 2))
    const sourceY = Math.max(0, Math.floor((bitmap.height - sourceSize) / 2))
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_EDGE
    canvas.height = AVATAR_EDGE
    canvas
      .getContext('2d')
      .drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        AVATAR_EDGE,
        AVATAR_EDGE
      )
    bitmap.close?.()

    const blob = await canvasToBlob(canvas, 'image/jpeg', AVATAR_QUALITY)
    if (blob) {
      return { dataUrl: await readBlobAsDataUrl(blob), size: blob.size }
    }
  } catch (error) {
    console.warn('Avatar compression failed, using original image', error)
  }

  return { dataUrl: await readBlobAsDataUrl(file), size: file.size }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
