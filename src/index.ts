// import fetch from 'cross-fetch'
// if (!window.fetch) window.fetch = fetch

export * as Dropbox from './dropbox'
export * as File from './file'
export * as Http from './http'
export * as S3 from './s3'

export { Options } from './options'
export * from './types'
export * as Utils from './utils'

import * as Forager from './forager'
export { Forager }
export default Forager
