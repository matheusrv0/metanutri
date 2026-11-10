// As chamadas do app aos e-mails do link (spec lado-do-paciente, seção 3 do PLAN), com um cliente de mentira.
import { describe, expect, it } from 'vitest'
import {
  buscarEmailsDoLink,
  CHAVE_QUE_NAO_VALE,
  desligarAviso,
  EMAILS_INDISPONIVEIS,
  lerConfigDeEmails,
  lerEmailsDoLink,
  lerPainelDeEmails,
  linksComAvisos,
  NAO_ENVIOU,
  pedirEnvio,
  receberLinkPorEmail,
  recuperarLink,
  registrarAcesso,
  responderAviso,
  salvarConfigDeEmails,
  type ClienteDosEmails,
} from './emailsDoLink.ts'

interface Chamada {
  readonly tipo: 'rpc' | 'funcao' | 'select' | 'upsert'
  readonly nome: string
  readonly corpo: Record<string, unknown>
}

interface OpcoesDoFalso {
  readonly rpc?: { readonly data?: unknown; readonly error?: { message: string } | null }
  /** A função responde; `status` diferente de 2xx vira o erro do supabase-js, com a `Response` em `context`. */
  readonly funcao?: { readonly status: number; readonly corpo: unknown } | 'sem-resposta'
  readonly linha?: unknown
}

function falso(opcoes: OpcoesDoFalso = {}) {
  const chamadas: Chamada[] = []
  const cliente: ClienteDosEmails = {
    rpc: (nome, parametros = {}) => {
      chamadas.push({ tipo: 'rpc', nome, corpo: parametros })
      return Promise.resolve({ data: opcoes.rpc?.data ?? null, error: opcoes.rpc?.error ?? null })
    },
    from: (tabela) => ({
      select: () => ({
        eq: (coluna, valor) => ({
          maybeSingle: () => {
            chamadas.push({ tipo: 'select', nome: tabela, corpo: { [coluna]: valor } })
            return Promise.resolve({ data: opcoes.linha ?? null, error: null })
          },
        }),
      }),
      upsert: (linha) => {
        chamadas.push({ tipo: 'upsert', nome: tabela, corpo: linha })
        return Promise.resolve({ error: null })
      },
    }),
    functions: {
      invoke: (nome, { body }) => {
        chamadas.push({ tipo: 'funcao', nome, corpo: body })
        const f = opcoes.funcao ?? { status: 200, corpo: {} }
        if (f === 'sem-resposta') return Promise.reject(new Error('Failed to fetch'))
        if (f.status < 300) return Promise.resolve({ data: f.corpo, error: null })
        const resposta = new Response(JSON.stringify(f.corpo), { status: f.status })
        return Promise.resolve({ data: null, error: { name: 'FunctionsHttpError', context: resposta } })
      },
    },
  }
  return { cliente, chamadas }
}

