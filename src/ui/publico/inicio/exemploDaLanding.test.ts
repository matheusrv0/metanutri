// Spec landing-v3, seção v9 (D-652 a D-665, CA-1653, CA-1659 a CA-1661, CA-1667 e CA-1675): os números da landing são
// os do app. As constantes ficam leves na página; este teste roda o motor, a base e as missões de verdade e falha se uma
// letra divergir (R-530, R-600 e R-651).
import { DIAS_NA_SEMANA_PARA_EM_DIA, DIAS_PARA_SUMIR, ROTULO_ESTADO } from '@/domain/acompanhamento.ts'
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO, PRESETS, type LinhaAdequacao } from '@/domain/adequacao.ts'
import { aguaDoCaso } from '@/domain/agua.ts'
import { buscarAlimentos } from '@/domain/busca.ts'
import { MAXIMO_SUGESTOES, sugerirParaCobrir, type Sugestao } from '@/domain/cobrir.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { quantidadeNoPlano, valorDeReferencia } from '@/domain/formatarQuantidade.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { missoesDoPlano } from '@/domain/missoes.ts'
import { nomeParaPaciente } from '@/domain/nomeParaPaciente.ts'
import { ehPrescritivel, regraQueExclui } from '@/domain/prescritivel.ts'
import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { ChaveNutrienteAlimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { pctDaReferencia, porcaoDaSugestao } from '@/ui/adequacao/estiloAdequacao.ts'
import {
  ALMOCO_EM_GRAMAS,
  CELULAR_DO_EXEMPLO,
  META_DA_ADEQUACAO,
  MISSOES_DO_EXEMPLO,
  NUTRIENTES_DO_EXEMPLO,
  PAINEL_DO_EXEMPLO,
  SUGESTOES_POR_NUTRIENTE,
  VITAMINAS_E_MINERAIS,
  textoDosAlimentosProprios,
  type ChaveDoNutriente,
  type SugestaoDoExemplo,
} from './exemploDaLanding.ts'

const NUTRIENTE: Readonly<Record<ChaveDoNutriente, ChaveNutrienteAlimento>> = {
  calcio: 'calcio_mg',
  'vitamina-e': 'vitamina_e_mg',
  'vitamina-d': 'vitamina_d_mcg',
}

const HOJE = '2026-10-27'

/** O plano de exemplo como o app abre: o mesmo caso, o mesmo gasto e as mesmas escolhas da gaveta do Cobrir. */
function oExemplo() {
  let n = 0
  const { caso, plano } = criarExemplo(() => `id-${n++}`, HOJE)
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
    })
  const linha = (chave: ChaveNutrienteAlimento): LinhaAdequacao => {
    const achada = adequacao.linhas.find((l) => l.chave === chave)
    if (!achada) throw new Error(`O exemplo não tem a linha ${chave}`)
    return achada
  }
  return { caso, plano, cobrir, linha }
}

/** D-657: as três primeiras com o primeiro nome diferente (a vitamina D traz dois salmões seguidos). */
function tresDeNomeDiferente(sugestoes: readonly Sugestao[]): Sugestao[] {
  const vistos = new Set<string>()
  const escolhidas: Sugestao[] = []
  for (const s of sugestoes) {
    const primeiro = s.descricao.split(',')[0]?.trim() ?? ''
    if (vistos.has(primeiro)) continue
    vistos.add(primeiro)
    escolhidas.push(s)
    if (escolhidas.length === SUGESTOES_POR_NUTRIENTE) break
  }
  return escolhidas
}

/** D-658: o que ainda falta com a porção é a falta menos o nutriente que ela traz, escrito como o app escreve. */
function sugestaoDoMotor(s: Sugestao, chave: ChaveNutrienteAlimento, falta: number, unidade: string): SugestaoDoExemplo {
  const alimento = buscarAlimento(s.alimentoId)
  const aporte = ((alimento?.nutrientes[chave] ?? 0) * s.gramas) / 100
  return {
    nome: nomeParaPaciente(alimento),
    gramas: porcaoDaSugestao({ gramas: s.gramas, medida: null }, alimento),
    kcal: formatarNumero(s.kcalAdicionadas, 0),
    cobre: Number(formatarNumero(s.coberturaPct, 0)),
    resta: s.parcial ? `${quantidadeNoPlano(falta - aporte)} ${unidade}` : null,
  }
}

