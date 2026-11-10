// Spec lado-do-paciente (T18 do PLAN): o núcleo das funções de e-mail contra o banco de um Supabase LOCAL, com o Resend
// de mentira. Os núcleos (rodada.ts, meuLink.ts, avisosResposta.ts, enviarLink.ts, webhookResend.ts) já têm teste com um
// banco de mentira em src/data/servidor*.test.ts; aqui eles rodam como nas Edge Functions, pelo `dependenciasDoAmbiente`
// e pelo `criarBancoDosAvisos` de verdade, com a chave de serviço do Supabase local. O que se confere é a ligação: as
// colunas, os índices únicos, as funções do 017 e o caminho inteiro de cada e-mail até o Resend (que aqui só anota).
//
// Nunca fala com o Resend, a Cloudflare ou a produção: o `fetch` das funções é o de mentira abaixo, que recusa qualquer
// endereço que não seja o envio em lote, e a URL do Supabase é conferida antes (preparo.ts, CB-129).
import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { dependenciasDoAmbiente } from '../../supabase/functions/_shared/avisos/ambiente.ts'
import { responderAosAvisos } from '../../supabase/functions/_shared/avisos/avisosResposta.ts'
import { criarBancoDosAvisos, quemPedeOEnvio } from '../../supabase/functions/_shared/avisos/bancoDosAvisosSupabase.ts'
import type { DependenciasComuns } from '../../supabase/functions/_shared/avisos/comum.ts'
import { hashDoEmail, mascararEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import { enviarLink } from '../../supabase/functions/_shared/avisos/enviarLink.ts'
import type { Buscar } from '../../supabase/functions/_shared/avisos/http.ts'
import { meuLink, type DependenciasDoMeuLink } from '../../supabase/functions/_shared/avisos/meuLink.ts'
import { emBrasilia, instanteEmBrasilia, somarDias } from '../../supabase/functions/_shared/avisos/regras.ts'
import { API_DO_RESEND } from '../../supabase/functions/_shared/avisos/resend.ts'
import { rodarAvisos } from '../../supabase/functions/_shared/avisos/rodada.ts'
import { receberEventoDoResend } from '../../supabase/functions/_shared/avisos/webhookResend.ts'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { prepararCenario, type Cenario } from './preparo.ts'

let c: Cenario

// ---------- O Resend de mentira ----------

const CHAVE_DO_RESEND = 're_teste_local_nunca_vale'
const APP = 'https://app.metanutri.com.br'
const REMETENTE = 'avisos@avisos.metanutri.com.br'

/** Um e-mail como o Resend recebe no envio em lote (resend.ts). */
interface EmailNoResend {
  readonly from: string
  readonly to: readonly string[]
  readonly reply_to?: string
  readonly subject: string
  readonly html: string
  readonly text: string
  readonly headers?: Readonly<Record<string, string>>
  readonly tags: readonly { readonly name: string; readonly value: string }[]
}

interface Enviado {
  readonly id: string
  readonly idempotencia: string
  readonly email: EmailNoResend
}

/** Todo endereço que as funções pediram, na ordem (CA-2283: só o envio em lote). */
const pedidos: string[] = []
const enviados: Enviado[] = []
/** 'limite': o Resend responde 429 (CA-2275). */
let resendResponde: 'ok' | 'limite' = 'ok'

const resposta = (status: number, corpo: unknown) => ({ status, json: async () => corpo })

const resendDeMentira: Buscar = async (url, pedido) => {
  pedidos.push(url)
  if (url !== `${API_DO_RESEND}/emails/batch` || pedido.method !== 'POST') return resposta(404, { message: 'endereço que o teste não conhece' })
  if (pedido.headers['Authorization'] !== `Bearer ${CHAVE_DO_RESEND}`) return resposta(401, { message: 'chave errada' })
  if (resendResponde === 'limite') return resposta(429, { name: 'rate_limit_exceeded' })
  const lote = JSON.parse(pedido.body ?? '[]') as EmailNoResend[]
  const ids = lote.map(() => `re_${randomUUID()}`)
  lote.forEach((email, i) => enviados.push({ id: ids[i] ?? '', idempotencia: pedido.headers['Idempotency-Key'] ?? '', email }))
  return resposta(200, { data: ids.map((id) => ({ id })) })
}

/** Os e-mails que foram para este endereço, na ordem. */
const para = (endereco: string): readonly Enviado[] => enviados.filter((e) => e.email.to.includes(endereco))

// ---------- As funções como nas Edge Functions ----------

// A suíte manda, no mesmo dia e quase toda da mesma conta, mais e-mails que os 70 do teto do dia e os 30 do teto por
// conta (D-1237, D-1254): os tetos ficam altos aqui, e cada teto tem o teste dele (com o número de sempre, abaixo).
const TETOS_DA_SUITE: Readonly<Record<string, string>> = { TETO_DIA: '100000', TETO_MES: '1000000', TETO_CONTA_DIA: '100000' }
const variaveis: Record<string, string> = { RESEND_API_KEY: CHAVE_DO_RESEND, ENDERECO_DO_APP: APP, REMETENTE_DOS_AVISOS: REMETENTE, ...TETOS_DA_SUITE }

function dependencias(agora: Date = new Date()): DependenciasComuns {
  return { ...dependenciasDoAmbiente((nome) => variaveis[nome], c.servico, resendDeMentira, c.ambiente.url), agora: () => agora, log: () => undefined }
}

/** A verificação contra robôs e o DNS de mentira: só o token certo passa; um domínio não recebe e-mail. */
function dependenciasDoMeuLink(agora: Date = new Date()): DependenciasDoMeuLink {
  // D-1249: no lugar dos 3 segundos, a recuperação espera o trabalho dela (o tempo fixo tem teste em servidorMeuLink).
  let trabalho: Promise<unknown> = Promise.resolve()
  return {
    ...dependencias(agora),
    turnstile: async (token) => token === 'turnstile-certo',
    temServidorDeEmail: async (dominio) => dominio !== 'semservidor.com.br',
    emSegundoPlano: (t) => void (trabalho = t),
    esperar: async () => void (await trabalho),
  }
}

let chaveDoCofre = ''
const rodar = (vez: string, agora: Date, chave: string | null = chaveDoCofre) => rodarAvisos({ metodo: 'POST', chave, corpo: { vez } }, dependencias(agora))

/** O segredo do webhook (`whsec_` e 24 bytes em base64) e a assinatura do Svix (DP-LP-18). */
const SEGREDO_DO_WEBHOOK_BYTES = randomBytes(24).toString('base64')
const SEGREDO_DO_WEBHOOK = `whsec_${SEGREDO_DO_WEBHOOK_BYTES}`
const assinar = (id: string, momento: string, corpo: string, chave = SEGREDO_DO_WEBHOOK_BYTES): string =>
  `v1,${createHmac('sha256', Buffer.from(chave, 'base64')).update(`${id}.${momento}.${corpo}`).digest('base64')}`

function evento(tipo: string, resendId: string, extra: Readonly<Record<string, unknown>> = {}) {
  const corpo = JSON.stringify({ type: tipo, created_at: new Date().toISOString(), data: { email_id: resendId, ...extra } })
  const id = `msg_${randomUUID()}`
  const momento = String(Math.floor(Date.now() / 1000))
  return { metodo: 'POST', corpo, id, momento, assinaturas: assinar(id, momento, corpo) }
}

const dependenciasDoWebhook = () => ({
  banco: criarBancoDosAvisos(c.servico, (tamanho: number) => new Uint8Array(randomBytes(tamanho))),
  agora: () => new Date(),
  log: () => undefined,
  segredo: SEGREDO_DO_WEBHOOK,
})

// ---------- O cenário ----------

const HOJE = emBrasilia(new Date()).dia
const sufixo = randomUUID().slice(0, 8)
const endereco = (nome: string): string => `${nome}.${sufixo}@exemplo.com`

type Linha = Record<string, unknown>

interface Link {
  readonly id: string
  readonly token: string
}

function sem(contexto: string, erro: { readonly message: string } | null): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`)
}

/** Um link da vítima, gravado pelo login dela como o app grava, com o e-mail da ficha publicado (DP-LP-7). */
async function novoLink(nome: string, email: string | null): Promise<Link> {
  const id = randomUUID()
  const token = `lp${randomUUID().replace(/-/g, '').slice(0, 16)}`
  const r = await c.vitima.cliente.from('acompanhamentos').insert({
    id,
    nutricionista_id: c.vitima.id,
    token,
    caso_id: `caso-${id}`,
    paciente_id: `paciente-${id}`,
    nome,
    missoes: [
      { id: 'm1', texto: 'Beber 2 litros de água' },
      { id: 'm2', texto: 'Comer uma fruta' },
    ],
    marcacoes: [],
  })
  sem('criar o link', r.error)
  if (email !== null) sem('publicar o e-mail da ficha', (await c.vitima.cliente.rpc('definir_email_da_ficha', { p_link: id, p_email: email })).error)
  return { id, token }
}

/** O aceite como a página do aceite grava (servidor). */
async function aceitar(link: Link, tipo: 'plano' | 'semana' | 'lembrete', email: string): Promise<void> {
  sem('gravar o aceite', (await c.servico.from('aceites').insert({ link_id: link.id, nutricionista_id: c.vitima.id, tipo, email_hash: await hashDoEmail(email) })).error)
}

async function enviosDo(link: Link): Promise<readonly Linha[]> {
  const r = await c.servico.from('envios').select('tipo, estado, resend_id, chave_unica, dia, extra').eq('link_id', link.id).order('id')
  sem('ler os envios', r.error)
  return (r.data ?? []) as Linha[]
}

async function linhaDoLink(link: Link): Promise<Linha> {
  const r = await c.servico.from('acompanhamentos').select('*').eq('id', link.id).single()
  sem('ler o link', r.error)
  return r.data as Linha
}

async function avisosNoLink(link: Link): Promise<unknown> {
  const r = await c.anonimo.rpc('missoes_por_token', { p_token: link.token })
  sem('abrir o link', r.error)
  return ((r.data ?? []) as Linha[])[0]?.['avisos']
}

/** A chave de 32 letras de um endereço de botão ou de descadastro. */
function chaveDe(texto: string | undefined, onde: RegExp): string {
  const achada = onde.exec(texto ?? '')?.[1]
  if (!achada) throw new Error(`Sem a chave em: ${texto ?? '(vazio)'}`)
  return achada
}
const CHAVE_DO_UM_CLIQUE = /avisos-resposta\?c=([A-Za-z0-9]{32})/
const CHAVE_DA_PAGINA = /\/avisos\/([A-Za-z0-9]{32})/

let tokenDaVitima = ''
let respostaDaVitima = ''

beforeAll(async () => {
  c = await prepararCenario()
  chaveDoCofre = sqlNoBancoLocal("select decrypted_secret from vault.decrypted_secrets where name = 'metanutri_chave_dos_avisos';").saida
  expect(chaveDoCofre).toMatch(/^[0-9a-f]{64}$/)
  tokenDaVitima = (await c.vitima.cliente.auth.getSession()).data.session?.access_token ?? ''
  expect(tokenDaVitima).not.toBe('')
  const config = await c.servico.from('config_de_emails').select('responder_para').eq('nutricionista_id', c.vitima.id).single()
  sem('ler a configuração', config.error)
  respostaDaVitima = String(config.data?.responder_para)
})

afterAll(async () => {
  // Os avisos não ficam pausados para os outros arquivos.
  await c.servico.from('estado_dos_avisos').update({ pausado_em: null, motivo: null }).eq('id', 1)
})

describe('a rodada dos avisos (função avisos)', () => {
  it('CA-2270: sem a chave do cofre, a rodada responde 401 e nada sai', async () => {
    const antes = enviados.length
    for (const chave of [null, '', 'f'.repeat(64), chaveDoCofre.slice(0, 63)]) {
      expect((await rodar('tarde', instanteEmBrasilia(HOJE, 18, 0), chave)).status).toBe(401)
    }
    expect(enviados.length).toBe(antes)
  })

  describe('o lembrete (A3) e o descadastro de um clique', () => {
    const email = endereco('juliana')
    const dia = somarDias(HOJE, 4)
    let link: Link

    beforeAll(async () => {
      link = await novoLink('Juliana Martins', email)
      await aceitar(link, 'lembrete', email)
    })

    it('CA-2244 e CA-2251: às 18h do quarto dia sem marcar, o A3 sai e fica nos envios com a chave única', async () => {
      const r = await rodar('tarde', instanteEmBrasilia(dia, 18, 5))
      expect(r.status).toBe(200)
      const recebidos = para(email)
      expect(recebidos).toHaveLength(1)
      const a3 = recebidos[0]
      expect(a3?.email).toMatchObject({ subject: 'Ainda dá tempo de marcar hoje', from: `"Ana ${c.marcador} via MetaNutri" <${REMETENTE}>`, reply_to: respostaDaVitima, tags: [{ name: 'tipo', value: 'A3' }] })
      expect(a3?.email.text).toContain('faz 4 dias')
      expect(a3?.email.html).toContain(`${APP}/p/${link.token}`)
      // CA-2252: o descadastro de um clique aponta para a função, sem mailto.
      expect(a3?.email.headers).toEqual({
        'List-Unsubscribe': expect.stringMatching(new RegExp(`^<${c.ambiente.url}/functions/v1/avisos-resposta\\?c=[A-Za-z0-9]{32}>$`)),
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      })
      const hash = await hashDoEmail(email)
      expect(await enviosDo(link)).toEqual([{ tipo: 'A3', estado: 'enviado', resend_id: a3?.id, chave_unica: `${hash}:A3:${dia}:${link.id}`, dia, extra: { dias: 4 } }])
    })

    it('CA-2276: a mesma chamada repetida não manda o lembrete de novo', async () => {
      expect((await rodar('tarde', instanteEmBrasilia(dia, 18, 5))).status).toBe(200)
      expect((await rodar('tarde', instanteEmBrasilia(dia, 18, 20))).status).toBe(200)
      expect(para(email)).toHaveLength(1)
      expect(await enviosDo(link)).toHaveLength(1)
    })

    it('CA-2252: o POST de um clique sai só do lembrete, sem página', async () => {
      expect(await avisosNoLink(link)).toMatchObject({ lembrete: 'ligado' })
      const chave = chaveDe(para(email)[0]?.email.headers?.['List-Unsubscribe'], CHAVE_DO_UM_CLIQUE)
      const r = await responderAosAvisos({ metodo: 'POST', chaveDaUrl: chave, corpo: null, umClique: true }, dependencias())
      expect(r).toEqual({ status: 200, corpo: { ok: true } })
      expect(await avisosNoLink(link)).toEqual({ plano: 'desligado', semana: 'desligado', lembrete: 'desligado' })
      const aceite = await c.servico.from('aceites').select('saiu_em').eq('link_id', link.id).single()
      expect(aceite.data?.saiu_em).not.toBeNull()
    })

    it('CA-2253: a página mostra o descadastro feito, e "Desfazer" volta como estava, sem novo S3', async () => {
      const chave = chaveDe(para(email)[0]?.email.headers?.['List-Unsubscribe'], CHAVE_DO_UM_CLIQUE)
      const lida = await responderAosAvisos({ metodo: 'POST', chaveDaUrl: null, corpo: { acao: 'ler', chave }, umClique: false }, dependencias())
      expect(lida).toMatchObject({ status: 200, corpo: { tipo: 'sair', aviso: 'lembrete', feito: true } })
      const desfeita = await responderAosAvisos({ metodo: 'POST', chaveDaUrl: null, corpo: { acao: 'desfazer', chave }, umClique: false }, dependencias())
      expect(desfeita).toMatchObject({ status: 200, corpo: { feito: false } })
      expect(await avisosNoLink(link)).toMatchObject({ lembrete: 'ligado' })
      expect(para(email)).toHaveLength(1)
    })

    it('CA-2255: a chave mexida à mão não vale e não muda nada', async () => {
      const chave = chaveDe(para(email)[0]?.email.headers?.['List-Unsubscribe'], CHAVE_DO_UM_CLIQUE)
      const mexida = `${chave.slice(0, 31)}${chave.endsWith('A') ? 'B' : 'A'}`
      const r = await responderAosAvisos({ metodo: 'POST', chaveDaUrl: mexida, corpo: null, umClique: true }, dependencias())
      expect(r).toEqual({ status: 404, corpo: { erro: 'Este endereço não vale. Abra o botão do e-mail mais recente.' } })
      expect(await avisosNoLink(link)).toMatchObject({ lembrete: 'ligado' })
    })
  })

  describe('o plano atualizado (A1)', () => {
    const email = endereco('carlos')
    const dia = somarDias(HOJE, 5)
    let link: Link

    beforeAll(async () => {
      link = await novoLink('Carlos Souza', email)
      await aceitar(link, 'plano', email)
    })

    afterAll(() => {
      resendResponde = 'ok'
    })

    it('CA-2249: "Avisar por e-mail" agenda o A1 para 30 minutos depois, pela conta da sessão', async () => {
      const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
      expect(conta).toBe(c.vitima.id)
      const r = await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'atualizou', link: link.id, avisar: true } }, dependencias(instanteEmBrasilia(dia, 10, 0)))
      const quando = instanteEmBrasilia(dia, 10, 30).toISOString()
      expect(r).toEqual({ status: 200, corpo: { enviadoPara: null, agendadoPara: quando } })
      expect(Date.parse(String((await linhaDoLink(link))['a1_para']))).toBe(Date.parse(quando))
    })

    it('CA-2275 e CB-1216: o 429 do Resend deixa o A1 adiado, e o horário seguinte o manda sem repetir', async () => {
      resendResponde = 'limite'
      const adiada = await rodar('a1', instanteEmBrasilia(dia, 10, 30))
      expect(adiada).toMatchObject({ status: 200, corpo: { enviados: 0 } })
      expect(para(email)).toHaveLength(0)
      expect(await enviosDo(link)).toEqual([expect.objectContaining({ tipo: 'A1', estado: 'adiado', resend_id: null })])
      expect((await linhaDoLink(link))['a1_para']).not.toBeNull()

      resendResponde = 'ok'
      expect((await rodar('a1', instanteEmBrasilia(dia, 10, 45))).status).toBe(200)
      const recebidos = para(email)
      expect(recebidos.map((e) => e.email.subject)).toEqual(['Seu plano foi atualizado'])
      expect(await enviosDo(link)).toEqual([expect.objectContaining({ tipo: 'A1', estado: 'enviado', resend_id: recebidos[0]?.id })])
      expect((await linhaDoLink(link))['a1_para']).toBeNull()

      // Mais uma chamada no mesmo dia: o A1 já saiu.
      expect((await rodar('a1', instanteEmBrasilia(dia, 11, 0))).status).toBe(200)
      expect(para(email)).toHaveLength(1)
    })

    it('CB-1209: o aviso desligado pela nutricionista depois do agendamento não sai, e o agendamento cai', async () => {
      const outro = endereco('debora')
      const desligado = await novoLink('Débora Lima', outro)
      await aceitar(desligado, 'plano', outro)
      const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
      expect((await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'atualizou', link: desligado.id, avisar: true } }, dependencias(instanteEmBrasilia(dia, 12, 0)))).status).toBe(200)
      sem('desligar a oferta', (await c.vitima.cliente.rpc('definir_ofertas', { p_link: desligado.id, p_plano: false, p_semana: true, p_lembrete: true })).error)
      expect((await rodar('a1', instanteEmBrasilia(dia, 12, 30))).status).toBe(200)
      expect(para(outro)).toHaveLength(0)
      expect((await linhaDoLink(desligado))['a1_para']).toBeNull()
    })

    it('CB-1214: o link removido com o A1 agendado não manda nada', async () => {
      const outro = endereco('elisa')
      const removido = await novoLink('Elisa Prado', outro)
      await aceitar(removido, 'plano', outro)
      sem('agendar o A1', (await c.servico.from('acompanhamentos').update({ a1_para: instanteEmBrasilia(dia, 13, 0).toISOString() }).eq('id', removido.id)).error)
      sem('remover o link', (await c.vitima.cliente.from('acompanhamentos').delete().eq('id', removido.id)).error)
      expect((await rodar('a1', instanteEmBrasilia(dia, 13, 15))).status).toBe(200)
      expect(para(outro)).toHaveLength(0)
    })
  })

  describe('o resumo da semana (A2) e o resumo da adesão (N1)', () => {
    const email = endereco('beatriz')
    let link: Link

    beforeAll(async () => {
      link = await novoLink('Beatriz Ramos', email)
      await aceitar(link, 'semana', email)
      const marcacoes = [
        { dia: somarDias(HOJE, 2), feitas: ['m1', 'm2'] },
        { dia: somarDias(HOJE, 4), feitas: ['m1'] },
      ]
      sem('marcar', (await c.servico.from('acompanhamentos').update({ marcacoes }).eq('id', link.id)).error)
    })

    it('CA-2247: no dia da semana do aceite, às 8h, o A2 leva os 7 dias e a conta da Adesão', async () => {
      const dia = somarDias(HOJE, 7)
      expect((await rodar('manha', instanteEmBrasilia(dia, 8, 5))).status).toBe(200)
      const recebidos = para(email)
      expect(recebidos.map((e) => e.email.subject)).toEqual(['Sua semana: 2 de 7 dias'])
      expect(recebidos[0]?.email.text).toContain('A meta é 4 dias por semana.')
      expect(await enviosDo(link)).toEqual([expect.objectContaining({ tipo: 'A2', estado: 'enviado', dia, extra: { dias: 2 } })])
    })

    it('CA-2267, CA-2268 e CA-2276: o N1 vai ao e-mail da conta, como MetaNutri, sem nada do paciente, uma vez por dia', async () => {
      const agora = instanteEmBrasilia(somarDias(HOJE, 8), 7, 0)
      expect((await rodar('n1', agora)).status).toBe(200)
      expect((await rodar('n1', agora)).status).toBe(200)
      const recebidos = para(c.vitima.email)
      expect(recebidos).toHaveLength(1)
      const n1 = recebidos[0]?.email
      expect(n1?.from).toBe(`"MetaNutri" <${REMETENTE}>`)
      expect(n1?.reply_to).toBeUndefined()
      expect(n1?.subject).toMatch(/^Adesão da semana: /)
      expect(n1?.headers?.['List-Unsubscribe']).toMatch(CHAVE_DO_UM_CLIQUE)
      const tudo = `${n1?.html ?? ''}\n${n1?.text ?? ''}`
      for (const proibido of [c.marcador, 'Martins', 'Souza', 'Ramos', c.vitima.emailDoPaciente, email, endereco('juliana'), endereco('carlos')]) expect(tudo).not.toContain(proibido)
    })
  })
})

describe('o paciente pede sem conta (função meu-link)', () => {
  const daFicha = endereco('pedro.ficha')
  const novo = endereco('pedro.novo')
  let link: Link

  beforeAll(async () => {
    link = await novoLink('Pedro Alves', daFicha)
  })

  it('CA-2235, CA-2291 e CB-1211: "Receber meu link" com um e-mail digitado manda o S1 e o "Confirme o seu e-mail"; o link fica com o da ficha', async () => {
    const r = await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token: link.token, email: ` ${novo.toUpperCase()} `, avisos: ['semana', 'lembrete'] } }, dependenciasDoMeuLink())
    expect(r).toEqual({ status: 200, corpo: { enviadoPara: mascararEmail(novo), confirmar: true, confirmarEmail: true } })
    const recebidos = para(novo)
    expect(recebidos.map((e) => e.email.subject)).toEqual(['Seu link do plano', 'Confirme o seu e-mail'])
    expect(recebidos[0]?.email.html).toContain(`${APP}/p/${link.token}`)
    expect(para(daFicha)).toHaveLength(0)
    // D-1247: até o "Confirmar", o link continua com o e-mail da ficha, e o digitado não recupera o link.
    const linha = await c.servico.from('emails_dos_links').select('email, origem, confirmado_em').eq('link_id', link.id).single()
    expect(linha.data).toEqual({ email: daFicha, origem: 'ficha', confirmado_em: null })
    const antes = para(novo).length
    expect(await meuLink({ metodo: 'POST', ip: '203.0.113.90', corpo: { acao: 'recuperar', email: novo, turnstile: 'turnstile-certo' } }, dependenciasDoMeuLink())).toEqual({ status: 200, corpo: { ok: true } })
    expect(para(novo)).toHaveLength(antes)
    // Este pedido gastou um dos 3 da hora deste e-mail (CA-2234): ele volta, para o teste da recuperação, abaixo, ter os 3.
    sem('devolver o pedido da recuperação', (await c.servico.rpc('devolver_limite', { p_chave: `rec-email:${await hashDoEmail(novo)}` })).error)
    const chaves = await c.servico.from('chaves_de_aviso').select('tipo, avisos, email, email_hash, vence_em, usado_em').eq('link_id', link.id).eq('tipo', 'aceite')
    expect(chaves.data).toEqual([expect.objectContaining({ tipo: 'aceite', avisos: ['semana', 'lembrete'], email: novo, email_hash: await hashDoEmail(novo), usado_em: null })])
    // CB-1222: a chave do aceite vale 7 dias.
    const vence = Date.parse(String(chaves.data?.[0]?.vence_em))
    expect(Math.abs(vence - (Date.now() + 7 * 24 * 60 * 60 * 1000))).toBeLessThan(5 * 60 * 1000)
  })

  it('CA-2241 e CA-2291: abrir a página não aceita nada; só o "Confirmar" leva o e-mail ao link e grava os aceites, com a versão avisos-v1', async () => {
    const chave = chaveDe(para(novo)[1]?.email.html, CHAVE_DA_PAGINA)
    const lida = await responderAosAvisos({ metodo: 'POST', chaveDaUrl: null, corpo: { acao: 'ler', chave }, umClique: false }, dependencias())
    expect(lida).toMatchObject({ status: 200, corpo: { tipo: 'aceite', escolhidos: ['semana', 'lembrete'], emailNovo: mascararEmail(novo), feito: false } })
    expect((await c.servico.from('aceites').select('id').eq('link_id', link.id)).data).toEqual([])
    expect((await c.servico.from('emails_dos_links').select('email').eq('link_id', link.id).single()).data?.email).toBe(daFicha)

    const confirmada = await responderAosAvisos({ metodo: 'POST', chaveDaUrl: null, corpo: { acao: 'confirmar', chave, avisos: ['semana', 'lembrete'] }, umClique: false }, dependencias())
    expect(confirmada).toMatchObject({ status: 200, corpo: { escolhidos: ['semana', 'lembrete'], feito: true } })
    // O botão tocado de novo não grava outro aceite.
    expect((await responderAosAvisos({ metodo: 'POST', chaveDaUrl: null, corpo: { acao: 'confirmar', chave }, umClique: false }, dependencias())).status).toBe(200)
    const aceites = await c.servico.from('aceites').select('tipo, versao, email_hash, saiu_em').eq('link_id', link.id).order('tipo')
    const hash = await hashDoEmail(novo)
    expect(aceites.data).toEqual([
      { tipo: 'lembrete', versao: 'avisos-v1', email_hash: hash, saiu_em: null },
      { tipo: 'semana', versao: 'avisos-v1', email_hash: hash, saiu_em: null },
    ])
    expect(await avisosNoLink(link)).toEqual({ plano: 'desligado', semana: 'ligado', lembrete: 'ligado' })
    const linha = await c.servico.from('emails_dos_links').select('email, email_hash, origem, confirmado_em').eq('link_id', link.id).single()
    expect(linha.data).toMatchObject({ email: novo, email_hash: hash, origem: 'paciente' })
    expect(linha.data?.confirmado_em).not.toBeNull()
  })

  it('CA-2292: o pedido que não sai (o Resend recusa) não muda o e-mail, não deixa chave e não conta nos 3 do dia', async () => {
    const outro = await novoLink('Otávio Reis', endereco('otavio'))
    resendResponde = 'limite'
    try {
      for (let i = 0; i < 4; i++) {
        const r = await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token: outro.token, email: endereco('otavio.novo'), avisos: ['semana'] } }, dependenciasDoMeuLink())
        expect(r.status).toBe(503)
      }
    } finally {
      resendResponde = 'ok'
    }
    expect((await c.servico.from('chaves_de_aviso').select('chave').eq('link_id', outro.id)).data).toEqual([])
    expect((await c.servico.from('limites_de_envio').select('id').eq('chave', `link:${outro.id}`)).data).toEqual([])
    expect((await c.servico.from('emails_dos_links').select('email').eq('link_id', outro.id).single()).data?.email).toBe(endereco('otavio'))
    expect((await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token: outro.token, usarDaFicha: true, avisos: [] } }, dependenciasDoMeuLink())).status).toBe(200)
  })

  it('CA-2289: depois da troca, o endereço do plano anterior não pede o link por e-mail nem liga aviso', async () => {
    // O link de um plano anterior (antes do link fixo), que a migração fez apontar para o fixo, e a troca do endereço.
    const fixo = await novoLink('Rita Prado', endereco('rita'))
    const antigo = { id: randomUUID(), token: `lp${randomUUID().replace(/-/g, '').slice(0, 16)}` }
    sem(
      'o link do plano anterior',
      (await c.vitima.cliente.from('acompanhamentos').insert({ id: antigo.id, nutricionista_id: c.vitima.id, token: antigo.token, caso_id: 'caso-antigo', paciente_id: `paciente-${fixo.id}`, nome: 'Rita Prado', substituido_por: fixo.id }))
        .error,
    )
    sem('trocar o endereço', (await c.vitima.cliente.from('acompanhamentos').update({ token: `lp${randomUUID().replace(/-/g, '').slice(0, 16)}` }).eq('id', fixo.id)).error)
    const antes = enviados.length
    const naoAbre = { status: 404, corpo: { erro: 'Este link não abre mais.' } }
    for (const token of [antigo.token, fixo.token]) {
      expect(await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token, email: endereco('quem.pegou'), avisos: ['semana'] } }, dependenciasDoMeuLink())).toEqual(naoAbre)
      expect(await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'ligar', token, tipo: 'semana' } }, dependenciasDoMeuLink())).toEqual(naoAbre)
    }
    expect(enviados.length).toBe(antes)
  })

  it('CA-2236: o domínio sem servidor de e-mail é recusado, e nada sai', async () => {
    const antes = enviados.length
    const r = await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token: link.token, email: 'pedro@semservidor.com.br', avisos: [] } }, dependenciasDoMeuLink())
    expect(r).toEqual({ status: 422, corpo: { erro: 'Confira o e-mail.' } })
    expect(enviados.length).toBe(antes)
  })

  it('CA-2237: o quarto pedido do dia no mesmo link não sai', async () => {
    const pedir = () => meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token: link.token, usarDaFicha: true, avisos: [] } }, dependenciasDoMeuLink())
    expect((await pedir()).status).toBe(200)
    expect((await pedir()).status).toBe(200)
    const antes = para(novo).length
    expect(await pedir()).toEqual({ status: 429, corpo: { erro: 'Você já pediu 3 vezes hoje. Tente amanhã.' } })
    expect(para(novo)).toHaveLength(antes)
  })

  it('CA-2233 e CA-2234: "Recuperar meu link" manda o S1 como MetaNutri e responde igual para todos; o quarto pedido da hora não sai', async () => {
    const recuperar = (email: string, turnstile: string, ip: string) => meuLink({ metodo: 'POST', ip, corpo: { acao: 'recuperar', email, turnstile } }, dependenciasDoMeuLink())
    const antes = para(novo).length
    expect(await recuperar(novo.toUpperCase(), 'turnstile-certo', '203.0.113.1')).toEqual({ status: 200, corpo: { ok: true } })
    const s1 = para(novo)[antes]?.email
    expect(s1).toMatchObject({ subject: 'Seu link do plano', from: `"MetaNutri" <${REMETENTE}>` })
    expect(s1?.reply_to).toBeUndefined()
    expect(s1?.html).toContain(`${APP}/p/${link.token}`)

    // Sem cadastro ou sem a verificação: a mesma resposta, e nada sai.
    const total = enviados.length
    expect(await recuperar(endereco('ninguem'), 'turnstile-certo', '203.0.113.2')).toEqual({ status: 200, corpo: { ok: true } })
    expect(await recuperar(novo, 'turnstile-errado', '203.0.113.3')).toEqual({ status: 200, corpo: { ok: true } })
    expect(enviados.length).toBe(total)

    // D-1220: 3 por hora por e-mail, cada pedido de um endereço de internet diferente.
    expect(await recuperar(novo, 'turnstile-certo', '203.0.113.4')).toEqual({ status: 200, corpo: { ok: true } })
    expect(await recuperar(novo, 'turnstile-certo', '203.0.113.5')).toEqual({ status: 200, corpo: { ok: true } })
    expect(para(novo)).toHaveLength(antes + 3)
    expect(await recuperar(novo, 'turnstile-certo', '203.0.113.6')).toEqual({ status: 200, corpo: { ok: true } })
    expect(para(novo)).toHaveLength(antes + 3)
  })
})

describe('a nutricionista manda pelo servidor (função enviar-link)', () => {
  const email = endereco('helena')
  let link: Link

  beforeAll(async () => {
    link = await novoLink('Helena Costa', email)
  })

  it('o link de outra conta não existe para quem pede, e nada sai', async () => {
    const tokenDoAtacante = (await c.atacante.cliente.auth.getSession()).data.session?.access_token ?? ''
    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDoAtacante}`)
    expect(conta).toBe(c.atacante.id)
    const r = await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: link.id } }, dependencias())
    expect(r).toEqual({ status: 404, corpo: { erro: 'Este link não existe mais.' } })
    expect(await quemPedeOEnvio(c.servico, 'Bearer token-que-nao-vale')).toBeNull()
    expect(para(email)).toHaveLength(0)
  })

  it('CA-2262 e CA-2243: "E-mail" manda o S2 com o convite dos avisos e o descadastro de um clique', async () => {
    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
    const r = await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: link.id } }, dependencias())
    expect(r).toEqual({ status: 200, corpo: { enviadoPara: mascararEmail(email), agendadoPara: null } })
    const recebidos = para(email)
    expect(recebidos).toHaveLength(1)
    const s2 = recebidos[0]?.email
    expect(s2).toMatchObject({ subject: `Ana ${c.marcador} enviou seu plano`, reply_to: respostaDaVitima })
    expect(s2?.text).toContain('Quero receber os avisos')
    expect(s2?.headers?.['List-Unsubscribe']).toMatch(CHAVE_DO_UM_CLIQUE)
    expect((await c.servico.from('emails_dos_links').select('convite_em').eq('link_id', link.id).single()).data?.convite_em).not.toBeNull()
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ tipo: 'S2', estado: 'enviado', resend_id: recebidos[0]?.id })])
  })

  it('CA-2254: "Não quero receber e-mails deste plano" (o um clique do S2) para tudo, e o S2 deixa de sair', async () => {
    const chave = chaveDe(para(email)[0]?.email.headers?.['List-Unsubscribe'], CHAVE_DO_UM_CLIQUE)
    expect(await responderAosAvisos({ metodo: 'POST', chaveDaUrl: chave, corpo: null, umClique: true }, dependencias())).toEqual({ status: 200, corpo: { ok: true } })
    expect((await c.servico.from('emails_dos_links').select('parou_tudo_em').eq('link_id', link.id).single()).data?.parou_tudo_em).not.toBeNull()
    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
    expect(await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: link.id } }, dependencias())).toEqual({ status: 409, corpo: { erro: 'Helena pediu para não receber e-mails.' } })
    expect(para(email)).toHaveLength(1)
  })

  it('CA-2223: "Trocar o endereço" manda o S4 na hora, com o endereço do link', async () => {
    const outro = endereco('igor')
    const trocado = await novoLink('Igor Nunes', outro)
    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
    expect(await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'trocou', link: trocado.id } }, dependencias())).toEqual({ status: 200, corpo: { enviadoPara: mascararEmail(outro), agendadoPara: null } })
    const s4 = para(outro)[0]?.email
    expect(s4?.subject).toBe('Seu link do plano mudou')
    expect(s4?.html).toContain(`${APP}/p/${trocado.token}`)
  })
})

