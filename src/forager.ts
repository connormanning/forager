import { getProtocol, join, stripProtocol } from 'protopath'

import * as Dropbox from './dropbox'
import * as File from './file'
import * as Http from './http'
import * as S3 from './s3'

import { Options } from './options'
import * as Types from './types'

export { Options }

function createPartial(protocol: string, options?: any): Partial<Types.Driver> {
  switch (protocol) {
    case 's3': {
      if (options && !S3.isOptions(options)) {
        throw new Error('Invalid S3 options')
      }
      return S3.create(options)
    }

    case 'dropbox':
    case 'dbx': {
      if (!Dropbox.isOptions(options)) {
        throw new Error('Invalid dropbox options')
      }
      return Dropbox.create(options)
    }

    case 'http':
    case 'https':
      return Http.create(protocol)

    case '':
    case 'file':
      return File.create()

    default:
      throw new Error('Invalid protocol')
  }
}

const methods = [
  'read',
  'write',
  'createReadStream',
  'writeStream',
  'list',
  'remove',
]
function createThrower(protocol: string): Types.Driver {
  return methods.reduce<Types.Driver>(
    (thrower, method) => ({
      ...thrower,
      [method]: async function (): Promise<never> {
        throw new Error(`${protocol}: ${method} not supported`)
      },
    }),
    {} as Types.Driver
  )
}

export function create(protocol: 's3', options?: S3.Options): Types.Driver
export function create(
  protocol: 'dropbox' | 'dbx',
  options?: Dropbox.Options
): Types.Driver
export function create(protocol: string, options?: Options): Types.Driver
export function create(protocol: string, options?: unknown): Types.Driver {
  const thrower = createThrower(protocol)
  const partial = createPartial(protocol, options)
  return { ...thrower, ...partial }
}

export function getProtocolOrDefault(path: string) {
  return getProtocol(path) || 'file'
}

export async function read(path: string) {
  const s = create(getProtocolOrDefault(path))
  return s.read(stripProtocol(path))
}
export async function readString(path: string) {
  return (await read(path)).toString('utf8')
}
export async function readJson(path: string) {
  return JSON.parse(await readString(path))
}
export async function write(path: string, data: Buffer | string) {
  const s = create(getProtocolOrDefault(path))
  return s.write(stripProtocol(path), data)
}
export async function createReadStream(path: string) {
  const s = create(getProtocolOrDefault(path))
  return s.createReadStream(stripProtocol(path))
}
export async function writeStream(path: string, data: NodeJS.ReadableStream) {
  const s = create(getProtocolOrDefault(path))
  return s.writeStream(stripProtocol(path), data)
}
export async function copyFile(input: string, output: string) {
  return writeStream(output, await createReadStream(input))
}
export async function list(
  dir: string,
  recursive = false
): Promise<Types.List> {
  const s = create(getProtocolOrDefault(dir))
  const contents = await s.list(stripProtocol(dir))
  if (!recursive) return contents

  return (
    await Promise.all(
      contents.map(
        async (item): Promise<Types.List> => {
          if (item.type === 'file') return [item]

          // Note that this `list` call returns items relative to our
          // subdirectory, while we want them relative to our listing root, so
          // we'll have to join them properly below.
          return (await list(join(dir, item.path), true)).map((v) => ({
            ...v,
            path: join(item.path, v.path),
          }))
        }
      )
    )
  ).reduce<Types.List>((list, curr) => [...list, ...curr], [])
}
export async function remove(path: string) {
  const s = create(getProtocolOrDefault(path))
  return s.remove(stripProtocol(path))
}
