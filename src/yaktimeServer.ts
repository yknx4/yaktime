import { YakTimeOpts } from './util'
import { yaktime } from './yaktime'
import { notifyNotUsedTapes } from './tracker'
import { createAsyncServer } from './AsyncServer'

export function createYaktimeServer (host: string, opts: YakTimeOpts) {
  const tape = yaktime(host, opts)
  const server = createAsyncServer(tape)
  server.once('close', () => {
    notifyNotUsedTapes(opts, tape.hits).catch(e => console.error(e))
  })
  return server
}
