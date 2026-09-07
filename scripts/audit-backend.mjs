import fs from 'node:fs'
import path from 'node:path'

const backend = path.resolve(process.argv[2] || '../liteShop_admin_miniSer')
const walk = (dir, extension) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.git', 'target', 'dist'].includes(entry.name)) return []
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file, extension) : extension.test(file) ? [file] : []
  })
const endpoints = []
for (const file of walk(backend, /\.java$/)) {
  const source = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  if (!source.includes('@RestController')) continue
  const prefix =
    source.slice(0, source.indexOf('public class')).match(/@RequestMapping\("([^"]*)"\)/)?.[1] || ''
  for (const match of source.matchAll(
    /@(Get|Post|Put|Delete|Patch)Mapping(?:\("([^"]*)"\))?([\s\S]*?)public\s+[^\n{]+\([\s\S]*?\)\s*\{/g
  )) {
    const signature = match[0]
    endpoints.push({
      method: match[1].toUpperCase(),
      url: prefix + (match[2] || ''),
      file: path.relative(backend, file),
      signature: signature.replace(/\s+/g, ' ')
    })
  }
}
const calls = []
for (const file of walk('src', /\.(ts|vue)$/)) {
  const source = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const match of source.matchAll(/url:\s*(['"`])(\/[^'"`\n]+)\1/g)) {
    const line = source.slice(0, match.index).split('\n').length
    let url = match[2].replace(/\$\{[^}]+\}/g, '{id}')
    if (
      /\s*\+/.test(source.slice(match.index + match[0].length, match.index + match[0].length + 8))
    )
      url += '{id}'
    const before = source.slice(Math.max(0, match.index - 700), match.index)
    const methods = [...before.matchAll(/request\s*\.\s*(get|post|put|del)\b/g)]
    const method = methods.at(-1)?.[1]?.replace('del', 'delete').toUpperCase()
    const normalize = (value) => value.replace(/\{[^}]+\}/g, '{}')
    const candidates = endpoints.filter((endpoint) => normalize(endpoint.url) === normalize(url))
    const matched = candidates.find((endpoint) => !method || method === endpoint.method)
    calls.push({ file, line, method, url, matched: !!matched, candidates })
  }
}
fs.mkdirSync('docs', { recursive: true })
fs.writeFileSync('docs/backend-contract.json', JSON.stringify({ endpoints, calls }, null, 2))
const missing = calls.filter((call) => !call.matched)
console.log(
  `${endpoints.length} backend endpoints, ${calls.length} frontend calls, ${missing.length} unmatched`
)
for (const item of missing)
  console.log(
    `${item.file}:${item.line} ${item.method || '?'} ${item.url} ${item.candidates.map((c) => c.method).join(',')}`
  )
if (missing.length) process.exitCode = 1