describe('CA-1659: as abas da Adequação são as linhas do motor', () => {
  it.each(['calcio', 'vitamina-e', 'vitamina-d'] as const)('a aba de %s tem o total, o percentual e a falta do exemplo', (chave) => {
    const exemplo = oExemplo()
    const linha = exemplo.linha(NUTRIENTE[chave])
    const resultado = exemplo.cobrir(NUTRIENTE[chave])
    const aba = NUTRIENTES_DO_EXEMPLO.find((n) => n.chave === chave)
    expect(aba).toMatchObject({
      nome: linha.rotulo,
      total: `${quantidadeNoPlano(linha.total)} de ${valorDeReferencia(linha.referencia.valor)} ${linha.unidade} no dia`,
      pct: Number(pctDaReferencia(linha).replace(/% da referência$/, '')),
      falta: `${quantidadeNoPlano(resultado.falta)} ${resultado.unidade}`,
    })
  })

  it('a meta é o mínimo do padrão do app (90% da referência) e vale para as três linhas', () => {
    const exemplo = oExemplo()
    expect(META_DA_ADEQUACAO).toBe(PRESETS.individual.minimoPct)
    expect(exemplo.caso.adequacao.preset.tipo).toBe('individual')
    for (const chave of Object.values(NUTRIENTE)) expect(exemplo.linha(chave).metaPct).toBe(META_DA_ADEQUACAO)
  })

  it('o retrato de hoje, para quem lê o teste', () => {
    expect(NUTRIENTES_DO_EXEMPLO.map((n) => `${n.nome} · ${n.total} · ${n.pct}% · faltam ${n.falta}`)).toEqual([
      'Cálcio · 640 de 1.000 mg no dia · 64% · faltam 260 mg',
      'Vitamina E · 5,4 de 15 mg no dia · 36% · faltam 8,1 mg',
      'Vitamina D · 2,1 de 15 µg no dia · 14% · faltam 11,4 µg',
    ])
  })
})

describe('CA-1660 e CA-1661: as sugestões e o "ainda faltam" são os do motor', () => {
  it.each(['calcio', 'vitamina-e', 'vitamina-d'] as const)('as sugestões de %s: as três primeiras de nome diferente, na ordem do motor', (chave) => {
    const resultado = oExemplo().cobrir(NUTRIENTE[chave])
    const aba = NUTRIENTES_DO_EXEMPLO.find((n) => n.chave === chave)
    expect(aba?.sugestoes).toEqual(tresDeNomeDiferente(resultado.sugestoes).map((s) => sugestaoDoMotor(s, NUTRIENTE[chave], resultado.falta, resultado.unidade)))
  })

  it('D-657: a escolhida ao abrir é o iogurte, a amêndoa e o salmão', () => {
    expect(NUTRIENTES_DO_EXEMPLO.map((n) => n.sugestoes[n.escolhida]?.nome)).toEqual([
      'Iogurte natural desnatado',
      'Amêndoa torrada salgada',
      'Filé de salmão fresco grelhado com pele',
    ])
  })

  it('o retrato de hoje: nomes da paciente, gramas, kcal, cobertura e o que ainda falta', () => {
    expect(NUTRIENTES_DO_EXEMPLO.flatMap((n) => n.sugestoes.map((s) => `${s.nome} · ${s.gramas} · +${s.kcal} kcal · ${s.cobre}% · ${s.resta ?? 'meta'}`))).toEqual([
      'Rúcula · 60 g · +8 kcal · 27% · 190 mg',
      'Iogurte natural desnatado · 150 g · +62 kcal · 91% · 24,3 mg',
      'Sardinha assada · 60 g · +99 kcal · 100% · meta',
      'Almeirão cru · 60 g · +11 kcal · 17% · 6,8 mg',
      'Amêndoa torrada salgada · 30 g · +174 kcal · 88% · 1,0 mg',
      'Abacate · 135 g · +130 kcal · 44% · 4,6 mg',
      'Filé de salmão fresco grelhado com pele · 90 g · +206 kcal · 100% · meta',
      'Atum em óleo · 120 g · +199 kcal · 71% · 3,3 µg',
      'Gema de ovo cozida · 40 g · +141 kcal · 19% · 9,2 µg',
    ])
  })

  it('"até 5 alimentos" (Adequação e Funcionalidades) é o máximo do motor', () => {
    expect(MAXIMO_SUGESTOES).toBe(5)
  })
})

describe('CA-1653: os números do topo saem do domínio', () => {
  it('"20 vitaminas e minerais" é a lista da adequação sem a fibra', () => {
    expect(VITAMINAS_E_MINERAIS).toBe(MICRONUTRIENTES_ADEQUACAO.filter((c) => c !== 'fibra_g').length)
    expect(VITAMINAS_E_MINERAIS).toBe(20)
  })
})

