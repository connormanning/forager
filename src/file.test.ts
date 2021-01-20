import { promises as fs } from 'fs'
import path from 'path'
import * as Stream from 'stream'

import { File, Util } from '.'

const testdir = path.join(__dirname, '../test/file.test')

beforeEach(async () => {
  await fs.rmdir(testdir, { recursive: true })
  await fs.mkdir(testdir)
})
afterEach(async () => {
  await fs.rmdir(testdir, { recursive: true })
})

test('read', async () => {
  const filename = path.join(testdir, 'a.txt')
  const data = 'aaa'
  await fs.writeFile(filename, data)
  expect((await File.read(filename)).toString()).toEqual(data)
})

test('write', async () => {
  const filename = path.join(testdir, 'a.txt')
  const data = 'fff'
  await File.write(filename, data)
  expect(await fs.readFile(filename, { encoding: 'utf8' })).toEqual(data)
})

test('read stream', async () => {
  const data = 'ggg'
  const filename = path.join(testdir, 'a.txt')
  await fs.writeFile(filename, data)

  const stream = await File.create().createReadStream(filename)
  const result = await Util.drain(stream)
  expect(result.toString()).toEqual(data)
})

test('write stream', async () => {
  const data = 'ggg'
  const filename = path.join(testdir, 'a.txt')
  await File.create().writeStream(filename, Stream.Readable.from(data))
  expect(await fs.readFile(filename, { encoding: 'utf8' })).toEqual(data)
})

test('list', async () => {
  const a = path.join(testdir, 'a.txt')
  const b = path.join(testdir, 'b.txt')
  const c = path.join(testdir, 'subdir/c.txt')
  const s = path.join(testdir, 'c.txt')
  await fs.mkdir(path.join(testdir, 'subdir'))
  await fs.writeFile(a, 'a')
  await fs.writeFile(b, 'bb')
  await fs.writeFile(c, 'ccc')
  // Symlinked file.
  await fs.symlink(c, s)
  // Symlinked directory.
  await fs.symlink(path.join(testdir, 'subdir'), path.join(testdir, 'symdir'))
  const list = await File.list(testdir)
  expect(list).toEqual([
    { path: 'a.txt', type: 'file', size: 1 },
    { path: 'b.txt', type: 'file', size: 2 },
    { path: 'subdir', type: 'directory' },
  ])
})

test('remove', async () => {
  const filename = path.join(testdir, 'a.txt')
  const data = 'fff'

  await fs.writeFile(filename, data)
  await fs.access(filename)

  await File.remove(filename)
  await expect(fs.access(filename)).rejects.toThrow()
})
