import * as Dropbox from './dropbox'
import * as S3 from './s3'

export type Options = Dropbox.Options | S3.Options
export const Options = { isDropbox: Dropbox.isOptions, isS3: S3.isOptions }
