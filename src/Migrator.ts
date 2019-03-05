import { YakTimeOpts, readDirAsync, readFileAsync } from './util'
import { Recorder, SerializedResponse, SerializedRequest } from './Recorder'
import { URL } from 'url'
import { parse } from 'querystring'
import { h64 } from 'xxhashjs'
import { fromPairs } from 'lodash'
import { join } from 'path'

export class Migrator {
  opts: YakTimeOpts
  recorder: Recorder
  host: string
  constructor (opts: YakTimeOpts, host: string) {
    this.opts = opts
    this.host = host
    this.recorder = new Recorder(opts, host)
  }

  async migrateDirectory () {
    const tapes = await readDirAsync(this.opts.dirname)
    return Promise.all(tapes.map(f => this.migrateTape(f).catch(e => `${f} was not migrated: ${e.message}`)))
  }
  async migrateTape (file: string) {
    const headers: Record<string, string> = {}
    let body = Buffer.from('')
    const res = {
      statusCode: 0,
      setHeader (key: string, value: string) {
        headers[key] = value
      },
      write (data: string | Buffer) {
        body = Buffer.isBuffer(data) ? Buffer.concat([body, data]) : Buffer.concat([body, Buffer.from(data)])
      },
      // tslint:disable-next-line:no-empty
      end (_data?: string | Buffer) {}
    }
    res.end = (data?: string | Buffer) => data != null && res.write(data)
    const filename = join(this.opts.dirname, file)
    const tape = require(filename)
    const tapeString = await readFileAsync(filename, 'utf8')
    tape(null, res)

    const [requestStr, ...requestHeaders] = tapeString
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.startsWith('*') && !s.endsWith('/'))
      .filter(s => s !== '*')
      .map(s => s.replace('* ', ''))
    const [method, ...pathSections] = requestStr.split(' ')
    const reqPath = pathSections.join(' ')
    const parsedUrl = new URL(reqPath, this.host)
    const parsedHeaders = fromPairs(requestHeaders.map(h => h.split(': ')))

    const serializedRequest: SerializedRequest = {
      host: parsedUrl.hash,
      path: parsedUrl.pathname,
      query: parse(parsedUrl.searchParams.toString()),
      headers: parsedHeaders,
      method,
      httpVersion: '1.1',
      trailers: {},
      body: Buffer.from('').toString('base64'),
      bodyHash: h64(Buffer.from(''), 0).toString(16)
    }

    const serializedResponse: SerializedResponse = {
      statusCode: res.statusCode,
      headers,
      body: body.toString('base64'),
      trailers: {}
    }

    const r = await this.recorder.save(serializedRequest, serializedResponse)
    return `${file} stored in tapes/${r.$loki}`
  }
}
