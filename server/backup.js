import 'dotenv/config'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const execFileAsync = promisify(execFile)
const mongoUri = process.env.MONGODB_URI

if (!mongoUri) {
  console.error('MONGODB_URI is required to create a database backup.')
  process.exit(1)
}

const outputDirectory = resolve(process.env.BACKUP_DIR || 'backups')
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const archivePath = join(outputDirectory, `byok-${timestamp}.archive.gz`)
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'byok-backup-'))
const configPath = join(temporaryDirectory, 'mongodump.yml')

try {
  await mkdir(dirname(archivePath), { recursive: true })
  await writeFile(
    configPath,
    `uri: ${JSON.stringify(mongoUri)}\narchive: ${JSON.stringify(archivePath)}\ngzip: true\n`,
    { mode: 0o600 },
  )
  await execFileAsync('mongodump', ['--config', configPath], { maxBuffer: 1024 * 1024 })
  console.log(`MongoDB backup created at ${archivePath}`)
} catch (error) {
  console.error(`MongoDB backup failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
