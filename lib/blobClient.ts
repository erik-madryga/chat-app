import { put, get, del } from '@vercel/blob';

export async function readJSON(key: string) {
  try {
    const blob = await get(key, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    if (!blob) return null
    const text = await blob.text()
    return JSON.parse(text)
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.status === 404) return null
    throw err
  }
}

export async function writeJSON(key: string, data: any) {
  await put(key, JSON.stringify(data, null, 2), {
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
