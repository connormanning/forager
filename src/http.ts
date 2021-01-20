import fetch, { RequestInfo, RequestInit } from 'node-fetch'

export class ResponseError extends Error {
  code: number
  body: any
  constructor(code: number, text: string, body?: any) {
    super(text)
    this.code = code
    this.body = body
  }
}

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

export async function read(path: string): Promise<Buffer> {
  return (await run(path)).buffer()
}
export async function createReadStream(path: string) {
  return (await run(path)).body
}
export async function readJson(path: string): Promise<any> {
  return (await run(path)).json()
}
export async function readText(path: string): Promise<string> {
  return (await run(path)).text()
}

export function create(protocol: 'http' | 'https') {
  function prefix(path: string) {
    return `${protocol}://${path}`
  }

  async function protoRead(path: string) {
    return read(prefix(path))
  }
  async function protoCreateReadStream(path: string) {
    return createReadStream(prefix(path))
  }

  return {
    read: protoRead,
    createReadStream: protoCreateReadStream,
  }
}
