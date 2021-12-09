// import Stream from 'stream'
import { S3, Utils } from '.'

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

beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.clearAllMocks())

test('credentials', () => {
  expect(S3.isOptions({ access: '', secret: '' })).toBe(true)
  expect(S3.isOptions({ region: '', access: '', secret: '' })).toBe(true)
  expect(S3.isOptions({ region: '', access: '' })).toBe(false)
  expect(S3.isOptions(42)).toBe(false)
  expect(S3.isOptions({ region: 42, access: '' })).toBe(false)
  S3.create({ region: 'us-east-1', access: 'a', secret: 'b' })
})

test('read: fail with missing body', async () => {
  const mock = getObject.mockImplementation((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt' })
    return { promise: async () => ({}) }
  })

  const s3 = S3.create()
  await expect(s3.read('bucket/key.txt')).rejects.toThrow()
  expect(mock).toHaveBeenCalled()
})

test('read: fail with invalid body', async () => {
  const mock = getObject.mockImplementation((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt' })
    return { promise: async () => ({ Body: 42 }) }
  })

  const s3 = S3.create()
  await expect(s3.read('bucket/key.txt')).rejects.toThrow()
  expect(mock).toHaveBeenCalled()
})

test('read', async () => {
  const mock = getObject.mockImplementation((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt' })
    return { promise: async () => ({ Body: Buffer.from('asdf') }) }
  })

  const s3 = S3.create()
  expect(Utils.arrayBufferToString(await s3.read('bucket/key.txt'))).toEqual(
    'asdf'
  )
  expect(mock).toHaveBeenCalled()

  expect(s3.read('')).rejects.toThrow()
  expect(s3.read('bucket')).rejects.toThrow()
})

test('read exact', async () => {
  const mock = getObject.mockImplementation((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt' })
    const body = 'asdf'
    const ab = new ArrayBuffer(body.length)
    const view = new Uint8Array(ab)
    for (let i = 0; i < body.length; ++i) {
      view[i] = body.charCodeAt(i)
    }

    return { promise: async () => ({ Body: Buffer.from(view) }) }
  })

  const s3 = S3.create()
  expect(Utils.arrayBufferToString(await s3.read('bucket/key.txt'))).toEqual(
    'asdf'
  )
  expect(mock).toHaveBeenCalled()

  expect(s3.read('')).rejects.toThrow()
  expect(s3.read('bucket')).rejects.toThrow()
})

test('read range', async () => {
  const data = 'abcdef'
  const mock = getObject.mockImplementation((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt', Range: 'bytes=1-4' })
    return { promise: async () => ({ Body: Buffer.from(data.slice(1, 5)) }) }
  })

  const s3 = S3.create()
  expect(
    Utils.arrayBufferToString(
      await s3.read('bucket/key.txt', { range: [1, 5] })
    )
  ).toEqual(data.slice(1, 5))
})

test('write', async () => {
  function getMockOnce(expected: any) {
    return putObject.mockImplementationOnce((v: any): any => {
      expect(v).toEqual(expected)
      return { promise: async () => {} }
    })
  }

  const s3 = S3.create()

  // Auto-determined content type.
  {
    const mock = getMockOnce({
      Bucket: 'bucket',
      Key: 'key.txt',
      Body: 'asdf',
      ContentType: 'text/plain',
    })
    await s3.write('bucket/key.txt', 'asdf')
    expect(mock).toHaveBeenCalled()
  }

  // Indeterminate content type.
  {
    const mock = getMockOnce({ Bucket: 'bucket', Key: 'key', Body: 'asdf' })
    await s3.write('bucket/key', 'asdf')
    expect(mock).toHaveBeenCalled()
  }

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
  const mock = listObjectsV2.mockImplementation((v: any): any => {
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

/*
test('read stream', async () => {
  const mock = getObject.mockImplementation((v: any): any => {
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

test('read stream: range', async () => {
  const data = 'abcdef'
  const mock = getObject.mockImplementation((v: any): any => {
    expect(v).toEqual({ Bucket: 'bucket', Key: 'key.txt', Range: 'bytes=1-4' })
    return {
      createReadStream: () =>
        Stream.Readable.from([Buffer.from(data.slice(1, 5))]),
    }
  })

  const s3 = S3.create()
  const stream = await s3.createReadStream('bucket/key.txt', { range: [1, 5] })

  expect((await Util.drain(stream)).toString()).toEqual(data.slice(1, 5))
  expect(mock).toHaveBeenCalled()
})

test('read stream: failure', async () => {
  const abort = jest.fn()
  const mock = getObject.mockImplementation((v: any): any => {
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
  function getMockOnce(expected: any) {
    return upload.mockImplementation((v: any): any => {
      const stream: Stream.Readable = v.Body
      expect(v).toEqual({ ...expected, Body: stream })
      return {
        promise: async () => {
          const data = await Util.drain(stream)
          expect(data.toString()).toEqual('42')
        },
      }
    })
  }

  const s3 = S3.create()

  {
    const mock = getMockOnce({
      Bucket: 'bucket',
      Key: 'key.json',
      ContentType: 'application/json',
    })
    await s3.writeStream(
      'bucket/key.json',
      Stream.Readable.from([Buffer.from('42')])
    )
    expect(mock).toHaveBeenCalled()
  }

  {
    const mock = getMockOnce({ Bucket: 'bucket', Key: 'key' })
    await s3.writeStream(
      'bucket/key',
      Stream.Readable.from([Buffer.from('42')])
    )
    expect(mock).toHaveBeenCalled()
  }

  expect(
    s3.writeStream('bucket', Stream.Readable.from('asdf'))
  ).rejects.toThrow()
})
*/
