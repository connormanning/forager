import { Server } from 'http'
import Koa from 'koa'

import { Http, Range, Util } from '.'

const port = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3942
const path = `localhost:${port}`
const url = `http://${path}`
async function listen(app: Koa): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server))
    app.on('error', reject)
  })
}
async function destroy(server: Server) {
  await new Promise((resolve) => server.close(resolve))
}

test('read', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = 'asdf'))
  const server = await listen(app)

  expect((await Http.read(url)).toString()).toEqual('asdf')
  expect((await Http.create('http').read(path)).toString()).toEqual('asdf')

  await destroy(server)
})

test('read range', async () => {
  const app = new Koa()
  const data = 'abcdef'
  app.use((ctx) => {
    const { range } = ctx.request.headers
    if (typeof range !== 'string') throw new Error('Missing range header')
    const [begin, end] = Range.fromHeaderValue(range)
    ctx.body = data.slice(begin, end)
  })
  const server = await listen(app)

  async function get(range: Range) {
    return (await Http.read(url, { range })).toString()
  }

  expect(await get([1, 5])).toEqual(data.slice(1, 5))
  expect(await get([1, Infinity])).toEqual(data.slice(1))

  expect(
    (
      await Util.drain(await Http.createReadStream(url, { range: [1, 5] }))
    ).toString()
  ).toEqual(data.slice(1, 5))

  await expect(Http.read(url, { range: [3, 2] })).rejects.toThrow()

  await destroy(server)
})

test('read coercions', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = { asdf: 42 }))
  const server = await listen(app)

  expect(await Http.readJson(url)).toEqual({ asdf: 42 })
  expect(await Http.readText(url)).toEqual('{"asdf":42}')

  await destroy(server)
})

test('read stream', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = 'asdf'))
  const server = await listen(app)

  const a = await Util.drain(await Http.createReadStream(url))
  expect(a.toString()).toEqual('asdf')
  const b = await Util.drain(await Http.create('http').createReadStream(path))
  expect(b.toString()).toEqual('asdf')

  await destroy(server)
})

test('read stream: fail', async () => {
  const app = new Koa()
  app.use((ctx) => {
    ctx.body = 'asdf'
    ctx.status = 404
  })
  const server = await listen(app)

  await expect(Http.createReadStream(url)).rejects.toThrow(Http.ResponseError)
  await destroy(server)
})

test('read stream: json fail', async () => {
  const app = new Koa()
  app.use((ctx) => {
    ctx.body = { value: 42 }
    ctx.status = 404
  })
  const server = await listen(app)

  await expect(Http.createReadStream(url)).rejects.toThrow(Http.ResponseError)
  await destroy(server)
})
