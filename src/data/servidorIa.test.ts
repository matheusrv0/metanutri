// @vitest-environment node
// O núcleo da função sugerir-plano (spec assistente-ia, D-1316 a D-1320; CA-2302 a CA-2321) com o banco e o modelo de
// mentira: a ordem dos passos, os limites, o teto do dia, o que cada resposta da IA vira e o registro de uso.
import {
  custoEmMicrodolares,
  ESTUDANTE_SEM_APROVACAO,
  IA_DEMOROU,
  IA_INDISPONIVEL,
  MUITAS_SUGESTOES,
  planoVigente,
  RECUSA_DA_IA,
  resumoDaConta,
  SEM_CONSENTIMENTO,
  SEM_CRN_IA,
  SEM_PERFIL_IA,
  SEM_SESSAO_IA,
  sugerirPlano,
  type DependenciasDaIa,
} from '../../supabase/functions/_shared/ia.ts'
import { IDS_DO_CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import { conferirResposta, limparPedido } from '../../supabase/functions/_shared/iaContrato.ts'
import { criarModeloFalso, modoFalso, LISTAS_DO_FALSO } from '../../supabase/functions/_shared/iaFalsa.ts'
import type { ContaParaIa, RespostaDoModelo } from '../../supabase/functions/_shared/iaPortas.ts'
import { PEDIDO_INVALIDO } from '../../supabase/functions/_shared/portas.ts'
import { AGORA_IA, bancoDaIaFalso, CONTA_IA, CONTA_PADRAO, modeloFalsoDeTeste, PEDIDO_BASE, type MetodoDoBanco, type UsoGuardado } from './servidorIaFalsos.test-utils.ts'

const JSON_OK = JSON.stringify({
  refeicoes: [
    { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }, { alimentoId: 777_777, gramas: 30 }], opcao2: [] },
    { refeicao: 1, principal: [{ alimentoId: 3, gramas: 120 }, { alimentoId: 900012, gramas: 50 }], opcao2: [] },
  ],
  mudancas: [],
  pontosAConfirmar: ['Confirme o horário do sulfato ferroso.'],
})
const TOKENS = [{ modelo: 'claude-opus-5-5', entrada: 1500, cacheGravados: 0, cacheLidos: 10_000, saida: 6000 }]
const OK: RespostaDoModelo = { tipo: 'ok', texto: JSON_OK, modelo: 'claude-opus-5-5', tokens: TOKENS }

function montar(o: { readonly conta?: ContaParaIa; readonly respostas?: readonly RespostaDoModelo[]; readonly usos?: readonly Omit<UsoGuardado, 'id' | 'conclusao'>[]; readonly gastoDoDia?: number; readonly falhas?: readonly MetodoDoBanco[] } = {}) {
  const banco = bancoDaIaFalso({ ...(o.conta ? { conta: o.conta } : {}), ...(o.usos ? { usos: o.usos } : {}), ...(o.gastoDoDia !== undefined ? { gastoDoDia: o.gastoDoDia } : {}), ...(o.falhas ? { falhas: o.falhas } : {}) })
  const modelo = modeloFalsoDeTeste(o.respostas ?? [OK])
  const registro: string[] = []
  let relogio = AGORA_IA.getTime()
  const dep: DependenciasDaIa = {
    banco: banco.banco,
    modelo: modelo.modelo,
    modeloId: 'claude-opus-5-5',
    esforco: 'medium',
    tetoDiarioUsd: 5,
    // Cada leitura do relógio anda 35 s: a chamada à IA "leva" 35 s.
    agora: () => new Date((relogio += 35_000)),
    log: (...partes) => registro.push(partes.map(String).join(' ')),
  }
  return { banco, modelo, registro, dep }
}

const pedir = (corpo: unknown = PEDIDO_BASE, dep = montar().dep, conta: typeof CONTA_IA | null = CONTA_IA) => sugerirPlano({ conta, corpo }, dep)

