/** Small uncompressed ZIP writer for exporting generated QR-code PNGs. */
const crcTable = new Uint32Array(256).map((_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  return crc >>> 0
})
const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function record(length: number) {
  const bytes = new Uint8Array(length)
  return { bytes, view: new DataView(bytes.buffer) }
}
export default class ZipArchive {
  private entries: { name: string; content: Blob | Uint8Array | string; base64?: boolean }[] = []
  file(name: string, content: Blob | Uint8Array | string, options?: { base64?: boolean }) {
    this.entries.push({ name, content, base64: options?.base64 })
    return this
  }
  async generateAsync(_options: { type: 'blob'; compression?: string }): Promise<Blob> {
    const local: Uint8Array[] = [],
      central: Uint8Array[] = []
    let offset = 0
    for (const entry of this.entries) {
      const name = new TextEncoder().encode(entry.name)
      const data =
        entry.content instanceof Blob
          ? new Uint8Array(await entry.content.arrayBuffer())
          : typeof entry.content === 'string'
            ? entry.base64
              ? Uint8Array.from(atob(entry.content), (c) => c.charCodeAt(0))
              : new TextEncoder().encode(entry.content)
            : entry.content
      const crc = crc32(data),
        header = record(30),
        directory = record(46)
      header.view.setUint32(0, 0x04034b50, true)
      header.view.setUint16(4, 20, true)
      header.view.setUint16(6, 0x800, true)
      header.view.setUint32(14, crc, true)
      header.view.setUint32(18, data.length, true)
      header.view.setUint32(22, data.length, true)
      header.view.setUint16(26, name.length, true)
      directory.view.setUint32(0, 0x02014b50, true)
      directory.view.setUint16(4, 20, true)
      directory.view.setUint16(6, 20, true)
      directory.view.setUint16(8, 0x800, true)
      directory.view.setUint32(16, crc, true)
      directory.view.setUint32(20, data.length, true)
      directory.view.setUint32(24, data.length, true)
      directory.view.setUint16(28, name.length, true)
      directory.view.setUint32(42, offset, true)
      local.push(header.bytes, name, data)
      central.push(directory.bytes, name)
      offset += 30 + name.length + data.length
    }
    const end = record(22),
      centralSize = central.reduce((sum, bytes) => sum + bytes.length, 0)
    end.view.setUint32(0, 0x06054b50, true)
    end.view.setUint16(8, this.entries.length, true)
    end.view.setUint16(10, this.entries.length, true)
    end.view.setUint32(12, centralSize, true)
    end.view.setUint32(16, offset, true)
    return new Blob([...local, ...central, end.bytes], { type: 'application/zip' })
  }
}
