import { promises as fs } from 'fs'
import { join } from 'path'
import * as Stream from 'stream'

import { List, Storage, Util } from '.'

const testdir = join(__dirname, '../test/storage.test')

beforeEach(async () => {
  await fs.rmdir(testdir, { recursive: true })
  await fs.mkdir(testdir)
})
afterEach(async () => {
  await fs.rmdir(testdir, { recursive: true })
})

test('invalid options', () => {
  expect(() => Storage.create('s3', 42)).toThrow()
  expect(() => Storage.create('dropbox', 42)).toThrow()
})

test('invalid op', async () => {
  const s3 = Storage.create('s3', { region: '', access: '', secret: '' })
  await expect(s3.remove('asdf')).rejects.toThrow('s3: remove not supported')

  const dropbox = Storage.create('dropbox', { token: '' })
  await expect(dropbox.remove('asdf')).rejects.toThrow(
    'dropbox: remove not supported'
  )
})

test('create', () => {
  expect(() => Storage.create({ protocol: 'asdf' } as any)).toThrow()

  Storage.create('')
  Storage.create('http')
  Storage.create('https')
})

test('read/write/remove', async () => {
  const filename = join(testdir, 'f.txt')
  const data = JSON.stringify({ a: 1 })
  await Storage.write(filename, data)

  expect((await Storage.read(filename)).toString()).toEqual(data)
  expect(await Storage.readString(filename)).toEqual(data)
  expect(await Storage.readJson(filename)).toEqual({ a: 1 })

  await Storage.remove(filename)
  await expect(Storage.read(filename)).rejects.toThrow()
})

test('streams', async () => {
  const filename = join(testdir, 'f.txt')
  const data = 'sss'
  await Storage.writeStream(filename, Stream.Readable.from(data))
  expect(
    (await Util.drain(await Storage.createReadStream(filename))).toString()
  ).toEqual(data)
})

test('copy', async () => {
  const input = join(testdir, 'a.txt')
  const output = join(testdir, 'b.txt')
  const data = 'ccc'
  await Storage.write(input, data)
  await Storage.copyFile(input, output)
  expect((await Storage.read(output)).toString()).toEqual(data)
})

test('list', async () => {
  await fs.mkdir(join(testdir, 'a'))
  await fs.mkdir(join(testdir, 'a/b'))
  await fs.mkdir(join(testdir, 'a/b/c'))

  await fs.writeFile(join(testdir, '1.txt'), '1')
  await fs.writeFile(join(testdir, 'a/2.txt'), '22')
  await fs.writeFile(join(testdir, 'a/b/3.txt'), '333')
  await fs.writeFile(join(testdir, 'a/b/c/4.txt'), '4444')

  expect(await Storage.list(testdir)).toEqual<List>([
    { type: 'file', path: '1.txt', size: 1 },
    { type: 'directory', path: 'a' },
  ])

  expect(await Storage.list(testdir, true)).toEqual<List>([
    { type: 'file', path: '1.txt', size: 1 },
    { type: 'file', path: 'a/2.txt', size: 2 },
    { type: 'file', path: 'a/b/3.txt', size: 3 },
    { type: 'file', path: 'a/b/c/4.txt', size: 4 },
  ])
})

test('remove', async () => {})