describe('a ordem: sessão, formato, autorização e quem pode', () => {
  it('CA-2302: sem sessão, 401 sem consultar a conta', async () => {
    const m = montar()
    expect(await pedir(PEDIDO_BASE, m.dep, null)).toEqual({ status: 401, corpo: { erro: SEM_SESSAO_IA, codigo: 'sem-sessao' } })
    expect(m.banco.ordem).toEqual([])
  })

  it('CA-2303: pedido fora do formato, 400 sem consultar nada', async () => {
    const m = montar()
    expect(await pedir({ ...PEDIDO_BASE, refeicoes: [] }, m.dep)).toEqual({ status: 400, corpo: { erro: PEDIDO_INVALIDO, codigo: 'pedido-invalido' } })
    expect(m.banco.ordem).toEqual([])
  })

  it('CA-2304: sem a autorização do paciente, 403 sem reservar nem chamar a IA', async () => {
    const m = montar()
    expect(await pedir({ ...PEDIDO_BASE, consentimento: false }, m.dep)).toEqual({ status: 403, corpo: { erro: SEM_CONSENTIMENTO, codigo: 'sem-consentimento' } })
    expect(m.banco.ordem).toEqual([])
    expect(m.modelo.chamadas).toEqual([])
  })

  it.each([
    ['sem perfil', { ...CONTA_PADRAO, perfil: null }, 'sem-perfil', SEM_PERFIL_IA],
    ['CRN não encontrado', { ...CONTA_PADRAO, perfil: { situacao: 'nutricionista', crnStatus: 'nao_encontrado' } }, 'sem-crn', SEM_CRN_IA],
    ['CRN sem situação', { ...CONTA_PADRAO, perfil: { situacao: 'nutricionista', crnStatus: null } }, 'sem-crn', SEM_CRN_IA],
    ['estudante sem pedido aprovado', { ...CONTA_PADRAO, perfil: { situacao: 'estudante', crnStatus: null }, pedidoAprovado: false }, 'estudante-sem-aprovacao', ESTUDANTE_SEM_APROVACAO],
  ] as const)('CA-2305: %s, 403 sem reservar nem chamar a IA', async (_, conta, codigo, frase) => {
    const m = montar({ conta })
    expect(await pedir(PEDIDO_BASE, m.dep)).toEqual({ status: 403, corpo: { erro: frase, codigo } })
    expect(m.banco.ordem).toEqual(['lerConta'])
    expect(m.modelo.chamadas).toEqual([])
  })

  it.each([
    ['CRN em conferência', { ...CONTA_PADRAO, perfil: { situacao: 'nutricionista', crnStatus: 'em_conferencia' } }],
    ['estudante com o pedido aprovado', { perfil: { situacao: 'estudante', crnStatus: null }, pedidoAprovado: true, assinatura: { plano: 'estudante', status: 'ativa', expiraEm: '2027-06-30T23:59:59Z' } }],
  ] as const)('CA-2305: %s passa', async (_, conta) => {
    expect((await pedir(PEDIDO_BASE, montar({ conta }).dep)).status).toBe(200)
  })

  it('a conta que não se lê: 503 indisponível, sem chamar a IA', async () => {
    const m = montar({ falhas: ['lerConta'] })
    expect(await pedir(PEDIDO_BASE, m.dep)).toEqual({ status: 503, corpo: { erro: IA_INDISPONIVEL, codigo: 'indisponivel' } })
    expect(m.modelo.chamadas).toEqual([])
  })
})

