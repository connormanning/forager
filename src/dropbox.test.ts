import { Dropbox } from '.'

const filesListFolder = jest.fn()
jest.mock('dropbox', () => ({
  Dropbox: jest.fn(() => ({
    filesListFolder,
  })),
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
  expect(Dropbox.create(cred).list('asdf/fdsa')).rejects.toThrow()
  expect(mock).toHaveBeenCalled()
})
