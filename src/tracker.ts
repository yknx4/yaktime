import { YakTimeOpts, readDirAsync } from './util'
import * as path from 'path'
import Debug from 'debug'

const debug = Debug('yaktime:tracker')

export function trackHit (file: string, hits: Set<string>) {
  if (hits.has(file) === false) debug(`hit: ${file}`)
  hits.add(file)
}

export async function getNotUsedTapes (opts: YakTimeOpts, hits?: Set<string>) {
  if (hits == null) return []
  const existingTapes = await readDirAsync(opts.dirname)
  return existingTapes.filter(filename => hits.has(path.join(opts.dirname, filename)) === false)
}

export async function notifyNotUsedTapes (opts: YakTimeOpts, hits?: Set<string>) {
  if (hits == null) return
  const unusedTapes = await getNotUsedTapes(opts, hits)
  unusedTapes.forEach(filename => console.warn(`unused tape: ${path.join(opts.dirname, filename)}`))
}
