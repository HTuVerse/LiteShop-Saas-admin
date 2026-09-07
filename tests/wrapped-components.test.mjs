import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

const srcRoot = resolve('src')
const wrapperImplementations = new Set([
  'components/core/forms/art-form/index.vue',
  'components/core/forms/art-search-bar/index.vue',
  'components/core/tables/art-table/index.vue'
])

async function vueFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return vueFiles(path)
      return entry.isFile() && entry.name.endsWith('.vue') ? [path] : []
    })
  )
  return nested.flat()
}

test('frontend pages use ArtTable and ArtForm instead of raw outer components', async () => {
  const violations = []
  for (const file of await vueFiles(srcRoot)) {
    const name = relative(srcRoot, file).split(sep).join('/')
    if (wrapperImplementations.has(name)) continue

    const source = await readFile(file, 'utf8')
    for (const component of ['ElTable', 'ElTableColumn', 'ElForm', 'table', 'form']) {
      const pattern = new RegExp(`<\\/?${component}(?=\\s|>)`, 'gi')
      if (pattern.test(source)) violations.push(`${name}: direct ${component} usage`)
    }

    if (/<ArtTable(?=\s|>)/.test(source)) {
      if (!source.includes("from '@/hooks/core/useTable'")) {
        violations.push(`${name}: ArtTable does not use useTable`)
      }
      if (!source.includes('columnsFactory')) {
        violations.push(`${name}: ArtTable does not configure columnsFactory`)
      }
      if (!/\b(apiFn|dataSource)\s*:/.test(source)) {
        violations.push(`${name}: useTable has no real API or local data source`)
      }
      if (/apiFn:\s*async\s*\([^)]*\)\s*=>\s*\[\]/.test(source)) {
        violations.push(`${name}: useTable uses an empty API placeholder`)
      }
      if (/<ElPagination\b/.test(source)) {
        violations.push(`${name}: ArtTable pagination is implemented outside the wrapper`)
      }
      if (/label:\s*['"]操作['"][\s\S]{0,200}?useSlot:\s*true/.test(source)) {
        violations.push(`${name}: operation column uses a template slot instead of formatter`)
      }
      for (const opening of source.matchAll(/<ArtTable\b[^>]*>/g)) {
        if (!/:columns\s*=/.test(opening[0])) {
          violations.push(`${name}: ArtTable is missing columns from useTable`)
        }
      }
    }
  }

  assert.deepEqual(violations, [])
})

test('table reservation page delegates data and pagination to useTable', async () => {
  const source = await readFile(
    resolve(srcRoot, 'views/cashier/tableReservation/index.vue'),
    'utf8'
  )

  assert.match(source, /apiFn:\s*fetchTableReservationPage/)
  assert.match(source, /:pagination="pagination"/)
  assert.match(source, /@pagination:size-change="handleSizeChange"/)
  assert.match(source, /@pagination:current-change="handleCurrentChange"/)
  assert.match(source, /replaceSearchParams\s*\(/)
  assert.match(source, /prop:\s*'operation'[\s\S]*?formatter:\s*\(/)
  assert.doesNotMatch(source, /slotName:\s*'tableColumnsSlot8'/)
  assert.doesNotMatch(source, /<ElPagination\b/)
  assert.doesNotMatch(source, /apiFn:\s*async\s*\(\)\s*=>\s*\[\]/)
})
