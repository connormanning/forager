export type PathType = 'file' | 'directory'
export type PathInfo = {
  path: string
  type: PathType
  size?: number
}
export type List = PathInfo[]

export type Readable = {
  read(path: string): Promise<Buffer>
}
export type Writable = {
  write(path: string, data: Buffer | string): Promise<void>
}
export type StreamReadable = {
  createReadStream(path: string): Promise<NodeJS.ReadableStream>
}
export type StreamWritable = {
  writeStream(path: string, data: NodeJS.ReadableStream): Promise<void>
}
export type Listable = {
  list(path: string): Promise<List>
}
export type Removable = {
  remove(path: string): Promise<void>
}

export type Driver = Readable &
  Writable &
  StreamReadable &
  StreamWritable &
  Listable &
  Removable
