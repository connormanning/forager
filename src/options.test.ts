import { Forager, Options } from '.'

test('is dropbox', () => {
  expect(Forager.Options.isDropbox({ token: '' })).toBe(true)
  expect(Options.isDropbox({ token: '' })).toBe(true)
})

test('is dropbox', () => {
  expect(Forager.Options.isS3({ access: '', secret: '' })).toBe(true)
  expect(Options.isS3({ access: '', secret: '' })).toBe(true)
})
