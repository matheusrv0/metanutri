// @vitest-environment node
// O contrato da função sugerir-plano (spec assistente-ia): o pedido limpo por lista branca, a resposta da IA conferida
// por código e os limites do mês de Brasília.
import {
  conferirResposta,
  inicioDoMesEmBrasilia,
  LIMITE_DE_SUGESTOES_IA,
  limparPedido,
  limparTexto,
  renovaEm,
  REMOVIDO,
  textoCurto,
  type ContextoDaResposta,
  type PedidoDeSugestao,
} from '../../supabase/functions/_shared/iaContrato.ts'
import { PEDIDO_BASE } from './servidorIaFalsos.test-utils.ts'


const limpo = (corpo: unknown): PedidoDeSugestao => {
  const lido = limparPedido(corpo)
  if (!lido.ok || lido.pedido.modo === 'uso') throw new Error(`pedido não passou: ${JSON.stringify(lido)}`)
  return lido.pedido
}

describe('D-1318: limites e o mês de Brasília', () => {
  it('CA-2307: Free 3, Estudante 5, Solo 20, Pro 40, Clínica 40', () => {
    expect(LIMITE_DE_SUGESTOES_IA).toEqual({ free: 3, estudante: 5, solo: 20, pro: 40, clinica: 40 })
  })

  it('CB-1314: o mês começa à meia-noite do dia 1º em Brasília e renova no 1º do mês seguinte', () => {
    // 1º/11, 00h30 em Brasília = 03h30 UTC: já é novembro.
    expect(inicioDoMesEmBrasilia(new Date('2026-11-01T03:30:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z')
    // 1º/11, 02h UTC = 31/10, 23h em Brasília: ainda é outubro.
    expect(inicioDoMesEmBrasilia(new Date('2026-11-01T02:00:00Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(renovaEm(new Date('2026-11-03T12:00:00Z'))).toBe('2026-12-01')
    expect(renovaEm(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
    expect(renovaEm(new Date('2027-01-01T02:59:00Z'))).toBe('2027-01-01')
  })
})

describe('D-1314 e CA-2311: a limpeza dos textos livres', () => {
  it.each([
    ['escreve para maria.souza+nutri@gmail.com', `escreve para ${REMOVIDO}`],
    ['site https://exemplo.com.br/x e www.blog.com', `site ${REMOVIDO} e ${REMOVIDO}`],
    ['CPF 123.456.789-09 ou 12345678909', `CPF ${REMOVIDO} ou ${REMOVIDO}`],
    ['mora no CEP 59000-000', `mora no CEP ${REMOVIDO}`],
    ['liga (84) 99876-5432 ou 84 3222-1100 ou +55 11 98765-4321', `liga ${REMOVIDO} ou ${REMOVIDO} ou ${REMOVIDO}`],
  ])('tira o contato de "%s"', (texto, esperado) => {
    expect(limparTexto(texto)).toBe(esperado)
  })

  it.each(['acorda 6h, dorme 23h', 'escritório, 8h às 17h', 'meta de 1.800 kcal', 'treina 5 vezes por semana às 18:30', 'levotiroxina 50 mcg em jejum', 'Pão 2 fatias, 50 g'])(
    'não mexe no texto comum "%s"',
    (texto) => {
      expect(limparTexto(texto)).toBe(texto)
    },
  )

  it('textoCurto: não texto vira vazio, tira controle, junta espaços e corta no limite', () => {
    expect(textoCurto(42, 10)).toBe('')
    expect(textoCurto('  um\n\tdois​  três ', 50)).toBe('um dois três')
    expect(textoCurto('abcdefghij-xyz', 10)).toBe('abcdefghij')
  })
})

describe('limparPedido', () => {
  it('CA-2311: reescreve só o que é conhecido; o resto some', () => {
    const corpo = {
      ...PEDIDO_BASE,
      nome: 'Maria Souza',
      email: 'maria@x.com',
      pacienteId: 'pac-1',
      paciente: { ...PEDIDO_BASE.paciente, nome: 'Maria Souza', telefone: '84999998888', nascimento: '1992-01-01', responsavel: 'João' },
      rotina: { ...PEDIDO_BASE.rotina, trabalho: 'escritório; ligar 84 99999-8888', observacoes: 'segredo' },
    }
    const pedido = limpo(corpo)
    const texto = JSON.stringify(pedido)
    for (const proibido of ['Maria', 'maria@x.com', 'pac-1', '84999998888', '1992-01-01', 'João', 'segredo', '99999-8888']) expect(texto).not.toContain(proibido)
    expect(pedido.rotina.trabalho).toBe(`escritório; ligar ${REMOVIDO}`)
    expect(Object.keys(pedido).sort()).toEqual(['consentimento', 'lacunas', 'meusAlimentos', 'metas', 'modo', 'naoUsar', 'paciente', 'pedido', 'plano', 'refeicoes', 'restricoes', 'rotina', 'versao'].sort())
    expect(Object.keys(pedido.paciente).sort()).toEqual(
      ['atividade', 'doencas', 'estaturaCm', 'fase', 'idadeAnos', 'idadeMeses', 'medicamentos', 'objetivo', 'objetivoTexto', 'outrosDiagnosticos', 'pesoKg', 'sexo'].sort(),
    )
  })

  it('D-1314: peso arredondado a 0,5 kg; naoUsar sem repetir e em ordem; gestação só no sexo feminino', () => {
    const pedido = limpo(PEDIDO_BASE)
    expect(pedido.paciente.pesoKg).toBe(72.5)
    expect(pedido.naoUsar).toEqual([488, 512, 513])
    expect(limpo({ ...PEDIDO_BASE, paciente: { ...PEDIDO_BASE.paciente, sexo: 'M' } }).paciente.fase).toEqual({ tipo: 'nenhuma' })
  })

  it('corta textos e listas nos limites e tira números fora da faixa', () => {
    const pedido = limpo({
      ...PEDIDO_BASE,
      paciente: { ...PEDIDO_BASE.paciente, medicamentos: 'x'.repeat(500), estaturaCm: 900, pesoKg: -3 },
      rotina: { ...PEDIDO_BASE.rotina, extra: 'y'.repeat(900), orcamento: 'caro' },
      restricoes: { avisos: Array.from({ length: 50 }, (_, i) => `Aviso ${i}`), textos: [], naoGosta: [], cuidados: [] },
      meusAlimentos: Array.from({ length: 200 }, (_, i) => ({ id: 900_000 + i, nome: `Próprio ${i}`, grupo: 'x', unidade: 'g', kcal: 100, p: 1, c: 1, g: 1 })),
    })
    expect(pedido.paciente.medicamentos).toHaveLength(200)
    expect(pedido.paciente.estaturaCm).toBeNull()
    expect(pedido.paciente.pesoKg).toBeNull()
    expect(pedido.rotina.extra).toHaveLength(300)
    expect(pedido.rotina.orcamento).toBe('')
    expect(pedido.restricoes.avisos).toHaveLength(20)
    expect(pedido.meusAlimentos).toHaveLength(150)
  })

  it.each([
    ['não é objeto', 'texto'],
    ['sem versão 1', { ...PEDIDO_BASE, versao: 2 }],
    ['modo desconhecido', { ...PEDIDO_BASE, modo: 'apagar' }],
    ['sem refeição', { ...PEDIDO_BASE, refeicoes: [] }],
    ['com 9 refeições', { ...PEDIDO_BASE, refeicoes: Array.from({ length: 9 }, () => ({ nome: 'Lanche', horario: '10:00' })) }],
    ['horário fora de HH:MM', { ...PEDIDO_BASE, refeicoes: [{ nome: 'Almoço', horario: '25:00' }] }],
    ['abaixo de 2 anos', { ...PEDIDO_BASE, paciente: { ...PEDIDO_BASE.paciente, idadeAnos: 1 } }],
    ['sem sexo', { ...PEDIDO_BASE, paciente: { ...PEDIDO_BASE.paciente, sexo: null } }],
    ['meta de energia fora de 500 a 6000', { ...PEDIDO_BASE, metas: { ...PEDIDO_BASE.metas, kcal: 120 } }],
    ['ajustar sem plano', { ...PEDIDO_BASE, modo: 'ajustar', plano: [] }],
  ])('CA-2303: %s é pedido-invalido', (_, corpo) => {
    expect(limparPedido(corpo)).toEqual({ ok: false, codigo: 'pedido-invalido' })
  })

  it('CA-2304: sem consentimento true é sem-consentimento', () => {
    expect(limparPedido({ ...PEDIDO_BASE, consentimento: 'sim' })).toEqual({ ok: false, codigo: 'sem-consentimento' })
    expect(limparPedido({ ...PEDIDO_BASE, consentimento: undefined })).toEqual({ ok: false, codigo: 'sem-consentimento' })
  })

  it('CA-2306: o modo uso não precisa de mais nada', () => {
    expect(limparPedido({ versao: 1, modo: 'uso' })).toEqual({ ok: true, pedido: { modo: 'uso' } })
  })

  it('modo ajustar: o plano só com ids e gramas, nas refeições do pedido, e as lacunas limpas', () => {
    const pedido = limpo({
      ...PEDIDO_BASE,
      modo: 'ajustar',
      plano: [
        { refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150, nome: 'Arroz' },
        { refeicao: 5, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 },
        { refeicao: 0, opcao: 'substituto2', item: 0, alimentoId: 3, gramas: 150 },
      ],
      lacunas: { energiaPct: 118, macros: ['Carboidrato 68% (meta até 65%)'], abaixo: [{ nutriente: 'Cálcio', pct: 64, candidatos: [{ alimentoId: 448, gramas: 170, coberturaPct: 38 }, { alimentoId: 'x' }] }], acima: [] },
    })
    expect(pedido.plano).toEqual([{ refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 }])
    expect(pedido.lacunas?.abaixo).toEqual([{ nutriente: 'Cálcio', pct: 64, candidatos: [{ alimentoId: 448, gramas: 170, coberturaPct: 38 }] }])
  })
})

describe('conferirResposta', () => {
  const GERAR: ContextoDaResposta = { modo: 'gerar', refeicoes: 2, idsPermitidos: new Set([3, 53, 488, 561, 900012]), plano: null }
  const resposta = (o: Readonly<Record<string, unknown>>) => JSON.stringify({ refeicoes: [], mudancas: [], pontosAConfirmar: [], ...o })

  it.each([
    ['texto que não é JSON', 'Aqui está o plano: {'],
    ['JSON sem as três listas', JSON.stringify({ refeicoes: [] })],
    ['chave a mais', resposta({ extra: 1 })],
    ['item sem gramas', resposta({ refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 3 }], opcao2: [] }] })],
    ['mudança com tipo desconhecido', resposta({ mudancas: [{ tipo: 'apagar', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo: '' }] })],
  ])('CA-2314: %s não passa', (_, texto) => {
    expect(conferirResposta(texto, GERAR).ok).toBe(false)
  })

  it('CA-2317: tira id fora do permitido (e conta), gramas fora de 1 a 1000 e refeição que não existe', () => {
    const r = conferirResposta(
      resposta({
        refeicoes: [
          { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }, { alimentoId: 777777, gramas: 30 }, { alimentoId: 488, gramas: 1500 }], opcao2: [{ alimentoId: 900012, gramas: 50 }] },
          { refeicao: 7, principal: [{ alimentoId: 3, gramas: 100 }], opcao2: [] },
          { refeicao: 1, principal: [{ alimentoId: 3, gramas: 0.4 }, { alimentoId: 561, gramas: 140 }], opcao2: [] },
          { refeicao: 1, principal: [{ alimentoId: 3, gramas: 100 }], opcao2: [] },
        ],
        mudancas: [{ tipo: 'remover', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo: 'x' }],
        pontosAConfirmar: ['  Confirme o horário do sulfato ferroso.  ', '', 'b', 'c', 'd'],
      }),
      GERAR,
    )
    expect(r).toEqual({
      ok: true,
      foraDaBase: 1,
      resposta: {
        refeicoes: [
          { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }], opcao2: [{ alimentoId: 900012, gramas: 50 }] },
          { refeicao: 1, principal: [{ alimentoId: 561, gramas: 140 }], opcao2: [] },
        ],
        mudancas: [],
        pontosAConfirmar: ['Confirme o horário do sulfato ferroso.', 'b', 'c'],
      },
    })
  })

  it('CA-2317: no máximo 10 itens por opção; ponto até 200 e motivo até 90 caracteres', () => {
    const muitos = Array.from({ length: 14 }, () => ({ alimentoId: 3, gramas: 10 }))
    const r = conferirResposta(resposta({ refeicoes: [{ refeicao: 0, principal: muitos, opcao2: [] }], pontosAConfirmar: ['p'.repeat(400)] }), GERAR)
    if (!r.ok) throw new Error(r.motivo)
    expect(r.resposta.refeicoes[0]?.principal).toHaveLength(10)
    expect(r.resposta.pontosAConfirmar[0]).toHaveLength(200)
  })

  describe('modo ajustar', () => {
    const AJUSTAR: ContextoDaResposta = {
      modo: 'ajustar',
      refeicoes: 2,
      idsPermitidos: new Set([3, 4, 448, 561]),
      plano: [
        { refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 },
        { refeicao: 1, opcao: 'principal', item: 1, alimentoId: 561, gramas: 60 },
      ],
    }
    const m = (o: Readonly<Record<string, unknown>>) => ({ tipo: 'trocar', refeicao: 1, opcao: 'principal', item: 0, alimentoId: 4, gramas: null, motivo: '+ fibra', ...o })

    it('CA-2317: fica só a mudança com os campos do tipo e o item que existe; no máximo 8; refeições vazias', () => {
      const r = conferirResposta(
        resposta({
          refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 3, gramas: 100 }], opcao2: [] }],
          mudancas: [
            m({}),
            m({ tipo: 'gramas', item: 1, alimentoId: 99, gramas: 140, motivo: 'm'.repeat(200) }),
            m({ tipo: 'adicionar', item: null, alimentoId: 448, gramas: 170 }),
            m({ tipo: 'remover', item: 1, alimentoId: 3, gramas: 10 }),
            m({ item: 7 }),
            m({ alimentoId: 123456 }),
            m({ tipo: 'gramas', item: 0, gramas: 5000 }),
            m({ tipo: 'adicionar', alimentoId: null, gramas: 100 }),
          ],
        }),
        AJUSTAR,
      )
      if (!r.ok) throw new Error(r.motivo)
      expect(r.resposta.refeicoes).toEqual([])
      expect(r.resposta.mudancas.map((x) => [x.tipo, x.item, x.alimentoId, x.gramas])).toEqual([
        ['trocar', 0, 4, null],
        ['gramas', 1, null, 140],
        ['adicionar', null, 448, 170],
        ['remover', 1, null, null],
      ])
      expect(r.resposta.mudancas[1]?.motivo).toHaveLength(90)
      expect(r.foraDaBase).toBe(1)
      const nove = conferirResposta(resposta({ mudancas: Array.from({ length: 9 }, () => m({})) }), AJUSTAR)
      expect(nove.ok && nove.resposta.mudancas).toHaveLength(8)
    })
  })
})
