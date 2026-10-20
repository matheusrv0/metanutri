// M-9 (spec revisao-geral-publica, D-236): o escopo do tema claro tem um nome neutro, `.tema-claro`, declarado junto com
// `:root` e `.papel`. O checkout usa `.tema-claro`; `.papel` continua servindo à folha impressa.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ler = (caminho: string) => readFileSync(fileURLToPath(new URL(caminho, import.meta.url)), 'utf8')

describe('o escopo do tema claro (D-236)', () => {
  it('os tokens do tema claro valem em :root, .papel e .tema-claro', () => {
    expect(ler('../../../design-system/tokens/tokens.css')).toMatch(/:root,\s*\.papel,\s*\.tema-claro\s*\{\s*--brand-primary/)
  })

  it('a ponte do shadcn/ui é declarada de novo em .papel e .tema-claro, e os dois são claros', () => {
    const globais = ler('./globals.css')
    expect(globais).toMatch(/:root,\s*\.papel,\s*\.tema-claro\s*\{\s*\/\*[^]*?--color-primary/)
    expect(globais).toMatch(/\.papel,\s*\.tema-claro\s*\{\s*color-scheme: light;/)
  })
})