describe('CA-2307: o limite do mês vem do plano que vale', () => {
  const em = (plano: string, status: string, expiraEm: string | null) => ({ plano, status, expiraEm })
  it.each([
    ['sem assinatura', null, 'free'],
    ['Estudante ativa', em('estudante', 'ativa', '2027-06-30T23:59:59Z'), 'estudante'],
    ['Solo ativa', em('solo', 'ativa', null), 'solo'],
    ['Pro ativa', em('pro', 'ativa', null), 'pro'],
    ['Clínica ativa', em('clinica', 'ativa', null), 'clinica'],
    ['Solo pendente', em('solo', 'pendente', null), 'free'],
    ['Solo pausada', em('solo', 'pausada', null), 'free'],
    ['Solo cancelada ainda no período', em('solo', 'cancelada', '2026-11-20T02:59:59Z'), 'solo'],
    ['Solo cancelada vencida', em('solo', 'cancelada', '2026-10-20T02:59:59Z'), 'free'],
    ['Estudante vencida', em('estudante', 'ativa', '2026-10-31T23:59:59Z'), 'free'],
    ['plano desconhecido', em('constructor', 'ativa', null), 'free'],
  ] as const)('%s: %s', (_, assinatura, esperado) => {
    expect(planoVigente(assinatura, AGORA_IA)).toBe(esperado)
  })

  it('CA-2306: o modo uso devolve o contador com o limite do plano, sem reservar e sem chamar a IA', async () => {
    const m = montar({
      conta: { ...CONTA_PADRAO, assinatura: { plano: 'pro', status: 'ativa', expiraEm: null } },
      usos: [
        { conta: CONTA_IA.id, modo: 'gerar', status: 'ok', criadoEm: new Date('2026-11-02T12:00:00Z'), custo: 0 },
        { conta: CONTA_IA.id, modo: 'gerar', status: 'recusa', criadoEm: new Date('2026-11-02T13:00:00Z'), custo: 0 },
        { conta: CONTA_IA.id, modo: 'gerar', status: 'ok', criadoEm: new Date('2026-10-31T12:00:00Z'), custo: 0 },
      ],
    })
    expect(await pedir({ versao: 1, modo: 'uso' }, m.dep)).toEqual({ status: 200, corpo: { uso: { usados: 1, limite: 40, renovaEm: '2026-12-01' } } })
    expect(m.banco.ordem).toEqual(['lerConta', 'usosNoMes'])
    expect(m.modelo.chamadas).toEqual([])
  })
})

describe('os limites e o teto do dia', () => {
  const okEm = (iso: string) => ({ conta: CONTA_IA.id, modo: 'gerar' as const, status: 'ok' as const, criadoEm: new Date(iso), custo: 0 })

  it('CA-2308: o mês cheio responde 429 com a frase e o contador, sem chamar a IA', async () => {
    const m = montar({ conta: { ...CONTA_PADRAO, assinatura: null }, usos: [okEm('2026-11-01T10:00:00Z'), okEm('2026-11-01T11:00:00Z'), okEm('2026-11-02T10:00:00Z')] })
    expect(await pedir(PEDIDO_BASE, m.dep)).toEqual({
      status: 429,
      corpo: { erro: 'As 3 sugestões de novembro foram usadas. Renovam em 1º de dezembro.', codigo: 'limite-mes', uso: { usados: 3, limite: 3, renovaEm: '2026-12-01' } },
    })
    expect(m.modelo.chamadas).toEqual([])
  })

  it('CA-2309: 10 pedidos na última hora, com qualquer resultado: 429 limite-hora', async () => {
    const recentes = Array.from({ length: 10 }, (_, i) => ({ conta: CONTA_IA.id, modo: 'gerar' as const, status: 'erro' as const, criadoEm: new Date(AGORA_IA.getTime() - (i + 1) * 60_000), custo: 0 }))
    const m = montar({ usos: recentes })
    expect(await pedir(PEDIDO_BASE, m.dep)).toEqual({ status: 429, corpo: { erro: MUITAS_SUGESTOES, codigo: 'limite-hora' } })
    expect(m.modelo.chamadas).toEqual([])
  })

  it('CA-2310: o gasto do dia no teto: 503, sem reservar e sem chamar a IA', async () => {
    const m = montar({ gastoDoDia: 5_000_000 })
    expect(await pedir(PEDIDO_BASE, m.dep)).toEqual({ status: 503, corpo: { erro: IA_INDISPONIVEL, codigo: 'indisponivel' } })
    expect(m.banco.ordem).toEqual(['lerConta', 'custoDesde'])
    expect(m.modelo.chamadas).toEqual([])
    expect((await pedir(PEDIDO_BASE, montar({ gastoDoDia: 4_999_999 }).dep)).status).toBe(200)
  })

  it('CA-2310: sem conseguir somar o gasto, ou reservar: 503 sem chamar a IA', async () => {
    for (const falha of ['custoDesde', 'reservar'] as const) {
      const m = montar({ falhas: [falha] })
      expect((await pedir(PEDIDO_BASE, m.dep)).status).toBe(503)
      expect(m.modelo.chamadas).toEqual([])
    }
  })
})

