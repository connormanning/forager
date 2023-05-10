import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { lookup } from 'mime-types'
import { popSlash } from 'protopath'
import { Readable } from 'stream'

import * as Types from './types'
import { has } from './utils'

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

function getS3(options?: Options): S3Client {
  if (!options) return new S3Client({ apiVersion })

  const { region, access: accessKeyId, secret: secretAccessKey } = options
  return new S3Client({
    apiVersion,
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
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
): Types.Listable & Types.Readable & Types.Writable /*
  &
  Types.StreamReadable &
  Types.StreamWritable
  */ {
  const s3 = getS3(options)

  async function read(
    path: string,
    { range }: Types.ReadOptions = {}
  ): Promise<Uint8Array> {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 read - no object specified')
    const command = new GetObjectCommand({
      Bucket,
      Key,
      Range: range ? Types.Range.toHeaderValue(range) : undefined,
    })

    const { Body: body } = await s3.send(command)
    if (!body) throw new Error('Missing response body from S3')
    return drain(body as Readable)
  }
  async function write(path: string, data: ArrayBuffer | string) {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 write - no object specified')
    const ContentType = lookup(path) || undefined
    const command = new PutObjectCommand({
      Bucket,
      Key,
      Body: typeof data === 'string' ? data : Buffer.from(data),
      ContentType,
    })
    await s3.send(command)
  }
  async function drain(stream: Readable): Promise<Uint8Array> {
    return await new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  /*
  async function createReadStream(
    path: string,
    { range }: Types.ReadOptions = {}
  ) {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 read - no object specified')

    const options: S3.GetObjectRequest = { Bucket, Key }
    if (range) options.Range = Types.Range.toHeaderValue(range)

    const request = s3.getObject(options)
    return request.createReadStream().on('error', () => request.abort())
  }
  async function writeStream(path: string, data: NodeJS.ReadableStream) {
    const [Bucket, Key] = getParts(path)
    if (!Key) throw new Error('Invalid S3 write - no object specified')
    const ContentType = lookup(path) || undefined
    await s3.upload({ Bucket, Key, Body: data, ContentType }).promise()
  }
  */

  async function list(path: string): Promise<Types.List> {
    const [Bucket, Key] = getParts(path)
    const Prefix = Key ? `${Key}/` : ''

    let ContinuationToken: string | undefined
    let list: Types.List = []

    do {
      const command = new ListObjectsV2Command({
        Bucket,
        Prefix,
        Delimiter: '/',
        ContinuationToken,
      })
      const response = await s3.send(command)
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
    /*
    createReadStream,
    writeStream,
    */
    list,
  }
}
