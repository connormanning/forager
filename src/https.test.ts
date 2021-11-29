test.todo('https')

/*
import { join } from 'path'
import { Agent, createServer, Server } from 'https'
import Koa from 'koa'

const actualFetch = jest.requireActual('node-fetch') as typeof fetch

// The fetch call will throw due to a self-signed cert from our fake test certs,
// so mock over it with a version that will not throw from that.
const agent = new Agent({ rejectUnauthorized: false })
jest.mock('node-fetch', () => {
  return (path: string) => actualFetch(path, { agent })
})

import { File, Http, Util } from '.'

const port = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT) : 3943
const url = `https://localhost:${port}`
const keyfile = join(__dirname, '../test/fake.key')
const certfile = join(__dirname, '../test/fake.cert')

async function listen(app: Koa): Promise<Server> {
  return new Promise(async (resolve, reject) => {
    const opts = {
      key: await File.read(keyfile),
      cert: await File.read(certfile),
    }
    const server = createServer(opts, app.callback()).listen(port, () =>
      resolve(server)
    )
  })
}
async function destroy(server: Server) {
  await new Promise((resolve) => server.close(resolve))
}

test('read stream', async () => {
  const app = new Koa()
  app.use((ctx) => (ctx.body = 'asdf'))
  const server = await listen(app)

  const got = await Util.drain(await Http.createReadStream(url))
  expect(got.toString()).toEqual('asdf')

  await destroy(server)
})
*/
