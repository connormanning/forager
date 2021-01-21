import { Readable } from 'stream'

import * as Util from './util'

import { Dropbox } from '.'

afterEach(jest.clearAllMocks)

const filesListFolder = jest.fn()
const filesDownload = jest.fn()
const filesUpload = jest.fn()
jest.mock('dropbox', () => ({
  Dropbox: jest.fn(() => ({ filesListFolder, filesDownload, filesUpload })),
}))

const cred = { token: 'asdf' }

test('credentials', () => {
  expect(Dropbox.isOptions({ token: '' })).toBe(true)
  expect(Dropbox.isOptions({ token: 42 })).toBe(false)
  expect(Dropbox.isOptions(42)).toBe(false)
})

test('list: root path coercion', async () => {
  const mock = filesListFolder.mockImplementation(({ path }: any): any => {
    expect(path).toEqual('')
    return { result: { entries: [] } }
  })
  expect(await Dropbox.create(cred).list('')).toEqual([])
  expect(await Dropbox.create(cred).list('/')).toEqual([])
  expect(mock).toHaveBeenCalledTimes(2)
  mock.mockClear()
})

test('list: subdirectory path coercion', async () => {
  const mock = filesListFolder.mockImplementation(({ path }: any): any => {
    expect(path).toEqual('/subdir')
    return { result: { entries: [] } }
  })
  expect(await Dropbox.create(cred).list('subdir')).toEqual([])
  expect(await Dropbox.create(cred).list('/subdir')).toEqual([])
  expect(mock).toHaveBeenCalledTimes(2)
  mock.mockClear()
})

test('list: response', async () => {
  const mock = filesListFolder.mockImplementationOnce(({ path }: any) => {
    expect(path).toEqual('/asdf/fdsa')
    return {
      result: {
        entries: [
          { '.tag': 'folder', name: 'dir' },
          { '.tag': 'file', name: 'file.txt', size: 42 },
        ],
      },
    }
  })
  expect(await Dropbox.create(cred).list('asdf/fdsa')).toEqual([
    { path: 'dir', type: 'directory' },
    { path: 'file.txt', type: 'file', size: 42 },
  ])
  expect(mock).toHaveBeenCalled()
})

test('list: failure', async () => {
  const mock = filesListFolder.mockImplementationOnce(() => {
    throw new Error('asdf')
  })
  await expect(Dropbox.create(cred).list('asdf/fdsa')).rejects.toThrow()
  expect(mock).toHaveBeenCalled()
})

test('read: failure', async () => {
  const mock = filesDownload.mockImplementationOnce(() => {
    throw new Error('asdf')
  })
  await expect(Dropbox.create(cred).read('asdf')).rejects.toThrow('asdf')
  expect(mock).toHaveBeenCalled()
})

test('read: missing binary data', async () => {
  const mock = filesDownload.mockImplementationOnce(() => ({ result: {} }))
  await expect(Dropbox.create(cred).read('asdf')).rejects.toThrow(
    /missing file contents/i
  )
  expect(mock).toHaveBeenCalled()
})

test('read: success', async () => {
  const filename = 'a.txt'
  const mock = filesDownload.mockImplementationOnce(() => ({
    result: {
      fileBinary: Buffer.from('asdf'),
    },
  }))
  expect(await Dropbox.create(cred).read(filename)).toEqual(Buffer.from('asdf'))
  expect(mock).toHaveBeenCalledWith({ path: `/${filename}` })
})

test('read: stream', async () => {
  const filename = 'a.txt'
  const mock = filesDownload.mockImplementationOnce(() => ({
    result: {
      fileBinary: Buffer.from('asdf'),
    },
  }))

  const d = Dropbox.create(cred)
  const stream = await d.createReadStream(filename)
  expect(mock).toHaveBeenCalledWith({ path: `/${filename}` })
  const data = (await Util.drain(stream)).toString()
  expect(data).toEqual('asdf')
})

test('write: failure', async () => {
  const path = 'a.txt'
  const data = Buffer.from('asdf')
  const mock = filesUpload.mockImplementationOnce(async () => {
    throw new Error('fdsa')
  })

  const d = Dropbox.create(cred)
  await expect(d.write(path, data)).rejects.toThrow('fdsa')
  expect(mock).toHaveBeenCalledWith({ path: `/${path}`, contents: data })
})

test('write: success', async () => {
  const path = 'a.txt'
  const data = Buffer.from('asdf')
  const mock = filesUpload.mockImplementationOnce(async () => {})

  const d = Dropbox.create(cred)
  await d.write(path, data)
  expect(mock).toHaveBeenCalledWith({ path: `/${path}`, contents: data })
})

test('write: stream', async () => {
  const path = 'a.txt'
  const data = Buffer.from('asdf')
  const stream = Readable.from(data)
  const mock = filesUpload.mockImplementationOnce(async () => {})

  const d = Dropbox.create(cred)
  await d.writeStream(path, stream)
  expect(mock).toHaveBeenCalledWith({ path: `/${path}`, contents: data })
})
