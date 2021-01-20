import { Server } from 'http'
import Koa from 'koa'

import { Http, Util } from '.'

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
