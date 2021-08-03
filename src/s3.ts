import { S3 } from 'aws-sdk'
import { lookup } from 'mime-types'
import { popSlash } from 'protopath'

import * as Types from './types'
import { has } from './util'

const apiVersion = '2014-11-06'

export type Options = { region?: string; access: string; secret: string }
export function isOptions(o: unknown): o is Options {
  if (
    typeof o === 'object' &&
    o !== null &&
    o !== undefined &&
    has(o, 'access') &&
    has(o, 'secret') &&
    typeof o.access === 'string' &&
    typeof o.secret === 'string'
  ) {
    return !has(o, 'region') || typeof o.region === 'string'
  }

  return false
}

function getS3(options?: Options): S3 {
  if (!options) return new S3({ apiVersion })
  const { region, access: accessKeyId, secret: secretAccessKey } = options
  return new S3({ apiVersion, region, accessKeyId, secretAccessKey })
}

export function getParts(path: string): [string, string | undefined] {
  const parts = popSlash(path).split('/')
  const bucket = parts[0]
  if (!bucket) throw new Error('No S3 bucket supplied')
  const object = parts.slice(1).join('/')
  return [bucket, object.length ? object : undefined]
}

export function create(
  options?: Options
): Types.Listable &
  Types.Readable &
  Types.Writable &
  Types.StreamReadable &
  Types.StreamWritable {
  const s3 = getS3(options)

  async function read(path: string): Promise<Buffer> {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 read - no object specified')
    const { Body: buffer } = await s3.getObject({ Bucket, Key }).promise()
    return buffer as Buffer
  }
  async function write(path: string, data: Buffer | string) {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 write - no object specified')
    const ContentType = lookup(path) || undefined
    await s3.putObject({ Bucket, Key, Body: data, ContentType }).promise()
  }

  async function createReadStream(path: string) {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 read - no object specified')
    const request = s3.getObject({ Bucket, Key })
    return request.createReadStream().on('error', () => request.abort())
  }
  async function writeStream(path: string, data: NodeJS.ReadableStream) {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 write - no object specified')
    const ContentType = lookup(path) || undefined
    await s3.upload({ Bucket, Key, Body: data, ContentType }).promise()
  }

  async function list(path: string): Promise<Types.List> {
    const [Bucket, Key] = getParts(path)
    const Prefix = Key ? `${Key}/` : ''

    let ContinuationToken: string | undefined
    let list: Types.List = []

    do {
      const params = { Bucket, Prefix, Delimiter: '/', ContinuationToken }
      const response = await s3.listObjectsV2(params).promise()
      if (!response.CommonPrefixes || !response.Contents) {
        throw new Error('Unexpected S3 list response')
      }

      list = [
        ...list,
        ...response.CommonPrefixes.map<Types.PathInfo>((v) => ({
          type: 'directory',
          path: popSlash(v.Prefix!.slice(Prefix.length)),
        })),
        ...response.Contents.map<Types.PathInfo>((v) => ({
          type: 'file',
          path: v.Key!.slice(Prefix.length),
          size: v.Size,
        })),
      ]

      ContinuationToken = response.NextContinuationToken
    } while (ContinuationToken)

    return list.sort((a, b) => a.path.localeCompare(b.path))
  }

  return {
    read,
    write,
    createReadStream,
    writeStream,
    list,
  }
}