describe('o paciente pede o link e os avisos', () => {
  it('CA-2235: o e-mail mascarado (sem "Usar outro") manda o pedido sem o endereço; o servidor usa o do link', async () => {
    const { cliente, chamadas } = falso({ funcao: { status: 200, corpo: { enviadoPara: 'j•••a@gmail.com', confirmar: false } } })
    expect(await receberLinkPorEmail(cliente, { token: 'k7q2mx9pla3r', email: null, avisos: [] })).toEqual({ ok: true, enviadoPara: 'j•••a@gmail.com', confirmar: false, confirmarEmail: false })
    expect(chamadas[0]).toEqual({ tipo: 'funcao', nome: 'meu-link', corpo: { acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] } })
  })

  it('CA-2240: com avisos marcados, a resposta diz que é preciso confirmar', async () => {
    const { cliente, chamadas } = falso({ funcao: { status: 200, corpo: { enviadoPara: 'j•••a@gmail.com', confirmar: true } } })
    const r = await receberLinkPorEmail(cliente, { token: 't', email: 'juliana@gmail.com', avisos: ['semana', 'lembrete'] })
    expect(r).toMatchObject({ ok: true, confirmar: true })
    expect(chamadas[0]?.corpo).toMatchObject({ email: 'juliana@gmail.com', avisos: ['semana', 'lembrete'] })
  })

  it('CA-2236 e CA-2237: a frase do servidor chega à tela', async () => {
    expect(await receberLinkPorEmail(falso({ funcao: { status: 422, corpo: { erro: 'Confira o e-mail.' } } }).cliente, { token: 't', email: 'a@b.c', avisos: [] })).toEqual({
      ok: false,
      erro: 'Confira o e-mail.',
      status: 422,
    })
    const limite = await receberLinkPorEmail(falso({ funcao: { status: 429, corpo: { erro: 'Você já pediu 3 vezes hoje. Tente amanhã.' } } }).cliente, { token: 't', email: null, avisos: [] })
    expect(limite).toMatchObject({ ok: false, erro: 'Você já pediu 3 vezes hoje. Tente amanhã.' })
  })

  it('CB-1216: sem resposta do servidor, "Não foi possível enviar agora."', async () => {
    expect(await receberLinkPorEmail(falso({ funcao: 'sem-resposta' }).cliente, { token: 't', email: null, avisos: [] })).toEqual({ ok: false, erro: NAO_ENVIOU })
    expect(await receberLinkPorEmail(null, { token: 't', email: null, avisos: [] })).toEqual({ ok: false, erro: NAO_ENVIOU })
  })

  it('CA-2233: recuperar responde igual com resposta de erro do servidor; só a rede caída diz que não deu', async () => {
    expect(await recuperarLink(falso({ funcao: { status: 200, corpo: { ok: true } } }).cliente, 'a@b.com', 'tok')).toEqual({ ok: true })
    expect(await recuperarLink(falso({ funcao: { status: 429, corpo: {} } }).cliente, 'a@b.com', 'tok')).toEqual({ ok: true })
    expect(await recuperarLink(falso({ funcao: 'sem-resposta' }).cliente, 'a@b.com', null)).toEqual({ ok: false, erro: NAO_ENVIOU })
  })

  it('CA-2256: desligar um aviso vai pela função do banco, com o token', async () => {
    const { cliente, chamadas } = falso()
    expect(await desligarAviso(cliente, 'tok', 'semana')).toEqual({ ok: true })
    expect(chamadas[0]).toEqual({ tipo: 'rpc', nome: 'desligar_aviso', corpo: { p_token: 'tok', p_tipo: 'semana' } })
  })

  it('CA-2239: registrar o acesso devolve falso sem resposta, para tentar na próxima abertura', async () => {
    expect(await registrarAcesso(falso().cliente, 'tok')).toBe(true)
    expect(await registrarAcesso(falso({ rpc: { error: { message: 'Failed to fetch' } } }).cliente, 'tok')).toBe(false)
    expect(await registrarAcesso(null, 'tok')).toBe(false)
  })
})

describe('as páginas do aceite e do descadastro', () => {
  it('CA-2241: a página lê a chave e recebe os avisos oferecidos e os escolhidos', async () => {
    const { cliente } = falso({ funcao: { status: 200, corpo: { tipo: 'aceite', nutricionista: 'Ana Lima', avisos: ['plano', 'semana', 'lembrete'], escolhidos: ['semana', 'lembrete'], feito: false } } })
    expect(await responderAviso(cliente, { acao: 'ler', chave: 'x'.repeat(32) })).toEqual({
      ok: true,
      pagina: { tipo: 'aceite', nutricionista: 'Ana Lima', avisos: ['plano', 'semana', 'lembrete'], escolhidos: ['semana', 'lembrete'], aviso: null, emailNovo: null, feito: false },
    })
  })

  it('CA-2255: a chave que não vale diz "Este endereço não vale."', async () => {
    const r = await responderAviso(falso({ funcao: { status: 404, corpo: { erro: 'x' } } }).cliente, { acao: 'ler', chave: 'mexida' })
    expect(r).toEqual({ ok: false, erro: CHAVE_QUE_NAO_VALE, status: 404 })
  })
})

