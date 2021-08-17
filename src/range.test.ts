import { Range } from '.'

test('to header value', () => {
  expect(Range.toHeaderValue([0, Infinity])).toEqual('bytes=0-')
  expect(Range.toHeaderValue([0, 1])).toEqual('bytes=0-0')
  expect(Range.toHeaderValue([0, 5])).toEqual('bytes=0-4')

  expect(() => Range.toHeaderValue([-1, 2])).toThrow()
  expect(() => Range.toHeaderValue([1, -2])).toThrow()
  expect(() => Range.toHeaderValue([3, 2])).toThrow()
})

test('from header value', () => {
  expect(Range.fromHeaderValue('bytes=')).toEqual([0, Infinity])
  expect(Range.fromHeaderValue('bytes=0-')).toEqual([0, Infinity])
  expect(Range.fromHeaderValue('bytes=0-0')).toEqual([0, 1])
  expect(Range.fromHeaderValue('bytes=0-4')).toEqual([0, 5])

  expect(() => Range.fromHeaderValue('asdf')).toThrow()
})
