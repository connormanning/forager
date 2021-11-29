import { Range } from './range'

export type PathType = 'file' | 'directory'
export type PathInfo = {
  path: string
  type: PathType
  size?: number
}
export type List = PathInfo[]
export { Range }
export type ReadOptions = { range?: Range }

export type Readable = {
  read(path: string, options?: ReadOptions): Promise<ArrayBuffer>
}
export type Writable = {
  write(path: string, data: ArrayBuffer | string): Promise<void>
}
/*
export type StreamReadable = {
  createReadStream(
    path: string,
    options?: ReadOptions
  ): Promise<ReadableStream<Uint8Array>>
}
export type StreamWritable = {
  writeStream(path: string, data: ReadableStream<Uint8Array>): Promise<void>
}
*/
export type Listable = {
  list(path: string): Promise<List>
}
export type Removable = {
  remove(path: string): Promise<void>
}

export type Driver = Readable &
  Writable &
  /*
  StreamReadable &
  StreamWritable &
  */
  Listable &
  Removable