describe('o sucesso', () => {
  it('CA-2318: 200 com a resposta conferida, o contador já com este uso e o uso ok com tokens, custo, modelo e duração', async () => {
    const m = montar()
    const r = await pedir(PEDIDO_BASE, m.dep)
    expect(r.status).toBe(200)
    expect(r.corpo).toEqual({
      resposta: {
        refeicoes: [
          { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }], opcao2: [] },
          { refeicao: 1, principal: [{ alimentoId: 3, gramas: 120 }, { alimentoId: 900012, gramas: 50 }], opcao2: [] },
        ],
        mudancas: [],
        pontosAConfirmar: ['Confirme o horário do sulfato ferroso.'],
      },
      foraDaBase: 1,
      uso: { usados: 1, limite: 20, renovaEm: '2026-12-01' },
    })
    expect(m.banco.usos).toHaveLength(1)
    expect(m.banco.usos[0]?.status).toBe('ok')
    expect(m.banco.usos[0]?.conclusao).toEqual({ status: 'ok', modelo: 'claude-opus-5-5', entrada: 1500, cacheGravados: 0, cacheLidos: 10_000, saida: 6000, custoMicrodolares: 140_800, duracaoMs: 35_000 })
  })

  it('CA-2312: a IA recebe o modelo e o esforço da função, a mensagem do pedido limpo e um resumo da conta, nunca o id', async () => {
    const m = montar()
    await pedir({ ...PEDIDO_BASE, nome: 'Fulana' }, m.dep)
    const [chamada] = m.modelo.chamadas
    expect(chamada?.modelo).toBe('claude-opus-5-5')
    expect(chamada?.esforco).toBe('medium')
    expect(chamada?.mensagem).toContain('<pedido modo="gerar">')
    expect(chamada?.mensagem).not.toContain('Fulana')
    expect(chamada?.usuario).toBe(await resumoDaConta(CONTA_IA.id))
    expect(chamada?.usuario).toMatch(/^[0-9a-f]{32}$/)
    expect(chamada?.usuario).not.toContain(CONTA_IA.id.slice(0, 8))
  })

  it('CA-2317: no modo ajustar vale o plano do pedido para conferir as mudanças', async () => {
    const mudancas = JSON.stringify({
      refeicoes: [],
      mudancas: [
        { tipo: 'trocar', refeicao: 1, opcao: 'principal', item: 0, alimentoId: 1, gramas: null, motivo: '+ fibra' },
        { tipo: 'remover', refeicao: 1, opcao: 'principal', item: 9, alimentoId: null, gramas: null, motivo: 'não existe' },
      ],
      pontosAConfirmar: [],
    })
    const m = montar({ respostas: [{ ...OK, texto: mudancas }] })
    const r = await pedir({ ...PEDIDO_BASE, modo: 'ajustar', plano: [{ refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 }] }, m.dep)
    expect(r.status).toBe(200)
    expect((r.corpo['resposta'] as { mudancas: unknown[] }).mudancas).toEqual([{ tipo: 'trocar', refeicao: 1, opcao: 'principal', item: 0, alimentoId: 1, gramas: null, motivo: '+ fibra' }])
  })

  it('sem conseguir contar o uso depois do sucesso, a sugestão vale e vai sem o contador', async () => {
    const m = montar({ falhas: ['usosNoMes'] })
    const r = await pedir(PEDIDO_BASE, m.dep)
    expect(r.status).toBe(200)
    expect(r.corpo).not.toHaveProperty('uso')
    expect(m.banco.usos[0]?.status).toBe('ok')
  })
})

