// Temporário (spec landing-v3, PLAN T12): os números da v3 que as seções antigas ainda usam; sai com elas.
// CA-1467 a CA-1469, CA-1472 e CA-1473 (spec landing-escura, D-537 a D-541) e CA-1601 a CA-1607 (spec landing-v3,
// D-601 a D-606): os números da landing são os do app. As constantes ficam leves na página; este teste roda o motor e a
// base de verdade e falha se uma letra divergir (R-530).
import { calcularAdequacao, type LinhaAdequacao } from '@/domain/adequacao.ts'
import { buscarAlimentos, leituraDoResultado } from '@/domain/busca.ts'
import { sugerirParaCobrir, type Sugestao } from '@/domain/cobrir.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { quantidadeNoPlano, valorDeReferencia } from '@/domain/formatarQuantidade.ts'
import { nomeParaPaciente } from '@/domain/nomeParaPaciente.ts'
import type { RestricoesDoPaciente } from '@/domain/restricoes.ts'
import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { ChaveNutrienteAlimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { pctDaReferencia, porcaoDaSugestao } from '@/ui/adequacao/estiloAdequacao.ts'
import {
  ADEQUACAO_DO_EXEMPLO,
  CARTOES_DA_VITRINE,
  COBRIR_CALCIO,
  DIA_EM_GRAMAS,
  FEIJAO_NA_CONCHA,
  type ChaveDaVitrine,
  type LinhaDoCobrir,
} from './exemploDaLanding.ts'

const NUTRIENTE: Readonly<Record<ChaveDaVitrine, ChaveNutrienteAlimento>> = {
  calcio: 'calcio_mg',
  'vitamina-e': 'vitamina_e_mg',
  'vitamina-d': 'vitamina_d_mcg',
}

/** O plano de exemplo como o app abre: o mesmo caso, o mesmo gasto e as mesmas escolhas da gaveta do Cobrir. */
function oExemplo(restricoes?: RestricoesDoPaciente) {
  let n = 0
  const { caso, plano } = criarExemplo(() => `id-${n++}`, '2026-10-27')
  const totais = totaisDoPlano(plano, buscarAlimento)
  const adequacao = calcularAdequacao(totais, caso, caso.adequacao.preset)
  const gasto = calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }).get
  const cobrir = (chave: ChaveNutrienteAlimento) =>
    sugerirParaCobrir(chave, totais, adequacao, {
      alimentos: ALIMENTOS,
      gastoEnergetico: gasto,
      porcaoMaximaG: caso.adequacao.porcaoMaximaG,
      idadeAnos: caso.idadeAnos,
      incluirIngredientes: caso.adequacao.incluirIngredientes,
      ...(restricoes ? { restricoes } : {}),
    })
  const linha = (chave: ChaveNutrienteAlimento): LinhaAdequacao => {
    const achada = adequacao.linhas.find((l) => l.chave === chave)
    if (!achada) throw new Error(`O exemplo não tem a linha ${chave}`)
    return achada
  }
  return { caso, plano, cobrir, linha }
}

/** O nome como a gaveta do Cobrir mostra, sem o tempo de cozimento da tabela ("cozida/10minutos"). */
const nomeNaLanding = (descricao: string) =>
  descricao
    .replace(/\s+/g, ' ')
    .replace(/\/\d+\s*minutos$/, '')
    .trim()

/** D-602: a porção como a gaveta escreve, sem a medida caseira: os gramas (ou mililitros) e o "(peso cru)". */
const gramasDaSugestao = (s: Sugestao) => porcaoDaSugestao({ gramas: s.gramas, medida: null }, buscarAlimento(s.alimentoId))

const linhaDoCobrir = (s: Sugestao): LinhaDoCobrir => ({
  nome: nomeNaLanding(s.descricao),
  gramas: gramasDaSugestao(s),
  cobre: `${formatarNumero(s.coberturaPct, 0)}%`,
  kcal: formatarNumero(s.kcalAdicionadas, 0),
})

