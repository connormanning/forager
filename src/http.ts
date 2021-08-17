import fetch, { RequestInfo, RequestInit } from 'node-fetch'

import { Range } from './range'
import * as Types from './types'

export class ResponseError extends Error {
  code: number
  body: any
  constructor(code: number, text: string, body?: any) {
    super(text)
    this.code = code
    this.body = body
  }
}

type Options = RequestInit & Types.ReadOptions

async function run(url: RequestInfo, options?: RequestInit) {
  const response = await fetch(url, options)
  const { ok, status, statusText } = response
  if (!ok) {
    const type = response.headers.get('content-type')
    const body =
      type && type.startsWith('application/json')
        ? await response.json()
        : await response.text()
    throw new ResponseError(status, statusText, body)
  }
  return response
}

async function get(url: RequestInfo, { range, ...options }: Options = {}) {
  if (range) {
    options.headers = { ...options.headers, Range: Range.toHeaderValue(range) }
  }
  return run(url, options)
}

export async function read(path: string, options?: Options): Promise<Buffer> {
  return (await get(path, options)).buffer()
}
export async function createReadStream(path: string, options?: Options) {
  return (await get(path, options)).body
}
export async function readJson(path: string, options?: Options) {
  return (await get(path, options)).json()
}
export async function readText(path: string, options?: Options) {
  return (await get(path, options)).text()
}

export function create(protocol: 'http' | 'https') {
  function prefix(path: string) {
    return `${protocol}://${path}`
  }

  async function protoRead(path: string, options?: Options) {
    return read(prefix(path), options)
  }
  async function protoCreateReadStream(path: string, options?: Options) {
    return createReadStream(prefix(path), options)
  }

  return {
    read: protoRead,
    createReadStream: protoCreateReadStream,
  }
}
