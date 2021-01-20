import Stream from 'stream'
import { S3, Util } from '.'

const getObject = jest.fn()
const putObject = jest.fn()
const listObjectsV2 = jest.fn()
const upload = jest.fn()
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    getObject,
    putObject,
    listObjectsV2,
    upload,
  })),
}))

test('credentials', () => {
  expect(S3.isOptions({ access: '', secret: '' })).toBe(true)
  expect(S3.isOptions({ region: '', access: '', secret: '' })).toBe(true)
  expect(S3.isOptions({ region: '', access: '' })).toBe(false)
  expect(S3.isOptions(42)).toBe(false)
  expect(S3.isOptions({ region: 42, access: '' })).toBe(false)
  S3.create({ region: 'us-east-1', access: 'a', secret: 'b' })
})

test('read', async () => {
  const mock = getObject.mockImplementationOnce((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt' })
    return {
      promise: async () => ({ Body: Buffer.from('asdf') }),
    }
  })

  const s3 = S3.create()
  expect((await s3.read('bucket/key.txt')).toString()).toEqual('asdf')
  expect(mock).toHaveBeenCalled()

  expect(s3.read('')).rejects.toThrow()
  expect(s3.read('bucket')).rejects.toThrow()
})

test('write', async () => {
  const mock = putObject.mockImplementationOnce((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt', Body: 'asdf' })
    return { promise: async () => {} }
  })

  const s3 = S3.create()
  await s3.write('bucket/key.txt', 'asdf')
  expect(mock).toHaveBeenCalled()

  expect(s3.write('bucket', 'asdf')).rejects.toThrow()
})

test('list', async () => {
  let n = 0
  const mock = listObjectsV2.mockImplementation((v: any): any => {
    if (n++ == 0) {
      expect(v).toEqual({
        Bucket: 'bucket',
        Prefix: 'a/b/',
        Delimiter: '/',
      })
      return {
        promise: async () => ({
          CommonPrefixes: [{ Prefix: 'a/b/dir1/' }, { Prefix: 'a/b/dir2/' }],
          Contents: [
            { Key: 'a/b/file1.txt', Size: 42 },
            { Key: 'a/b/file2.txt' },
          ],
          NextContinuationToken: 'fjfj',
        }),
      }
    } else {
      expect(v).toEqual({
        Bucket: 'bucket',
        Prefix: 'a/b/',
        Delimiter: '/',
        ContinuationToken: 'fjfj',
      })
      return {
        promise: async () => ({
          CommonPrefixes: [{ Prefix: 'a/b/dir3/' }, { Prefix: 'a/b/dir4/' }],
          Contents: [
            { Key: 'a/b/file3.txt', Size: 111 },
            { Key: 'a/b/file4.txt' },
          ],
        }),
      }
    }
  })

  const s3 = S3.create()
  const list = await s3.list('bucket/a/b')
  expect(list).toEqual([
    { path: 'dir1', type: 'directory' },
    { path: 'dir2', type: 'directory' },
    { path: 'dir3', type: 'directory' },
    { path: 'dir4', type: 'directory' },
    { path: 'file1.txt', type: 'file', size: 42 },
    { path: 'file2.txt', type: 'file' },
    { path: 'file3.txt', type: 'file', size: 111 },
    { path: 'file4.txt', type: 'file' },
  ])
  expect(mock).toHaveBeenCalledTimes(2)

  mock.mockClear()
})

test('list root', async () => {
  const mock = listObjectsV2.mockImplementationOnce((v: any): any => {
    expect(v).toEqual({
      Bucket: 'bucket',
      Prefix: '',
      Delimiter: '/',
    })
    return {
      promise: async () => ({
        CommonPrefixes: [{ Prefix: 'dir1/' }],
        Contents: [{ Key: 'file1.txt', Size: 42 }],
      }),
    }
  })

  const s3 = S3.create()
  const list = await s3.list('bucket')
  expect(list).toEqual([
    { path: 'dir1', type: 'directory' },
    { path: 'file1.txt', type: 'file', size: 42 },
  ])
  expect(mock).toHaveBeenCalled()

  mock.mockClear()
})

test('bad list', async () => {
  const mock = listObjectsV2.mockImplementation((v: any): any => {
    const prefix = v.Prefix
    if (prefix === 'nocontents/') {
      return { promise: async () => ({ CommonPrefixes: [] }) }
    }
    if (prefix === 'noprefixes/') {
      return { promise: async () => ({ Contents: [] }) }
    }
    fail('bad test')
  })

  const s3 = S3.create()
  expect(s3.list('bucket/noprefixes')).rejects.toThrow()
  expect(s3.list('bucket/nocontents')).rejects.toThrow()

  mock.mockClear()
})

test('read stream', async () => {
  const mock = getObject.mockImplementationOnce((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt' })
    return {
      createReadStream: () => Stream.Readable.from([Buffer.from('asdf')]),
    }
  })

  const s3 = S3.create()
  const stream = await s3.createReadStream('bucket/key.txt')
  const data = (await Util.drain(stream)).toString()
  expect(data).toEqual('asdf')
  expect(mock).toHaveBeenCalled()

  expect(s3.createReadStream('bucket')).rejects.toThrow()
})

test('read stream: failure', async () => {
  const abort = jest.fn()
  const mock = getObject.mockImplementationOnce((v: any): any => {
    return {
      createReadStream: () => Stream.Readable.from('asdf'),
      abort,
    }
  })

  const s3 = S3.create()
  const stream = await s3.createReadStream('bucket/key.txt')
  expect(
    new Promise((resolve, reject) => {
      stream.emit('error', 'eee')
      stream.on('error', reject)
      stream.on('end', resolve)
    })
  ).rejects.toThrow('eee')

  expect(abort).toHaveBeenCalled()
  expect(mock).toHaveBeenCalled()
})

test('write stream', async () => {
  const mock = upload.mockImplementationOnce((v: any): any => {
    const stream: Stream.Readable = v.Body
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt', Body: stream })
    return {
      promise: async () => {
        const data = await Util.drain(stream)
        expect(data.toString()).toEqual('asdf')
      },
    }
  })

  const s3 = S3.create()
  await s3.writeStream(
    'bucket/key.txt',
    Stream.Readable.from([Buffer.from('asdf')])
  )
  expect(mock).toHaveBeenCalled()

  expect(
    s3.writeStream('bucket', Stream.Readable.from('asdf'))
  ).rejects.toThrow()
})
