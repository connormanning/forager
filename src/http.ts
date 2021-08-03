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

export async function read(
  path: string,
  options?: RequestInit
): Promise<Buffer> {
  return (await run(path, options)).buffer()
}
export async function createReadStream(path: string, options?: RequestInit) {
  return (await run(path, options)).body
}
export async function readJson(
  path: string,
  options?: RequestInit
): Promise<any> {
  return (await run(path, options)).json()
}
export async function readText(
  path: string,
  options?: RequestInit
): Promise<string> {
  return (await run(path, options)).text()
}

export function create(protocol: 'http' | 'https') {
  function prefix(path: string) {
    return `${protocol}://${path}`
  }

  async function protoRead(path: string, options?: RequestInit) {
    return read(prefix(path), options)
  }
  async function protoCreateReadStream(path: string, options?: RequestInit) {
    return createReadStream(prefix(path), options)
  }

  return {
    read: protoRead,
    createReadStream: protoCreateReadStream,
  }
}