describe('o que cada resposta da IA vira; nenhuma conta no mês', () => {
  it.each([
    ['CA-2313: recusa', { tipo: 'recusa', modelo: 'claude-opus-5-5', tokens: TOKENS, categoria: 'bio' }, 422, 'recusa', RECUSA_DA_IA, 'recusa'],
    ['CA-2314: cortada no max_tokens', { tipo: 'cortada', modelo: 'claude-opus-5-5', tokens: TOKENS, motivo: 'max_tokens' }, 502, 'resposta-invalida', IA_INDISPONIVEL, 'erro'],
    ['CA-2314: texto que não é JSON', { tipo: 'ok', texto: 'Aqui está:', modelo: 'claude-opus-5-5', tokens: TOKENS }, 502, 'resposta-invalida', IA_INDISPONIVEL, 'erro'],
    ['CA-2315: demorou', { tipo: 'demorou' }, 504, 'demorou', IA_DEMOROU, 'erro'],
    ['CA-2316: 429 da API', { tipo: 'erro-http', status: 429, erro: 'rate_limit_error' }, 429, 'ocupado', MUITAS_SUGESTOES, 'erro'],
    ['CA-2316: 529 da API', { tipo: 'erro-http', status: 529, erro: 'overloaded_error' }, 503, 'indisponivel', IA_INDISPONIVEL, 'erro'],
    ['CA-2316: 402 da API (sem saldo)', { tipo: 'erro-http', status: 402, erro: 'billing_error' }, 503, 'indisponivel', IA_INDISPONIVEL, 'erro'],
    ['CA-2316: 401 da API (chave errada)', { tipo: 'erro-http', status: 401, erro: 'authentication_error' }, 503, 'indisponivel', IA_INDISPONIVEL, 'erro'],
    ['CA-2316: erro no meio do fluxo', { tipo: 'erro-fluxo', erro: 'overloaded_error', modelo: null, tokens: [] }, 503, 'indisponivel', IA_INDISPONIVEL, 'erro'],
    ['CA-2316: sem rede', { tipo: 'sem-rede' }, 503, 'indisponivel', IA_INDISPONIVEL, 'erro'],
  ] as const)('%s → %s %s', async (_, resposta, status, codigo, frase, statusDoUso) => {
    const m = montar({ respostas: [resposta as RespostaDoModelo] })
    expect(await pedir(PEDIDO_BASE, m.dep)).toEqual({ status, corpo: { erro: frase, codigo } })
    expect(m.banco.usos[0]?.status).toBe(statusDoUso)
    const uso = await m.dep.banco.usosNoMes(CONTA_IA.id, new Date('2026-11-01T03:00:00Z'))
    expect(uso).toBe(0)
  })

  it('CA-2313: a recusa anota os tokens e o custo do que rodou', async () => {
    const m = montar({ respostas: [{ tipo: 'recusa', modelo: 'claude-opus-5-5', tokens: TOKENS, categoria: null }] })
    await pedir(PEDIDO_BASE, m.dep)
    expect(m.banco.usos[0]?.conclusao?.custoMicrodolares).toBe(140_800)
  })
})

describe('CA-2319: o custo', () => {
  it('tokens × preço por milhão de cada modelo, mais 10% dos EUA, em microdólares', () => {
    // Opus 5.5: 1.500 × 4 + 10.000 × 0,20 + 6.000 × 20 = 128.000; × 1,1 = 140.800.
    expect(custoEmMicrodolares(TOKENS)).toBe(140_800)
    // Gravação do cache de 5 minutos: 10.000 × 5 = 50.000; × 1,1 = 55.000.
    expect(custoEmMicrodolares([{ modelo: 'claude-opus-5-5', entrada: 0, cacheGravados: 10_000, cacheLidos: 0, saida: 0 }])).toBe(55_000)
    expect(custoEmMicrodolares([{ modelo: 'claude-sonnet-5-5', entrada: 1500, cacheGravados: 0, cacheLidos: 10_000, saida: 6000 }])).toBe(Math.round((3000 + 2000 + 60_000) * 1.1))
    expect(custoEmMicrodolares([{ modelo: 'claude-haiku-5-5', entrada: 1500, cacheGravados: 0, cacheLidos: 10_000, saida: 6000 }])).toBe(Math.round((150 + 100 + 3000) * 1.1))
  })

  it('CB-1316: com a troca automática, soma os dois modelos; o desconhecido usa o preço mais caro; o falso não custa', () => {
    expect(
      custoEmMicrodolares([
        { modelo: 'claude-opus-5-5', entrada: 11_500, cacheGravados: 0, cacheLidos: 0, saida: 0 },
        { modelo: 'claude-opus-5', entrada: 11_500, cacheGravados: 0, cacheLidos: 0, saida: 5000 },
      ]),
    ).toBe(Math.round((46_000 + 57_500 + 125_000) * 1.1))
    expect(custoEmMicrodolares([{ modelo: 'claude-novo', entrada: 1000, cacheGravados: 0, cacheLidos: 0, saida: 0 }])).toBe(5500)
    expect(custoEmMicrodolares([{ modelo: 'falso', entrada: 1000, cacheGravados: 0, cacheLidos: 0, saida: 1000 }])).toBe(0)
  })
})

