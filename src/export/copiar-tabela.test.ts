import { calcularAdequacao } from '../domain/adequacao.ts'
import type { Totais } from '../domain/totais.ts'
import { CHAVES_NUTRIENTES } from '../domain/totais.ts'
import type { ChaveNutrienteAlimento } from '../domain/tipos.ts'
import { formatarNumero, tabelaAdequacaoParaCopiar } from './copiar-tabela.ts'

const totais = (v: Partial<Record<ChaveNutrienteAlimento, number>>, semDado: Partial<Record<ChaveNutrienteAlimento, number>> = {}): Totais => ({
  itens: 2,
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, { total: v[k] ?? 0, semDado: semDado[k] ?? 0 }])) as Totais['nutrientes'],
})

const MULHER_28 = { sexo: 'F' as const, idadeAnos: 28, condicao: { tipo: 'nenhuma' as const } }

describe('formatarNumero', () => {
  it.each([
    [1234.567, 1, '1.234,6'],
    [9, 1, '9,0'],
    [0.0833, 2, '0,08'],
    [16.2, 0, '16'],
  ])('%s com %i casas -> %s', (n, casas, esperado) => {
    expect(formatarNumero(n, casas)).toBe(esperado)
  })
})

describe('tabelaAdequacaoParaCopiar (CA-48)', () => {
  const adequacao = calcularAdequacao(totais({ ferro_mg: 9, potassio_mg: 2700, sodio_mg: 2500 }, { vitamina_c_mg: 1 }), MULHER_28, { tipo: 'individual' })
  const { html, texto } = tabelaAdequacaoParaCopiar(adequacao)

  it('gera uma tabela HTML com cabeçalho e uma linha por micronutriente', () => {
    expect(html.startsWith('<table')).toBe(true)
    expect((html.match(/<tr>/g) ?? []).length).toBe(1 + adequacao.linhas.length)
    expect(html).toContain('<th>Nutriente</th>')
  })

  it('usa formato brasileiro nos números e mostra o tipo de referência', () => {
    expect(html).toContain('<td>Ferro</td><td>9,0 mg</td><td>18,0 mg</td><td>RDA</td><td>50%</td><td>Abaixo da meta</td>')
    expect(html).toContain('<td>Potássio</td><td>2.700,0 mg</td><td>2.600,0 mg</td><td>AI</td><td>104%</td><td>Adequado</td>')
  })

  it('marca limite superior ultrapassado e total possivelmente subestimado', () => {
    expect(html).toContain('<td>Sódio</td>')
    expect(html).toMatch(/Acima do limite \(CDRR 2\.300,0 mg\)/)
    expect(html).toMatch(/Vitamina C<\/td><td>0,00 mg \*<\/td>/) // valores em mg abaixo de 1 usam 2 casas
    expect(html).toContain('* 1 ou mais alimentos sem dado')
  })

  it('gera também texto separado por tabulação, para colar em planilha', () => {
    const linhas = texto.split('\n')
    expect(linhas[0]).toBe('Nutriente\tTotal\tReferência\tTipo\tAdequação\tEstado')
    expect(linhas).toContain('Ferro\t9,0 mg\t18,0 mg\tRDA\t50%\tAbaixo da meta')
  })

  it('escapa caracteres especiais de HTML', () => {
    const primeira = adequacao.linhas[0]
    if (!primeira) throw new Error('sem linhas')
    const r = tabelaAdequacaoParaCopiar({ ...adequacao, linhas: [{ ...primeira, rotulo: 'A<b>&"' }] })
    expect(r.html).toContain('A&lt;b&gt;&amp;&quot;')
  })

  it('sem estágio de vida, gera só o motivo', () => {
    const vazia = calcularAdequacao(totais({}), { sexo: null, idadeAnos: null, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
    const r = tabelaAdequacaoParaCopiar(vazia)
    expect(r.texto).toMatch(/Informe sexo e idade/)
    expect(r.html).not.toContain('<table')
  })
})
