import { Server } from 'http'
import Koa from 'koa'

import { Http, Range, Utils } from '.'

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

test('read: json fail', async () => {
  const app = new Koa()
  const code = 404
  const body = { error: 'something' }
  app.use((ctx) => {
    ctx.set('Content-Type', 'application/json')
    ctx.body = body
    ctx.status = code
  })
  const server = await listen(app)

  try {
    try {
      await Http.read(url)
    } catch (e) {
      if (!(e instanceof Http.ResponseError)) throw e
      expect(e.body).toEqual(body)
      expect(e.code).toEqual(code)
    }
  } finally {
    await destroy(server)
  }
})

test('read: text fail', async () => {
  const app = new Koa()
  const code = 404
  const body = 'something'
  app.use((ctx) => {
    ctx.body = body
    ctx.status = code
  })
  const server = await listen(app)

  try {
    try {
      await Http.read(url)
    } catch (e) {
      if (!(e instanceof Http.ResponseError)) throw e
      expect(e.body).toEqual(body)
      expect(e.code).toEqual(code)
    }
  } finally {
    await destroy(server)
  }
})

test('read: success', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = 'asdf'))
  const server = await listen(app)

  try {
    expect(Utils.arrayBufferToString(await Http.read(url))).toEqual('asdf')
    expect(
      Utils.arrayBufferToString(await Http.create('http').read(path))
    ).toEqual('asdf')
  } finally {
    await destroy(server)
  }
})

test('read: range', async () => {
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
    return Utils.arrayBufferToString(await Http.read(url, { range }))
  }

  try {
    expect(await get([1, 5])).toEqual(data.slice(1, 5))
    expect(await get([1, Infinity])).toEqual(data.slice(1))

    /*
    expect(
      decoder.decode(
        await Util.drain(await Http.createReadStream(url, { range: [1, 5] }))
      )
    ).toEqual(data.slice(1, 5))
    */

    await expect(Http.read(url, { range: [3, 2] })).rejects.toThrow()
  } finally {
    await destroy(server)
  }
})

test('read: coercions', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = { asdf: 42 }))
  const server = await listen(app)

  try {
    expect(await Http.readJson(url)).toEqual({ asdf: 42 })
    expect(await Http.readText(url)).toEqual('{"asdf":42}')
  } finally {
    await destroy(server)
  }
})

/*
test('read stream', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = 'asdf'))
  const server = await listen(app)

  try {
    const a = await Util.drain(await Http.createReadStream(url))
    expect(decoder.decode(a)).toEqual('asdf')
    const b = await Util.drain(await Http.create('http').createReadStream(path))
    expect(decoder.decode(b)).toEqual('asdf')
  } finally {
    await destroy(server)
  }
})

test('read stream: fail', async () => {
  const app = new Koa()
  app.use((ctx) => {
    ctx.body = 'asdf'
    ctx.status = 404
  })
  const server = await listen(app)

  try {
    await expect(Http.createReadStream(url)).rejects.toThrow(Http.ResponseError)
  } finally {
    await destroy(server)
  }
})

test('read stream: json fail', async () => {
  const app = new Koa()
  app.use((ctx) => {
    ctx.body = { value: 42 }
    ctx.status = 404
  })
  const server = await listen(app)

  try {
    await expect(Http.createReadStream(url)).rejects.toThrow(Http.ResponseError)
  } finally {
    await destroy(server)
  }
})
*/