describe('a ficha', () => {
  it('CA-2260 e CA-2264: lê o e-mail, as ofertas, os aceites e os envios, do mais novo para o mais antigo', () => {
    const emails = lerEmailsDoLink({
      email: 'juliana.martins@gmail.com',
      origem: 'ficha',
      confirmado_em: null,
      ofertas: { plano: true, semana: false, lembrete: true },
      aceites: [{ tipo: 'semana', aceito_em: '2026-10-22T12:43:00Z', saiu_em: null, pausado_em: null }, { tipo: 'outro', aceito_em: 'x' }],
      pendentes: ['plano', 'nada'],
      supressao: null,
      envios: [
        { criado_em: '2026-10-22T12:42:00Z', tipo: 'S1', assunto: 'Seu link do plano', estado: 'entregue' },
        { criado_em: '2026-11-03T13:15:00Z', tipo: 'S2', assunto: 'Ana Lima enviou seu plano', estado: 'entregue' },
        { criado_em: '2026-11-03T13:15:00Z', tipo: 'X9', assunto: '?', estado: 'entregue' },
      ],
    })
    expect(emails.ofertas).toEqual({ plano: true, semana: false, lembrete: true })
    expect(emails.aceites).toEqual([{ tipo: 'semana', aceitoEm: '2026-10-22T12:43:00Z', saiuEm: null, pausadoEm: null }])
    expect(emails.pendentes).toEqual(['plano'])
    expect(emails.envios.map((e) => e.tipo)).toEqual(['S2', 'S1'])
  })

  it('DP-LP-30: sem o 017 (ou sem internet), a ficha diz "Indisponível no momento."', async () => {
    expect(await buscarEmailsDoLink(falso({ rpc: { error: { message: 'Could not find the function' } } }).cliente, 'l')).toEqual({ ok: false, erro: EMAILS_INDISPONIVEIS })
  })

  it('CA-2262: "E-mail" no cartão chama enviar-link com o link; o limite chega com a frase', async () => {
    const { cliente, chamadas } = falso({ funcao: { status: 429, corpo: { erro: 'Você chegou a 30 e-mails hoje. Amanhã volta.' } } })
    expect(await pedirEnvio(cliente, 'enviar', 'link-1')).toEqual({ ok: false, erro: 'Você chegou a 30 e-mails hoje. Amanhã volta.', status: 429 })
    expect(chamadas[0]).toEqual({ tipo: 'funcao', nome: 'enviar-link', corpo: { acao: 'enviar', link: 'link-1' } })
  })

  it('CA-2249: "Avisar por e-mail" agenda o A1 e devolve a hora', async () => {
    const { cliente, chamadas } = falso({ funcao: { status: 200, corpo: { agendadoPara: '2026-11-03T13:45:00Z' } } })
    expect(await pedirEnvio(cliente, 'atualizou', 'link-1', true)).toEqual({ ok: true, enviadoPara: null, agendadoPara: '2026-11-03T13:45:00Z' })
    expect(chamadas[0]?.corpo).toEqual({ acao: 'atualizou', link: 'link-1', avisar: true })
  })

  it('CA-2269: os links com aviso aceito', async () => {
    expect(await linksComAvisos(falso({ rpc: { data: [{ link_id: 'a' }, { link_id: 'b' }, {}] } }).cliente)).toEqual(new Set(['a', 'b']))
    expect(await linksComAvisos(null)).toEqual(new Set())
  })
})

describe('Configurações › E-mails e o Painel do dono', () => {
  it('CA-2266: sem linha, vale o padrão (os dois ligados)', async () => {
    expect(await lerConfigDeEmails(falso().cliente, 'u')).toEqual({ ok: true, config: { nome: '', responderPara: null, resumoDaAdesao: true, oferecerAosNovos: true } })
  })

  it('CA-2266: salvar grava uma linha por conta', async () => {
    const { cliente, chamadas } = falso()
    await salvarConfigDeEmails(cliente, 'u', { nome: ' Ana Lima ', responderPara: 'ana@x.com', resumoDaAdesao: false, oferecerAosNovos: true })
    expect(chamadas[0]?.corpo).toMatchObject({ nutricionista_id: 'u', nome: 'Ana Lima', responder_para: 'ana@x.com', resumo_da_adesao: false, oferecer_aos_novos: true })
  })

  it('CA-2281: o painel do dono, com os tetos lidos pela função', async () => {
    const { cliente } = falso({ rpc: { data: { hoje: 12, mes: 340, teto_dia: 70, teto_mes: 2100, adiados_7d: 3, envios_7d: 250, devolucao_7d: 2.4, queixa_7d: 0, pausado_em: '2026-11-03T12:00:00Z', motivo: 'devolução 2,4%' } } })
    expect(await lerPainelDeEmails(cliente)).toEqual({
      ok: true,
      painel: { hoje: 12, mes: 340, tetoDia: 70, tetoMes: 2100, adiados7d: 3, envios7d: 250, devolucao7d: 2.4, queixa7d: 0, pausadoEm: '2026-11-03T12:00:00Z', motivo: 'devolução 2,4%' },
    })
  })
})
