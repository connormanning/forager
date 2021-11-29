import { promises as fs } from 'fs'
import { join } from 'path'
import * as Stream from 'stream'

import { Forager, List, Utils } from '.'

const testdir = join(__dirname, '../test/storage.test')

beforeEach(async () => {
  await fs.rmdir(testdir, { recursive: true })
  await fs.mkdir(testdir)
})
afterEach(async () => {
  await fs.rmdir(testdir, { recursive: true })
})

test('invalid options', () => {
  expect(() => Forager.create('s3', 42 as any)).toThrow()
  expect(() => Forager.create('dropbox', 42 as any)).toThrow()
})

test('invalid op', async () => {
  const s3 = Forager.create('s3', { region: '', access: '', secret: '' })
  await expect(s3.remove('asdf')).rejects.toThrow('s3: remove not supported')

  const dropbox = Forager.create('dropbox', { token: '' })
  await expect(dropbox.remove('asdf')).rejects.toThrow(
    'dropbox: remove not supported'
  )
})

test('create', () => {
  expect(() => Forager.create({ protocol: 'asdf' } as any)).toThrow()

  Forager.create('')
  Forager.create('http')
  Forager.create('https')
})

test('read/write/remove', async () => {
  const filename = join(testdir, 'f.txt')
  const data = JSON.stringify({ a: 1 })
  await Forager.write(filename, data)

  expect((await Forager.read(filename)).toString()).toEqual(data)
  expect(await Forager.readString(filename)).toEqual(data)
  expect(await Forager.readJson(filename)).toEqual({ a: 1 })

  await Forager.remove(filename)
  await expect(Forager.read(filename)).rejects.toThrow()
})

/*
test('streams', async () => {
  const filename = join(testdir, 'f.txt')
  const data = 'sss'
  await Forager.writeStream(filename, Stream.Readable.from(data))
  expect(
    (await Util.drain(await Forager.createReadStream(filename))).toString()
  ).toEqual(data)
})
*/

test('copy', async () => {
  const input = join(testdir, 'a.txt')
  const output = join(testdir, 'b.txt')
  const data = 'ccc'
  await Forager.write(input, data)
  await Forager.copyFile(input, output)
  expect((await Forager.read(output)).toString()).toEqual(data)
})

test('list', async () => {
  await fs.mkdir(join(testdir, 'a'))
  await fs.mkdir(join(testdir, 'a/b'))
  await fs.mkdir(join(testdir, 'a/b/c'))

  await fs.writeFile(join(testdir, '1.txt'), '1')
  await fs.writeFile(join(testdir, 'a/2.txt'), '22')
  await fs.writeFile(join(testdir, 'a/b/3.txt'), '333')
  await fs.writeFile(join(testdir, 'a/b/c/4.txt'), '4444')

  expect(await Forager.list(testdir)).toEqual<List>([
    { type: 'file', path: '1.txt', size: 1 },
    { type: 'directory', path: 'a' },
  ])

  expect(await Forager.list(testdir, true)).toEqual<List>([
    { type: 'file', path: '1.txt', size: 1 },
    { type: 'file', path: 'a/2.txt', size: 2 },
    { type: 'file', path: 'a/b/3.txt', size: 3 },
    { type: 'file', path: 'a/b/c/4.txt', size: 4 },
  ])
})

test('remove', async () => {})
