import { put, get, del } from '@vercel/blob';

async function readBlobText(blob: any) {
  if (blob && typeof blob.text === 'function') {
    return blob.text()
  }

  if (!blob?.stream) {
    return null
  }

  const reader = blob.stream.getReader()
  const decoder = new TextDecoder()
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
  }

  text += decoder.decode()
  return text
}

export async function readJSON(key: string) {
  try {
    const blob = await get(key, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    if (!blob) return null
    const text = await readBlobText(blob)
    if (!text) return null
    return JSON.parse(text)
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.status === 404) return null
    throw err
  }
}

export async function writeJSON(key: string, data: any) {
  await put(key, JSON.stringify(data, null, 2), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
}

export async function deleteJSON(key: string) {
  try {
    await del(key, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
  } catch (err: any) {
    if (err.status !== 404) throw err
  }
}