/** D-537: as três primeiras com o primeiro nome diferente (a vitamina D traz dois salmões seguidos). */
function tresDeNomeDiferente(sugestoes: readonly Sugestao[]): Sugestao[] {
  const vistos = new Set<string>()
  const escolhidas: Sugestao[] = []
  for (const s of sugestoes) {
    const primeiro = s.descricao.split(',')[0]?.trim() ?? ''
    if (vistos.has(primeiro)) continue
    vistos.add(primeiro)
    escolhidas.push(s)
    if (escolhidas.length === 3) break
  }
  return escolhidas
}

describe('CA-1467: o campo vivo tem os números do motor', () => {
  it.each(['calcio', 'vitamina-e', 'vitamina-d'] as const)('o cartão de %s é o que o Cobrir dá para a Maria', (chave) => {
    const exemplo = oExemplo()
    const nutriente = NUTRIENTE[chave]
    const linha = exemplo.linha(nutriente)
    const resultado = exemplo.cobrir(nutriente)
    expect(CARTOES_DA_VITRINE[chave]).toEqual({
      nome: linha.rotulo,
      total: `${quantidadeNoPlano(linha.total)} de ${valorDeReferencia(linha.referencia.valor)} ${linha.unidade} no dia`,
      falta: `${quantidadeNoPlano(resultado.falta)} ${resultado.unidade}`,
      linhas: tresDeNomeDiferente(resultado.sugestoes).map(linhaDoCobrir),
    })
  })

  it('o cálcio da Maria: 640 de 1.000 mg, faltam 260 mg (o retrato de hoje, para quem lê o teste)', () => {
    expect(CARTOES_DA_VITRINE.calcio.total).toBe('640 de 1.000 mg no dia')
    expect(CARTOES_DA_VITRINE.calcio.falta).toBe('260 mg')
    expect(CARTOES_DA_VITRINE['vitamina-e'].falta).toBe('8,1 mg')
    expect(CARTOES_DA_VITRINE['vitamina-d'].falta).toBe('11,4 µg')
  })
})

describe('CA-1468: Como funciona tem os números do motor', () => {
  it('as três linhas da adequação são as do exemplo', () => {
    const exemplo = oExemplo()
    expect(ADEQUACAO_DO_EXEMPLO).toEqual(
      (['calcio', 'vitamina-e', 'vitamina-d'] as const).map((chave) => {
        const linha = exemplo.linha(NUTRIENTE[chave])
        const pct = Number(pctDaReferencia(linha).replace(/% da referência$/, ''))
        return {
          nome: linha.rotulo,
          quanto: `${quantidadeNoPlano(linha.total)} de ${valorDeReferencia(linha.referencia.valor)} ${linha.unidade} · ${pct}%`,
          pct,
        }
      }),
    )
  })

  it('"Cobrir cálcio" mostra as cinco sugestões do motor, na ordem dele', () => {
    const resultado = oExemplo().cobrir('calcio_mg')
    expect(COBRIR_CALCIO).toEqual({
      falta: `${quantidadeNoPlano(resultado.falta)} ${resultado.unidade}`,
      linhas: resultado.sugestoes.map(linhaDoCobrir),
    })
    expect(COBRIR_CALCIO.linhas).toHaveLength(5)
  })

})

describe('CA-1601 e CA-1603: a gramatura vem do motor', () => {
  it('CA-1603: o campo vivo e "Cobrir cálcio" mostram só os gramas, sem a medida caseira', () => {
    const linhas = [...Object.values(CARTOES_DA_VITRINE).flatMap((c) => c.linhas), ...COBRIR_CALCIO.linhas]
    for (const linha of linhas) expect(linha.gramas, linha.nome).toMatch(/^\d+ (g|ml)( \(peso cru\))?$/)
    expect(CARTOES_DA_VITRINE.calcio.linhas.map((l) => l.gramas)).toEqual(['60 g', '150 g', '60 g'])
  })
})