describe('os eventos do Resend (função webhook-resend)', () => {
  const email = endereco('joana')
  let link: Link
  let resendId = ''

  beforeAll(async () => {
    link = await novoLink('Joana Dias', email)
    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
    expect((await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: link.id } }, dependencias())).status).toBe(200)
    resendId = para(email)[0]?.id ?? ''
    expect(resendId).not.toBe('')
  })

  it('CA-2277: com a assinatura errada (ou fora do tempo), nada muda', async () => {
    const certo = evento('email.bounced', resendId, { bounce: { type: 'Permanent' } })
    const errados = [
      { ...certo, assinaturas: assinar(certo.id, certo.momento, certo.corpo, randomBytes(24).toString('base64')) },
      { ...certo, assinaturas: null },
      { ...certo, momento: String(Math.floor(Date.now() / 1000) - 3600), assinaturas: assinar(certo.id, String(Math.floor(Date.now() / 1000) - 3600), certo.corpo) },
    ]
    for (const pedido of errados) expect((await receberEventoDoResend(pedido, dependenciasDoWebhook())).status).toBe(401)
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ estado: 'enviado' })])
    expect((await c.servico.from('supressao').select('motivo').eq('email_hash', await hashDoEmail(email))).data).toEqual([])
  })

  it('CA-2277 e CA-2265: o "entregue" muda o estado; o "devolvido" põe o endereço na supressão, e nada mais sai para ele', async () => {
    expect(await receberEventoDoResend(evento('email.delivered', resendId), dependenciasDoWebhook())).toEqual({ status: 200, corpo: { ok: true } })
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ estado: 'entregue' })])
    expect(await receberEventoDoResend(evento('email.bounced', resendId, { bounce: { type: 'Permanent' } }), dependenciasDoWebhook())).toEqual({ status: 200, corpo: { ok: true } })
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ estado: 'devolvido' })])
    expect((await c.servico.from('supressao').select('motivo').eq('email_hash', await hashDoEmail(email))).data).toEqual([{ motivo: 'devolvido' }])
    // Um "entregue" atrasado não desfaz a devolução.
    expect((await receberEventoDoResend(evento('email.delivered', resendId), dependenciasDoWebhook())).status).toBe(200)
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ estado: 'devolvido' })])

    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
    expect(await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: link.id } }, dependencias())).toEqual({
      status: 422,
      corpo: { erro: 'O e-mail voltou: o endereço não existe. Confira na ficha.' },
    })
    expect(await meuLink({ metodo: 'POST', ip: null, corpo: { acao: 'receber', token: link.token, usarDaFicha: true, avisos: [] } }, dependenciasDoMeuLink())).toEqual({
      status: 422,
      corpo: { erro: 'Confira o e-mail.' },
    })
    expect(para(email)).toHaveLength(1)
  })

  it('o evento de um e-mail que não é dos avisos é ignorado', async () => {
    expect(await receberEventoDoResend(evento('email.bounced', `re_${randomUUID()}`, { bounce: { type: 'Permanent' } }), dependenciasDoWebhook())).toEqual({ status: 200, corpo: { ignorado: true } })
  })
})

