import { NotFoundError } from 'restify-errors'
import { IncomingMessage } from 'http'

export class ModuleNotFoundError extends Error {
  code = 'MODULE_NOT_FOUND'
}

/**
 * Error class that is thrown when an unmatched request
 * is encountered in noRecord mode or when a request failed in recordOnlySuccess mode
 */
export class RecordingDisabledError extends NotFoundError {}

export class InvalidStatusCodeError extends NotFoundError {
  res: IncomingMessage
  constructor (msg: string, res: IncomingMessage) {
    super(msg)
    this.res = res
  }
}