describe('CA-1667: o celular e o painel são o exemplo do app', () => {
  it('as missões são as de missoesDoPlano do plano de exemplo, com a água da Maria, no texto e na ordem', () => {
    const { caso, plano } = oExemplo()
    const doApp = missoesDoPlano(plano, { aguaL: aguaDoCaso(caso).litros })
    expect(MISSOES_DO_EXEMPLO).toEqual(doApp.map((m) => ({ texto: m.texto, origem: m.origem })))
    expect(MISSOES_DO_EXEMPLO).toHaveLength(9)
    expect(MISSOES_DO_EXEMPLO[0]?.texto).toBe('Café da manhã por volta das 6h')
  })

  it('D-660: 27/10/2026 é terça-feira, a data do celular, e a terça é a coluna de hoje no painel', () => {
    const dia = new Date(`${HOJE}T12:00:00Z`)
    const extenso = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dia)
    expect(CELULAR_DO_EXEMPLO.data.toLowerCase()).toBe(extenso)
    expect(CELULAR_DO_EXEMPLO.data).toBe('Terça-feira, 27 de outubro')
    // A semana do painel começa na segunda: a terça é a segunda coluna.
    expect((dia.getUTCDay() + 6) % 7).toBe(PAINEL_DO_EXEMPLO.hoje)
    expect(PAINEL_DO_EXEMPLO.dias).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D'])
  })

  it('D-661: os estados do painel são os do app, e "4 dias sem marcar" é o prazo de quem parou', () => {
    expect(PAINEL_DO_EXEMPLO.semMarcar).toBe(`${DIAS_PARA_SUMIR} dias sem marcar`)
    expect(PAINEL_DO_EXEMPLO.atencao).toBe(ROTULO_ESTADO.atencao)
    expect(PAINEL_DO_EXEMPLO.emDia).toBe(ROTULO_ESTADO['em-dia'])
    expect(DIAS_NA_SEMANA_PARA_EM_DIA).toBeGreaterThan(0)
  })
})

describe('CA-1675: o almoço de "Quantidades em gramas e calorias" vem da Base MetaNutri', () => {
  /** O texto que a nutricionista digitaria para cada linha: os gramas e o alimento. */
  const BUSCA: Readonly<Record<string, string>> = {
    'Arroz branco cozido': '85 arroz tipo 1 cozido',
    'Feijão carioca cozido': '140 feijao carioca cozido',
    'Patinho grelhado sem gordura': '100 patinho grelhado',
    'Abóbora cabotiá cozida': '72 abobora cabotia cozida',
    'Chuchu cozido': '110 chuchu cozido',
  }

  const pela = (texto: string) => {
    const r = buscarAlimentos(texto, ALIMENTOS).resultados[0]
    if (!r || r.gramas === null) throw new Error(`A base não acha "${texto}"`)
    return r
  }

  it('cada linha: o nome para a paciente, os gramas e as calorias da base', () => {
    expect(ALMOCO_EM_GRAMAS).toHaveLength(Object.keys(BUSCA).length)
    for (const item of ALMOCO_EM_GRAMAS) {
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

  it('o retrato de hoje, para quem lê o teste', () => {
    expect(ALMOCO_EM_GRAMAS.map((i) => `${i.alimento} ${i.gramas} ${i.kcal}`)).toEqual([
      'Arroz branco cozido 85 g 109 kcal',
      'Feijão carioca cozido 140 g 107 kcal',
      'Patinho grelhado sem gordura 100 g 219 kcal',
      'Abóbora cabotiá cozida 72 g 35 kcal',
      'Chuchu cozido 110 g 20 kcal',
    ])
  })

  it('o almoço é uma refeição do plano padrão', () => {
    expect(oExemplo().plano.refeicoes.map((r) => r.nome)).toContain('Almoço')
  })

  it('"Leite e outros líquidos entram em mililitros": o leite sai em ml, o iogurte em g (CA-1606)', () => {
    expect(unidadeDo(pela('200 leite de vaca integral').alimento)).toBe('ml')
    expect(unidadeDo(pela('150 iogurte natural desnatado').alimento)).toBe('g')
  })
})

describe('D-663 e D-672: o alimento próprio segue a publicação 2 (D-540)', () => {
  it('desligado: rótulo e código de barras, sem "por 100 g"', () => {
    const texto = textoDosAlimentosProprios(false)
    expect(texto.funcionalidade).toBe('O que a base ainda não tem entra pelo rótulo ou pelo código de barras.')
    expect(texto.resposta).toBe('Você cadastra em Meus alimentos, pelo rótulo ou pelo código de barras, e ele entra na refeição pela busca.')
    expect(`${texto.funcionalidade} ${texto.resposta}`).not.toMatch(/100 g/)
  })

  it('ligado: por 100 g, pela porção do rótulo ou pelo código de barras', () => {
    const texto = textoDosAlimentosProprios(true)
    expect(texto.funcionalidade).toBe('O que a base ainda não tem entra por 100 g, pela porção do rótulo ou pelo código de barras.')
    expect(texto.resposta).toBe('Você cadastra em Meus alimentos: por 100 g, pela porção do rótulo ou pelo código de barras.')
  })
})

describe('D-541 e D-672: o que as perguntas afirmam sobre as sugestões', () => {
  it('bebida alcoólica, ultraprocessado e gordura trans nunca são sugeridos, nem com ingredientes liberados', () => {
    const pegos = ALIMENTOS.filter((a) => ['alcool', 'gordura-trans', 'ultraprocessado'].includes(regraQueExclui(a)?.id ?? ''))
    expect(pegos.length).toBeGreaterThan(0)
    expect(pegos.filter((a) => ehPrescritivel(a, { incluirIngredientes: true }))).toEqual([])
  })
})
