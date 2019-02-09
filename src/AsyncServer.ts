// tslint:disable:unified-signatures

import { Server, createServer, IncomingMessage, ServerResponse } from 'http'
import { ListenOptions } from 'net'
import { promisify } from 'util'

export interface AsyncServer extends Server {
  listenAsync (port?: number, hostname?: string, backlog?: number): Promise<void>
  listenAsync (port?: number, hostname?: string): Promise<void>
  listenAsync (port?: number, backlog?: number): Promise<void>
  listenAsync (port?: number): void
  listenAsync (path: string, backlog?: number): Promise<void>
  listenAsync (path: string): Promise<void>
  listenAsync (options: ListenOptions): Promise<void>
  listenAsync (handle: any, backlog?: number): Promise<void>
  listenAsync (handle: any): Promise<void>

  closeAsync (): Promise<void>
  wait (event: string): Promise<void>
}

export function createAsyncServer (requestListener?: (request: IncomingMessage, response: ServerResponse) => void): AsyncServer {
  const server = createServer(requestListener) as AsyncServer
  server.listenAsync = promisify(server.listen)
  server.closeAsync = promisify(server.close)
  server.wait = (event: string) => new Promise(resolve => server.once(event, resolve))
  return server
}
