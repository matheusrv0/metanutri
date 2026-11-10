import { IDS_DO_CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import { ESTUDANTE_SEM_APROVACAO, limparPedido, REMOVIDO, SEM_CONSENTIMENTO, SEM_CRN_IA, SEM_PERFIL_IA } from '../../supabase/functions/_shared/iaContrato.ts'
import { montarMensagem } from '../../supabase/functions/_shared/iaPrompt.ts'
import { casoDaGestante, HOJE, pacienteDaGestante, planoDeAdulto, refeicao, restricoesDoCaso, SEGREDOS } from './ia.test-utils.ts'
import {
  atividadeDoFator,
  focoDaFase,
  fraseDoMacro,
  gastoCalculado,
  lacunasDoPlano,
  MENOR_DE_2_ANOS,
  metaDeEnergia,
  metasParaIa,
  meusAlimentosParaIa,
  montarPedidoIa,
  motivoParaNaoUsarIa,
  naoUsarParaIa,
  pacienteParaIa,
  planoParaIa,
  rotinaParaIa,
  SEM_PACIENTE_IA,
  type SituacaoParaIa,
} from './iaPedido.ts'
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import type { PerfilConta } from './situacao.ts'
import { alimentosParaSugerir, buscarAlimento } from './tabelas.ts'
import type { Alimento, Caso } from './tipos.ts'

const PERFIL: PerfilConta = { nome: 'Ana', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'conferido', crnDeclaradoEm: null, crnDecididoEm: null }
const AGORA = new Date('2026-11-03T15:00:00Z')

function pedidoDaGestante(mudar: Partial<Parameters<typeof montarPedidoIa>[0]> = {}) {
  const caso = casoDaGestante()
  return montarPedidoIa({
    modo: 'gerar',
    caso,
    paciente: pacienteDaGestante(),
    restricoes: restricoesDoCaso(caso),
    refeicoes: [
      { nome: 'Café da manhã', horario: '06:30' },
      { nome: 'Almoço', horario: '12:00' },
    ],
    metaKcal: 2150,
    algoMais: 'leva marmita; telefone 84 99999-8888',
    outroPedido: '',
    catalogo: IDS_DO_CATALOGO_IA,
    buscar: buscarAlimento,
    proprios: [],
    ...mudar,
  })
}

describe('spec assistente-ia, CA-2335: quando a IA não pode ser usada', () => {
  const pode: SituacaoParaIa = { comPaciente: true, perfil: PERFIL, estudanteAprovado: false, caso: casoDaGestante(), consentimento: true, uso: { usados: 7, limite: 20, renovaEm: '2026-12-01' }, agora: AGORA }

  it('com tudo certo, nulo', () => {
    expect(motivoParaNaoUsarIa(pode)).toBeNull()
  })

  it.each([
    ['sem paciente', { comPaciente: false }, SEM_PACIENTE_IA],
    ['sem perfil', { perfil: null }, SEM_PERFIL_IA],
    ['CRN não encontrado', { perfil: { ...PERFIL, statusCrn: 'nao_encontrado' as const } }, SEM_CRN_IA],
    ['estudante sem aprovação', { perfil: { ...PERFIL, situacao: 'estudante' as const, crn: null, statusCrn: null } }, ESTUDANTE_SEM_APROVACAO],
    ['menos de 2 anos', { caso: { ...casoDaGestante(), idadeAnos: 1, condicao: { tipo: 'nenhuma' as const } } }, MENOR_DE_2_ANOS],
    ['sem peso e estatura', { caso: { ...casoDaGestante(), pesoKg: null, estaturaCm: null } }, 'Informe o peso e a estatura para sugerir o plano.'],
    ['sem autorização', { consentimento: false }, SEM_CONSENTIMENTO],
    ['no limite do mês', { uso: { usados: 20, limite: 20, renovaEm: '2026-12-01' } }, 'As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro.'],
  ] as const)('%s', (_, mudar, motivo) => {
    expect(motivoParaNaoUsarIa({ ...pode, ...mudar } as SituacaoParaIa)).toBe(motivo)
  })

  it('a ordem: sem paciente vem antes do CRN, que vem antes da idade, que vem antes da autorização', () => {
    expect(motivoParaNaoUsarIa({ ...pode, comPaciente: false, perfil: null, consentimento: false })).toBe(SEM_PACIENTE_IA)
    expect(motivoParaNaoUsarIa({ ...pode, perfil: { ...PERFIL, statusCrn: 'nao_encontrado' }, consentimento: false })).toBe(SEM_CRN_IA)
    expect(motivoParaNaoUsarIa({ ...pode, caso: { ...casoDaGestante(), idadeAnos: 1, condicao: { tipo: 'nenhuma' } }, consentimento: false })).toBe(MENOR_DE_2_ANOS)
  })

  it('estudante aprovado e CRN em conferência passam', () => {
    expect(motivoParaNaoUsarIa({ ...pode, perfil: { ...PERFIL, situacao: 'estudante', crn: null, statusCrn: null }, estudanteAprovado: true })).toBeNull()
    expect(motivoParaNaoUsarIa({ ...pode, perfil: { ...PERFIL, statusCrn: 'em_conferencia' } })).toBeNull()
  })
})

describe('CA-2330 e CA-2331: o paciente no pedido', () => {
  it('CA-2330: nada da ficha fora da lista branca, nem os ids do caso e da conta; o da ficha só em pacienteId (D-1347)', () => {
    const { pacienteId, ...pedido } = pedidoDaGestante()
    expect(pacienteId).toBe('pac-123')
    const texto = JSON.stringify(pedido)
    for (const segredo of [...SEGREDOS, 'pac-123', 'caso-9', '99999-8888']) expect(texto, segredo).not.toContain(segredo)
    // E a mensagem à IA, montada do pedido limpo pela função, não leva o id da ficha.
    const lido = limparPedido(pedidoDaGestante())
    if (!lido.ok || !('pacienteId' in lido)) throw new Error('pedido')
    expect(montarMensagem(lido.pedido)).not.toContain('pac-123')
  })

  it('CA-2330: com textos sorteados nos campos que não vão, nenhum aparece no pedido', () => {
    for (let rodada = 0; rodada < 25; rodada++) {
      const sorteio = () => `X${Math.random().toString(36).slice(2, 12)}Z`
      const proibidos = Array.from({ length: 7 }, sorteio)
      const [nome, telefone, email, responsavel, observacoes, anamnese, ocupacao] = proibidos as [string, string, string, string, string, string, string]
      const paciente = pacienteDaGestante({ nome, telefone, email: `${email}@x.com`, responsavel, observacoes, anamnese, ocupacao })
      const caso = casoDaGestante({ nome, observacoes, orientacoes: anamnese })
      const texto = JSON.stringify(montarPedidoIa({ modo: 'gerar', caso, paciente, restricoes: restricoesDoCaso(caso, paciente), refeicoes: [{ nome: 'Almoço', horario: '12:00' }], metaKcal: 2000, algoMais: '', outroPedido: '', catalogo: [], buscar: buscarAlimento, proprios: [] }))
      for (const p of proibidos) expect(texto).not.toContain(p)
    }
  })

  it('CA-2331: idade, sexo, peso arredondado a 0,5 kg, estatura, fase, atividade, objetivo, doenças e medicamentos sem contato', () => {
    const caso = casoDaGestante()
    expect(pacienteParaIa(caso, pacienteDaGestante())).toEqual({
      idadeAnos: 34,
      idadeMeses: 7,
      sexo: 'F',
      pesoKg: 72.5,
      estaturaCm: 165,
      fase: { tipo: 'gestante', semanas: 24 },
      atividade: 'Pouco ativo',
      objetivo: 'manter',
      objetivoTexto: `ter mais disposição; contato ${REMOVIDO}`,
      doencas: ['Anemia'],
      outrosDiagnosticos: '',
      medicamentos: `sulfato ferroso; ligar ${REMOVIDO}`,
    })
  })

  it('CA-2331: lactante com amamentação mista; o nível pelo fator', () => {
    const caso: Caso = { ...casoDaGestante(), condicao: { tipo: 'lactante', mesesPosParto: 3, amamentacao: 'mista' } }
    expect(pacienteParaIa(caso, pacienteDaGestante()).fase).toEqual({ tipo: 'lactante', meses: 3, amamentacao: 'mista' })
    expect(atividadeDoFator(1.55)).toBe('Moderadamente ativo')
    expect(atividadeDoFator(1.45)).toBe('Pouco ativo')
  })

  it('a rotina vem das respostas da anamnese; o orçamento pela escolha', () => {
    expect(rotinaParaIa(pacienteDaGestante(), 'leva marmita')).toEqual({
      sono: 'acorda 6h, dorme 23h',
      trabalho: 'escritório, 8h às 17h',
      ondeCome: 'ela mesma; marmita no almoço',
      orcamento: 'economico',
      gosta: 'tapioca, frango',
      exercicio: '',
      extra: 'leva marmita',
    })
  })

  it('o pedido montado passa na lista branca da função sem perder nada', () => {
    const { pacienteId, ...pedido } = pedidoDaGestante()
    const lido = limparPedido({ ...pedido, pacienteId })
    expect(lido).toEqual({ ok: true, pacienteId, pedido })
  })
})

describe('CA-2332: naoUsar', () => {
  it('os ids do catálogo que pegam a alergia, o texto livre e o cuidado da fase, e os ocultos, sem repetir e em ordem', () => {
    const caso = casoDaGestante({ adequacao: { ...casoDaGestante().adequacao, ocultos: [561, 3, 3] } })
    const naoUsar = naoUsarParaIa(IDS_DO_CATALOGO_IA, buscarAlimento, restricoesDoCaso(caso), caso.adequacao.ocultos)
    const nome = (id: number) => buscarAlimento(id)?.descricao ?? ''
    expect(naoUsar).toContain(458) // Leite, de vaca, integral: alergia a leite
    expect(naoUsar.some((id) => /fígado/i.test(nome(id)))).toBe(true) // gestação: fígado
    expect(naoUsar).toEqual([...new Set(naoUsar)].sort((a, b) => a - b))
    expect(naoUsar).toContain(3)
    expect(naoUsar).toContain(561)
    expect(naoUsar).not.toContain(410) // frango
  })
})

describe('CA-2333: Meus alimentos', () => {
  const base = buscarAlimento(1) as Alimento
  const proprio = (id: number, mudar: Partial<Alimento> = {}, sugerir = true): Alimento => ({
    ...base,
    id,
    descricao: `Próprio ${id}`,
    categoria: 'Cereais e derivados',
    proprio: { tipo: 'alimento', nomeParaPaciente: `Para paciente ${id}`, sugerir, energiaIncoerente: false },
    ...mudar,
  })

  it('só os que podem ir ao Cobrir e passam na regra prescritível, com os valores do cadastro', () => {
    const lista = meusAlimentosParaIa([
      proprio(900_001),
      proprio(900_002, {}, false),
      proprio(900_003, { categoria: 'Suplementos' }),
      proprio(900_004, { descricao: 'Cerveja artesanal' }),
      proprio(900_005, { unidade: 'ml' }),
    ])
    expect(lista.map((a) => a.id)).toEqual([900_001, 900_005])
    expect(lista[0]).toEqual({ id: 900_001, nome: 'Para paciente 900001', grupo: 'Cereais e derivados', unidade: 'g', kcal: 123.5, p: 2.6, c: 25.8, g: 1 })
    expect(lista[1]?.unidade).toBe('ml')
  })

  it('no máximo 150', () => {
    expect(meusAlimentosParaIa(Array.from({ length: 160 }, (_, i) => proprio(900_100 + i)))).toHaveLength(150)
  })
})

describe('CA-2334 e D-1313: metas e foco', () => {
  it('a meta de energia e as faixas da AMDR do adulto quando o caso não tem as dele; as do caso valem', () => {
    const caso = casoDaGestante()
    expect(metasParaIa(caso, 2149.6, ['ferro'])).toEqual({
      kcal: 2150,
      proteina: { tipo: 'pct', min: 10, max: 35 },
      carboidrato: { tipo: 'pct', min: 45, max: 65 },
      gordura: { tipo: 'pct', min: 20, max: 35 },
      foco: ['ferro'],
    })
    const comMetas = { ...caso, metasMacros: { proteina: { tipo: 'g_kg' as const, min: 1.1, max: 1.5 } } }
    expect(metasParaIa(comMetas, 2000, []).proteina).toEqual({ tipo: 'g_kg', min: 1.1, max: 1.5 })
  })

  it.each([
    ['gestante com anemia', {}, {}, ['ferro', 'folato', 'cálcio', 'vitamina C']],
    ['criança de 6 anos', { idadeAnos: 6, condicao: { tipo: 'nenhuma' } }, { doencas: [] }, ['cálcio', 'ferro', 'vitamina A']],
    ['idosa de 78 anos', { idadeAnos: 78, condicao: { tipo: 'nenhuma' } }, { doencas: [] }, ['cálcio', 'vitamina D', 'B12']],
    ['vegano adulto', { condicao: { tipo: 'nenhuma' } }, { doencas: [], restricoesMarcadas: ['vegano'] }, ['ferro', 'zinco', 'cálcio', 'B12']],
    ['adulto sem nada', { condicao: { tipo: 'nenhuma' } }, { doencas: [], restricoesMarcadas: [] }, ['fibra', 'cálcio', 'potássio', 'magnésio']],
  ] as const)('%s', (_, mudarCaso, mudarPaciente, esperado) => {
    const caso = { ...casoDaGestante(), ...mudarCaso } as Caso
    const paciente = pacienteDaGestante(mudarPaciente as Parameters<typeof pacienteDaGestante>[0])
    expect(focoDaFase(caso, paciente, restricoesDoCaso(caso, paciente))).toEqual(esperado)
  })

  it('o foco tem no máximo 5', () => {
    const caso = { ...casoDaGestante(), idadeAnos: 65 } as Caso
    const paciente = pacienteDaGestante({ restricoesMarcadas: ['vegano'] })
    expect(focoDaFase(caso, paciente, restricoesDoCaso(caso, paciente))).toHaveLength(5)
  })

  it('a meta de energia do caso e o gasto calculado sem a meta digitada', () => {
    const caso = casoDaGestante()
    const gasto = gastoCalculado(caso)
    expect(gasto).not.toBeNull()
    expect(metaDeEnergia(caso)).toBeCloseTo(gasto ?? 0, 6)
    expect(metaDeEnergia({ ...caso, energia: { ...caso.energia, getManual: 1800 } })).toBe(1800)
    expect(gastoCalculado({ ...caso, energia: { ...caso.energia, getManual: 1800 } })).toBeCloseTo(gasto ?? 0, 6)
  })
})

describe('CA-2352: o modo ajustar', () => {
  it('o plano só com ids e gramas, sem a receita, com os números de item do plano', () => {
    const plano = planoDeAdulto()
    const almoco = plano.refeicoes[1]
    if (!almoco) throw new Error('plano')
    const comReceita = {
      refeicoes: [
        plano.refeicoes[0],
        { ...almoco, opcoes: { ...almoco.opcoes, principal: [{ id: 'r', alimentoId: ID_DE_RECEITA, gramas: 200 }, ...almoco.opcoes.principal], substituto1: [{ id: 's', alimentoId: 1, gramas: 150 }] } },
      ].filter((r): r is NonNullable<typeof r> => r !== undefined),
    }
    const itens = planoParaIa(comReceita)
    expect(itens.find((i) => i.refeicao === 1 && i.opcao === 'principal' && i.item === 0)).toBeUndefined()
    expect(itens.filter((i) => i.refeicao === 1 && i.opcao === 'principal').map((i) => [i.item, i.alimentoId, i.gramas])).toEqual([
      [1, 3, 150],
      [2, 561, 140],
      [3, 410, 100],
      [4, 78, 30],
      [5, 157, 60],
    ])
    expect(itens.filter((i) => i.opcao === 'opcao2')).toEqual([{ refeicao: 1, opcao: 'opcao2', item: 0, alimentoId: 1, gramas: 150 }])
  })

  it('a frase do macro fora da faixa', () => {
    const r = (estado: 'abaixo' | 'acima' | 'dentro', valor: number, meta: { tipo: 'pct' | 'g_kg'; min: number; max: number }) => ({
      gramas: 0,
      pctKcal: meta.tipo === 'pct' ? valor : 0,
      gPorKg: meta.tipo === 'g_kg' ? valor : 0,
      meta,
      origemMeta: 'usuario' as const,
      estado,
    })
    expect(fraseDoMacro('Carboidrato', r('acima', 68.4, { tipo: 'pct', min: 45, max: 65 }))).toBe('Carboidrato 68% (meta até 65%)')
    expect(fraseDoMacro('Proteína', r('acima', 1.82, { tipo: 'g_kg', min: 1.1, max: 1.5 }))).toBe('Proteína 1,8 g/kg (meta até 1,5)')
    expect(fraseDoMacro('Gordura', r('abaixo', 15.2, { tipo: 'pct', min: 20, max: 35 }))).toBe('Gordura 15% (meta a partir de 20%)')
    expect(fraseDoMacro('Gordura', r('dentro', 25, { tipo: 'pct', min: 20, max: 35 }))).toBeNull()
  })

  it('as lacunas: energia em % da meta, macros fora, os abaixo com até 3 candidatos do Cobrir e os acima do limite', () => {
    const caso = casoDaGestante()
    const restricoes = restricoesDoCaso(caso)
    const lacunas = lacunasDoPlano(planoDeAdulto(), { caso, metaKcal: 2150, buscar: buscarAlimento, alimentosParaSugerir: alimentosParaSugerir(), restricoes })
    expect(lacunas.energiaPct).toBeGreaterThan(0)
    expect(lacunas.abaixo.length).toBeGreaterThan(0)
    expect(lacunas.abaixo.map((a) => a.nutriente)).not.toContain('Sódio')
    for (const a of lacunas.abaixo) {
      expect(a.candidatos.length).toBeLessThanOrEqual(3)
      // Nenhum candidato pega a alergia da ficha: o Cobrir já tira.
      for (const c of a.candidatos) expect(c.alimentoId).not.toBe(458)
    }
    const pedido = pedidoDaGestante({ modo: 'ajustar', plano: planoDeAdulto(), lacunas })
    expect(pedido.lacunas).toEqual({ energiaPct: lacunas.energiaPct, macros: lacunas.macros, abaixo: lacunas.abaixo, acima: lacunas.acima })
    expect(JSON.stringify(pedido)).not.toContain('referencia')
    expect(limparPedido(pedido).ok).toBe(true)
  })

  it('o pedido de adequar leva o plano e o "Outro pedido"', () => {
    const plano = { refeicoes: [refeicao('Almoço', '12:00', [[3, 150]])] }
    const pedido = pedidoDaGestante({ modo: 'ajustar', plano, outroPedido: 'jantar mais leve', refeicoes: [{ nome: 'Almoço', horario: '12:00' }] })
    expect(pedido.plano).toEqual([{ refeicao: 0, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 }])
    expect(pedido.pedido).toBe('jantar mais leve')
    expect(HOJE).toBe('2026-11-03')
  })
})
