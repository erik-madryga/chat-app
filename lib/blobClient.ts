import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export async function readJSON(key: string) {
  const file = path.join(DATA_DIR, key)
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw)
  } catch (err: any) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

export async function writeJSON(key: string, data: any) {
  const file = path.join(DATA_DIR, key)
  await ensureDir(file)
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

export async function deleteJSON(key: string) {
  const file = path.join(DATA_DIR, key)
  try {
    await fs.unlink(file)
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err
  }
}
