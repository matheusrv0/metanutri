// @vitest-environment node
// CA-2355 (spec assistente-ia, D-1315 e DP-IA-3): o catálogo que a função sugerir-plano manda à IA é o que a base atual
// gera. Mudou a base (a tabela, a base ampliada, a curadoria ou a regra prescritível), este teste falha e diz o comando
// que regrava o arquivo da função. O texto não tem data nem hora: o cache da Anthropic depende de ele ser estável.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOGO_IA, IDS_DO_CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from '../domain/baseAmpliada.ts'
import { montarCatalogoIa } from '../domain/iaCatalogo.ts'
import { regraQueExclui } from '../domain/prescritivel.ts'
import { ALIMENTOS, buscarAlimento, registrarBaseAmpliada } from '../domain/tabelas.ts'
import arquivo from './base-ampliada.json'

const AMPLIADA = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
registrarBaseAmpliada(AMPLIADA)

const ARQUIVO_DA_FUNCAO = join(process.cwd(), 'supabase', 'functions', '_shared', 'iaCatalogo.ts')
const COMANDO = 'ATUALIZAR_CATALOGO_IA=1 npx vitest run src/data/iaCatalogo.test.ts'

function conteudoDoArquivo(texto: string, ids: readonly number[]): string {
  return [
    '// O catálogo da Base MetaNutri que a função sugerir-plano manda à IA (spec assistente-ia, D-1315). GERADO: não edite à mão.',
    `// Para gerar de novo, depois de mudar a base ou a regra prescritível: ${COMANDO}`,
    `// ${ids.length} alimentos.`,
    '',
    `export const CATALOGO_IA = ${JSON.stringify(texto)}`,
    '',
    `export const IDS_DO_CATALOGO_IA: readonly number[] = ${JSON.stringify(ids)}`,
    '',
  ].join('\n')
}

const gerado = montarCatalogoIa([...ALIMENTOS, ...AMPLIADA])

describe('CA-2355: o catálogo da função é o que a base gera', () => {
  it.runIf(process.env['ATUALIZAR_CATALOGO_IA'] === '1')('regrava o arquivo da função', () => {
    writeFileSync(ARQUIVO_DA_FUNCAO, conteudoDoArquivo(gerado.texto, gerado.ids))
    expect(readFileSync(ARQUIVO_DA_FUNCAO, 'utf8')).toBe(conteudoDoArquivo(gerado.texto, gerado.ids))
  })

  it(`o texto e os ids batem (se não baterem: ${COMANDO})`, () => {
    expect(CATALOGO_IA).toBe(gerado.texto)
    expect(IDS_DO_CATALOGO_IA).toEqual(gerado.ids)
  })

  it('cada id do catálogo é uma linha e um alimento da base que passa na regra prescritível', () => {
    const linhas = CATALOGO_IA.split('\n').filter((l) => /^\d+ \| /.test(l))
    expect(linhas.map((l) => Number(l.split(' | ')[0])).sort((a, b) => a - b)).toEqual([...IDS_DO_CATALOGO_IA].sort((a, b) => a - b))
    for (const id of IDS_DO_CATALOGO_IA) {
      const a = buscarAlimento(id)
      expect(a, `id ${id}`).toBeDefined()
      if (a) expect(regraQueExclui(a)?.nivel ?? null, a.descricao).not.toBe('nunca')
    }
  })

  it('o tamanho cabe no cache com folga: de 300 a 600 alimentos e menos de 45 mil caracteres', () => {
    expect(IDS_DO_CATALOGO_IA.length).toBeGreaterThanOrEqual(300)
    expect(IDS_DO_CATALOGO_IA.length).toBeLessThanOrEqual(600)
    expect(CATALOGO_IA.length).toBeLessThan(45_000)
    expect(CATALOGO_IA).not.toMatch(/\b(TACO|USDA|IBGE)\b/)
  })
})