describe('CA-1469 e CA-1605: Grama por grama e o feijão vêm da Base MetaNutri', () => {
  /** O texto que a nutricionista digitaria para cada linha: os gramas e o alimento. */
  const BUSCA: Readonly<Record<string, string>> = {
    'Pão francês': '50 pao frances',
    'Ovo cozido': '45 ovo cozido',
    'Mamão Formosa': '170 mamao formosa',
    'Arroz branco cozido': '85 arroz tipo 1 cozido',
    'Feijão carioca cozido': '140 feijao carioca cozido',
    'Patinho grelhado sem gordura': '100 patinho grelhado',
    'Abóbora cabotiá cozida': '72 abobora cabotia cozida',
    'Chuchu cozido': '110 chuchu cozido',
    'Banana prata': '75 banana prata',
    'Iogurte natural desnatado': '150 iogurte natural desnatado',
  }

  const pela = (texto: string) => {
    const r = buscarAlimentos(texto, ALIMENTOS).resultados[0]
    if (!r || r.gramas === null) throw new Error(`A base não acha "${texto}"`)
    return r
  }

  it('CA-1605: cada linha da tabela vem da base: o nome para a paciente, os gramas e as calorias', () => {
    const itens = DIA_EM_GRAMAS.flatMap((refeicao) => refeicao.itens)
    expect(itens).toHaveLength(Object.keys(BUSCA).length)
    for (const item of itens) {
      const texto = BUSCA[item.alimento]
      if (!texto) throw new Error(`Sem busca para ${item.alimento}`)
      const r = pela(texto)
      const gramas = r.gramas ?? 0
      expect(item, texto).toEqual({
        alimento: nomeParaPaciente(r.alimento),
        gramas: `${formatarNumero(gramas, 0)} g`,
        kcal: `${formatarNumero(((r.alimento.nutrientes.energia_kcal ?? 0) * gramas) / 100, 0)} kcal`,
      })
    }
  })

  it('CA-1605: os pesos são os de hoje (o retrato, para quem lê o teste)', () => {
    expect(DIA_EM_GRAMAS.flatMap((r) => r.itens.map((i) => `${i.alimento} ${i.gramas} ${i.kcal}`))).toEqual([
      'Pão francês 50 g 150 kcal',
      'Ovo cozido 45 g 66 kcal',
      'Mamão Formosa 170 g 77 kcal',
      'Arroz branco cozido 85 g 109 kcal',
      'Feijão carioca cozido 140 g 107 kcal',
      'Patinho grelhado sem gordura 100 g 219 kcal',
      'Abóbora cabotiá cozida 72 g 35 kcal',
      'Chuchu cozido 110 g 20 kcal',
      'Banana prata 75 g 74 kcal',
      'Iogurte natural desnatado 150 g 62 kcal',
    ])
  })

  it('CA-1606: "Leite e outros líquidos entram em mililitros": o leite sai em ml, o iogurte em g', () => {
    expect(unidadeDo(pela('200 leite de vaca integral').alimento)).toBe('ml')
    expect(unidadeDo(pela('150 iogurte natural desnatado').alimento)).toBe('g')
  })

  it('as refeições da tabela são as do plano padrão', () => {
    expect(DIA_EM_GRAMAS.map((r) => r.refeicao)).toEqual(['Café da manhã', 'Almoço', 'Lanche da tarde'])
    const { plano } = oExemplo()
    for (const refeicao of DIA_EM_GRAMAS) expect(plano.refeicoes.map((r) => r.nome)).toContain(refeicao.refeicao)
  })

  it('"1 concha de feijão", como se digita, dá o feijão carioca cozido com 140 g e 107 kcal', () => {
    const r = pela('1 concha de feijão')
    expect(FEIJAO_NA_CONCHA).toEqual({
      digitado: '1 concha de feijão',
      nome: r.alimento.descricao,
      paraPaciente: nomeParaPaciente(r.alimento),
      medida: '1 concha',
      gramas: `${formatarNumero(r.gramas ?? 0, 0)} g`,
      kcal: `${formatarNumero(((r.alimento.nutrientes.energia_kcal ?? 0) * (r.gramas ?? 0)) / 100, 0)} kcal`,
    })
    expect(leituraDoResultado(r)).toBe(`1 concha · ${FEIJAO_NA_CONCHA.gramas}`)
  })
})