describe('a chave de descadastro presa ao endereço (D-1252)', () => {
  it('CA-2297: com a ficha corrigida, o um clique do e-mail que foi para o endereço errado não vale e não muda nada', async () => {
    const errado = endereco('rui.errado')
    const certo = endereco('rui')
    const rui = await novoLink('Rui Lopes', errado)
    const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
    expect((await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: rui.id } }, dependencias())).status).toBe(200)
    const chave = chaveDe(para(errado)[0]?.email.headers?.['List-Unsubscribe'], CHAVE_DO_UM_CLIQUE)
    sem('corrigir a ficha', (await c.vitima.cliente.rpc('definir_email_da_ficha', { p_link: rui.id, p_email: certo })).error)
    expect(await responderAosAvisos({ metodo: 'POST', chaveDaUrl: chave, corpo: null, umClique: true }, dependencias())).toEqual({
      status: 404,
      corpo: { erro: 'Este endereço não vale. Abra o botão do e-mail mais recente.' },
    })
    expect((await c.servico.from('emails_dos_links').select('parou_tudo_em').eq('link_id', rui.id).single()).data?.parou_tudo_em).toBeNull()
  })
})

describe('a pausa e os tetos (D-1237, D-1239)', () => {
  const email = endereco('lucas')
  const dia = somarDias(HOJE, 9)
  let link: Link

  beforeAll(async () => {
    link = await novoLink('Lucas Teixeira', email)
    await aceitar(link, 'plano', email)
    sem('agendar o A1', (await c.servico.from('acompanhamentos').update({ a1_para: instanteEmBrasilia(dia, 9, 0).toISOString() }).eq('id', link.id)).error)
  })

  it('D-1239 e CA-2264: com os avisos pausados, o A1 fica "pausado" e não sai; retomado, sai no horário seguinte', async () => {
    sem('pausar', (await c.servico.from('estado_dos_avisos').update({ pausado_em: new Date().toISOString(), motivo: 'devolução 2,4%' }).eq('id', 1)).error)
    expect((await rodar('a1', instanteEmBrasilia(dia, 9, 15))).status).toBe(200)
    expect(para(email)).toHaveLength(0)
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ tipo: 'A1', estado: 'pausado' })])

    sem('retomar', (await c.servico.from('estado_dos_avisos').update({ pausado_em: null, motivo: null }).eq('id', 1)).error)
    expect((await rodar('a1', instanteEmBrasilia(dia, 9, 30))).status).toBe(200)
    expect(para(email).map((e) => e.email.subject)).toEqual(['Seu plano foi atualizado'])
    expect(await enviosDo(link)).toEqual([expect.objectContaining({ tipo: 'A1', estado: 'enviado' })])
  })

  it('CA-2274 e CA-2281: os tetos das variáveis valem na chamada seguinte e ficam no estado dos avisos', async () => {
    variaveis['TETO_DIA'] = '1500'
    variaveis['TETO_MES'] = '45000'
    try {
      expect((await rodar('a1', instanteEmBrasilia(dia, 10, 0))).status).toBe(200)
      expect((await c.servico.from('estado_dos_avisos').select('teto_dia, teto_mes').eq('id', 1).single()).data).toEqual({ teto_dia: 1500, teto_mes: 45000 })
    } finally {
      delete variaveis['TETO_DIA']
      delete variaveis['TETO_MES']
    }
    try {
      expect((await rodar('a1', instanteEmBrasilia(dia, 10, 15))).status).toBe(200)
      expect((await c.servico.from('estado_dos_avisos').select('teto_dia, teto_mes').eq('id', 1).single()).data).toEqual({ teto_dia: 70, teto_mes: 2100 })
    } finally {
      Object.assign(variaveis, TETOS_DA_SUITE)
    }
  })

  it('CA-2299: o banco conta o que cada conta mandou no dia, e a conta no teto dela ouve a frase do limite', async () => {
    const banco = criarBancoDosAvisos(c.servico, (n) => new Uint8Array(randomBytes(n)))
    const agora = new Date()
    const contagem = await banco.contarEnvios(new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())), new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)))
    const daVitima = contagem.porConta?.get(c.vitima.id) ?? 0
    expect(daVitima).toBeGreaterThan(0)
    const helena = await novoLink('Helena Teto', endereco('helena.teto'))
    variaveis['TETO_CONTA_DIA'] = String(daVitima)
    try {
      const conta = await quemPedeOEnvio(c.servico, `Bearer ${tokenDaVitima}`)
      const antes = enviados.length
      expect(await enviarLink({ metodo: 'POST', conta, corpo: { acao: 'enviar', link: helena.id } }, dependencias())).toEqual({ status: 429, corpo: { erro: 'Você chegou a 30 e-mails hoje. Amanhã volta.' } })
      expect(enviados.length).toBe(antes)
    } finally {
      variaveis['TETO_CONTA_DIA'] = '100000'
    }
  })
})

describe('o que saiu daqui', () => {
  it('CA-2283: as funções só chamaram o envio em lote do Resend, nunca Contatos, Segmentos ou Broadcasts', () => {
    expect(pedidos.length).toBeGreaterThan(0)
    expect(new Set(pedidos)).toEqual(new Set([`${API_DO_RESEND}/emails/batch`]))
  })

  it('CA-2280 e CA-2279: nenhum e-mail tem imagem; todos têm texto puro, um destinatário e o remetente do subdomínio', () => {
    expect(enviados.length).toBeGreaterThan(10)
    for (const { email } of enviados) {
      expect(email.html).not.toMatch(/<img/i)
      expect(email.text.length).toBeGreaterThan(20)
      expect(email.to).toHaveLength(1)
      expect(email.from.endsWith(`<${REMETENTE}>`)).toBe(true)
    }
  })

  it('DP-LP-13: cada pedido em lote leva a chave de idempotência', () => {
    for (const { idempotencia } of enviados) expect(idempotencia).toMatch(/^(avisos|servico)-[a-z0-9-]+-\d+$/)
  })
})