describe('CA-2320: o registro', () => {
  it('não leva o corpo do pedido, o texto da resposta, nome, e-mail nem o id da conta', async () => {
    const m = montar({ respostas: [{ ...OK, texto: 'não é JSON, mas tem segredo' }] })
    await pedir({ ...PEDIDO_BASE, pedido: 'jantar leve para Fulana' }, m.dep)
    const tudo = m.registro.join('\n')
    expect(tudo).toContain('IA: gerar erro claude-opus-5-5')
    for (const proibido of [CONTA_IA.id, CONTA_IA.email, 'Fulana', 'sulfato ferroso', 'Pão de fermentação', 'segredo', 'gestante']) expect(tudo).not.toContain(proibido)
  })
})

describe('CA-2321: o modo falso', () => {
  it('só liga com o Supabase local; com o de produção é ignorado', () => {
    expect(modoFalso('falso', 'http://127.0.0.1:54321')).toEqual({ ligado: true, ignorado: false })
    expect(modoFalso('falso', 'http://kong:8000')).toEqual({ ligado: true, ignorado: false })
    expect(modoFalso('falso', 'https://qmpljfjbdcrdbqutuvmg.supabase.co')).toEqual({ ligado: false, ignorado: true })
    expect(modoFalso(undefined, 'http://127.0.0.1:54321')).toEqual({ ligado: false, ignorado: false })
    expect(modoFalso('falso', 'não é endereço')).toEqual({ ligado: false, ignorado: true })
  })

  it('as listas do falso estão no catálogo', () => {
    const catalogo = new Set(IDS_DO_CATALOGO_IA)
    for (const lista of Object.values(LISTAS_DO_FALSO)) for (const [id] of lista) expect(catalogo.has(id), `id ${id}`).toBe(true)
  })

  it('a resposta falsa passa na conferência, sem os ids de naoUsar, e o uso não custa nada', async () => {
    const lido = limparPedido({ ...PEDIDO_BASE, naoUsar: [533, 488], refeicoes: [{ nome: 'Café da manhã', horario: '07:00' }, { nome: 'Almoço', horario: '12:00' }, { nome: 'Ceia', horario: '22:00' }] })
    if (!lido.ok || lido.pedido.modo === 'uso') throw new Error('pedido')
    const r = await criarModeloFalso()({ modelo: 'claude-opus-5-5', esforco: 'medium', mensagem: '', usuario: 'x', naoUsar: lido.pedido.naoUsar, refeicoes: lido.pedido.refeicoes, modo: 'gerar' })
    if (r.tipo !== 'ok') throw new Error('falso')
    const conferida = conferirResposta(r.texto, { modo: 'gerar', refeicoes: 3, idsPermitidos: new Set(IDS_DO_CATALOGO_IA), plano: null })
    if (!conferida.ok) throw new Error(conferida.motivo)
    expect(conferida.foraDaBase).toBe(0)
    expect(conferida.resposta.refeicoes).toHaveLength(3)
    const ids = conferida.resposta.refeicoes.flatMap((x) => [...x.principal, ...x.opcao2].map((i) => i.alimentoId))
    expect(ids).not.toContain(533)
    expect(ids).not.toContain(488)
    expect(custoEmMicrodolares(r.tokens)).toBe(0)

    const m = montar({ respostas: [r] })
    expect((await pedir(PEDIDO_BASE, m.dep)).status).toBe(200)
    expect(m.banco.usos[0]?.conclusao?.custoMicrodolares).toBe(0)
  })
})
