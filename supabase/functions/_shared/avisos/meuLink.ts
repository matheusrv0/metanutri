// A função `meu-link` (spec lado-do-paciente, D-1220, D-1221, D-1226): o que o paciente pede sem conta.
//   - 'recuperar': "Recuperar meu link", com a verificação contra robôs. A resposta é sempre a mesma (CA-2233, CA-2234);
//     com cadastro, o S1 leva um link por nutricionista, e sai como "MetaNutri" (D-1225).
//   - 'receber': "Receber meu link por e-mail", de dentro do link (o token é a chave): o S1 na hora e, com avisos
//     marcados, o S3 do aceite (CA-2235, CA-2240). Até 3 pedidos por dia por link (CA-2237).
//   - 'ligar': ligar um aviso na folha "Avisos por e-mail" manda o S3 daquele aviso (CA-2256).
// Puro: o banco, o envio, a verificação e o DNS chegam de fora.
import {
  avisosOferecidos,
  CONFIRA_O_EMAIL,
  ehToken,
  enviarServico,
  erro,
  gerarChave,
  inicioDoDiaDeBrasilia,
  LINK_QUE_NAO_ABRE,
  NAO_ENVIOU,
  nomeDoRemetente,
  ofertasPadrao,
  PEDIDO_INVALIDO,
  PEDIDOS_DEMAIS_NO_DIA,
  PEDIDOS_POR_DIA_NO_LINK,
  primeiroNomeDoLink,
  RECUPERACOES_POR_HORA,
  remetenteDoLink,
  responderPara,
  urlDaPagina,
  urlDoLink,
  VALIDADE_DO_ACEITE_MS,
  type DependenciasComuns,
  type ItemDeServico,
} from './comum.ts'
import { dominioDoEmail, emailValido, mascararEmail, normalizarEmail } from './email.ts'
import { emailConfirmeOsAvisos, emailLinkDoPlano, type PlanoDoEmail } from './emails.ts'
import type { DadosDaNutricionista, LinkDoBanco, RespostaDaFuncao } from './portas.ts'
import { emBrasilia } from './regras.ts'
import { ehTipoDeAviso, TIPOS_DE_AVISO, type TipoDeAviso } from './tipos.ts'

const HORA_MS = 60 * 60 * 1000

export interface DependenciasDoMeuLink extends DependenciasComuns {
  /** DP-LP-19: o token do Turnstile confere, com a ação `recuperar-link`. */
  readonly turnstile: (token: string | null, ip: string | null) => Promise<boolean>
  /** DP-LP-17: o domínio recebe e-mail (nulo: não deu para saber, e não recusa). */
  readonly temServidorDeEmail: (dominio: string) => Promise<boolean | null>
}

export interface PedidoDoMeuLink {
  readonly metodo: string
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
  /** O endereço de internet de quem pede (para o limite da recuperação), quando a plataforma diz. */
  readonly ip: string | null
}

const objeto = (valor: unknown): Readonly<Record<string, unknown>> => (typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {})

/** CA-2233: a resposta de sempre da recuperação. */
const RESPOSTA_IGUAL: RespostaDaFuncao = { status: 200, corpo: { ok: true } }

export async function meuLink(pedido: PedidoDoMeuLink, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  if (pedido.metodo !== 'POST') return erro('Use POST.', 405)
  const corpo = objeto(pedido.corpo)
  const acao = corpo['acao']
  if (acao === 'recuperar') return recuperar(corpo, pedido.ip, deps)
  if (acao === 'receber') return receber(corpo, deps)
  if (acao === 'ligar') return ligar(corpo, deps)
  return erro(PEDIDO_INVALIDO, 400)
}

/** O link e a nutricionista dele, pelo token; o token antigo abre o fixo (DP-LP-5). */
async function abrir(token: unknown, deps: DependenciasComuns): Promise<{ readonly link: LinkDoBanco; readonly nutri: DadosDaNutricionista } | null> {
  if (!ehToken(token)) return null
  const link = await deps.banco.linkPorToken(token)
  if (link === null) return null
  const nutri = await deps.banco.nutricionista(link.nutricionistaId)
  return nutri === null ? null : { link, nutri }
}

/** O S3 do aceite: a chave da página (vale 7 dias e uma vez, CB-1222) e o e-mail. */
async function pedidoDeAceite(link: LinkDoBanco, nutri: DadosDaNutricionista, email: string, emailHash: string, avisos: readonly TipoDeAviso[], deps: DependenciasComuns): Promise<ItemDeServico> {
  const agora = deps.agora()
  const chave = gerarChave(deps.aleatorio)
  await deps.banco.criarChave({
    chave,
    linkId: link.id,
    nutricionistaId: link.nutricionistaId,
    tipo: 'aceite',
    avisos,
    emailHash,
    criadoEm: agora,
    venceEm: new Date(agora.getTime() + VALIDADE_DO_ACEITE_MS).toISOString(),
  })
  const montado = emailConfirmeOsAvisos({
    primeiroNome: primeiroNomeDoLink(link),
    remetente: remetenteDoLink(nutri, link),
    avisos,
    diaDaSemana: emBrasilia(agora).diaDaSemana,
    urlConfirmar: urlDaPagina(deps.ambiente, chave),
  })
  return {
    email: { ...montado, nomeDoRemetente: nomeDoRemetente(nutri), para: email, responderPara: responderPara(nutri), tipo: 'S3' },
    envios: [{ linkId: link.id, nutricionistaId: link.nutricionistaId, emailHash, contaNoTeto: true, extra: { avisos } }],
  }
}

/** O S1 de um link só (D-1221). */
function linkDoPlano(link: LinkDoBanco, nutri: DadosDaNutricionista, email: string, emailHash: string, deps: DependenciasComuns): ItemDeServico {
  const montado = emailLinkDoPlano({ primeiroNome: primeiroNomeDoLink(link), planos: [{ remetente: remetenteDoLink(nutri, link), url: urlDoLink(deps.ambiente, link.token) }] })
  return {
    email: { ...montado, nomeDoRemetente: nomeDoRemetente(nutri), para: email, responderPara: responderPara(nutri), tipo: 'S1' },
    envios: [{ linkId: link.id, nutricionistaId: link.nutricionistaId, emailHash, contaNoTeto: true, extra: null }],
  }
}

/**
 * D-1220, CA-2233 e CA-2234. Nada aqui muda a resposta: e-mail sem cadastro, verificação que não confere, pedido demais
 * na hora (por e-mail ou por endereço de internet), endereço devolvido ou Resend fora, tudo responde `{ ok: true }`.
 */
async function recuperar(corpo: Readonly<Record<string, unknown>>, ip: string | null, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  const email = typeof corpo['email'] === 'string' ? normalizarEmail(corpo['email']) : ''
  if (!emailValido(email)) return RESPOSTA_IGUAL
  const token = typeof corpo['turnstile'] === 'string' ? corpo['turnstile'] : null
  if (!(await deps.turnstile(token, ip))) {
    deps.log('Recuperação sem a verificação contra robôs.')
    return RESPOSTA_IGUAL
  }
  const agora = deps.agora()
  const desde = new Date(agora.getTime() - HORA_MS)
  const emailHash = await deps.hash(email)
  // As duas contas andam juntas: o pedido barrado por uma não passa pela outra.
  const cabeNoEmail = await deps.banco.anotarLimite(`rec-email:${emailHash}`, RECUPERACOES_POR_HORA, desde)
  const cabeNoIp = ip === null ? true : await deps.banco.anotarLimite(`rec-ip:${await deps.hash(`ip:${ip}`)}`, RECUPERACOES_POR_HORA, desde)
  if (!cabeNoEmail || !cabeNoIp) return RESPOSTA_IGUAL

  const linhas = (await deps.banco.emailsPorHash(emailHash)).filter((l) => l.email === email)
  if (linhas.length === 0) return RESPOSTA_IGUAL
  if ((await deps.banco.suprimidos([emailHash])).get(emailHash) === 'devolvido') return RESPOSTA_IGUAL
  const links = (await deps.banco.linksPorIds(linhas.map((l) => l.linkId))).filter((l) => l.substituidoPor === null)
  if (links.length === 0) return RESPOSTA_IGUAL

  const nutris = new Map<string, DadosDaNutricionista>()
  for (const link of links) {
    if (nutris.has(link.nutricionistaId)) continue
    const nutri = await deps.banco.nutricionista(link.nutricionistaId)
    if (nutri) nutris.set(link.nutricionistaId, nutri)
  }
  const comNutri = links.filter((l) => nutris.has(l.nutricionistaId))
  if (comNutri.length === 0) return RESPOSTA_IGUAL
  // CB-1210: o casal com um e-mail na mesma conta: a linha leva o primeiro nome de cada um.
  const contas = comNutri.map((l) => l.nutricionistaId)
  const planos: PlanoDoEmail[] = comNutri.map((link) => {
    const nutri = nutris.get(link.nutricionistaId) as DadosDaNutricionista
    const repetida = contas.filter((c) => c === link.nutricionistaId).length > 1
    return { remetente: remetenteDoLink(nutri, link), url: urlDoLink(deps.ambiente, link.token), paciente: repetida ? primeiroNomeDoLink(link) : null }
  })
  const [primeiro] = comNutri
  const montado = emailLinkDoPlano({ primeiroNome: primeiro ? primeiroNomeDoLink(primeiro) : null, planos })
  const item: ItemDeServico = {
    // D-1225: a recuperação pode juntar várias nutricionistas: sai como "MetaNutri", sem resposta para uma delas.
    email: { ...montado, nomeDoRemetente: 'MetaNutri', para: email, responderPara: null, tipo: 'S1' },
    envios: comNutri.map((link, i) => ({ linkId: link.id, nutricionistaId: link.nutricionistaId, emailHash, contaNoTeto: i === 0, extra: { recuperacao: true } })),
  }
  if ((await enviarServico([item], deps)) === 'fora') deps.log('A recuperação não saiu agora.')
  return RESPOSTA_IGUAL
}

/** Os avisos pedidos no corpo, só os conhecidos. */
const avisosDoCorpo = (valor: unknown): readonly TipoDeAviso[] => (Array.isArray(valor) ? TIPOS_DE_AVISO.filter((t) => valor.includes(t)) : [])

/** D-1221, CA-2235 a CA-2237 e CA-2240. */
async function receber(corpo: Readonly<Record<string, unknown>>, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  const aberto = await abrir(corpo['token'], deps)
  if (aberto === null) return erro(LINK_QUE_NAO_ABRE, 404)
  const { link, nutri } = aberto
  const linha = await deps.banco.emailDoLink(link.id)

  let email: string
  if (corpo['usarDaFicha'] === true) {
    // "Usar este": o e-mail que o link já tem (o da ficha, mascarado na tela).
    if (!linha?.email) return erro(CONFIRA_O_EMAIL, 422)
    email = linha.email
  } else {
    email = typeof corpo['email'] === 'string' ? normalizarEmail(corpo['email']) : ''
    const dominio = dominioDoEmail(email)
    // CA-2236: domínio sem servidor de e-mail é recusado na hora; a consulta que falha não recusa.
    if (dominio === null || (await deps.temServidorDeEmail(dominio)) === false) return erro(CONFIRA_O_EMAIL, 422)
  }
  const emailHash = await deps.hash(email)
  if ((await deps.banco.suprimidos([emailHash])).get(emailHash) === 'devolvido') return erro(CONFIRA_O_EMAIL, 422)
  if (!(await deps.banco.anotarLimite(`link:${link.id}`, PEDIDOS_POR_DIA_NO_LINK, inicioDoDiaDeBrasilia(deps.agora())))) return erro(PEDIDOS_DEMAIS_NO_DIA, 429)

  // CA-2257: o endereço novo vale para o link, e os avisos esperam ele confirmar.
  if (linha?.email !== email) await deps.banco.gravarEmailDoPaciente(link, email, emailHash, nutri.oferecerAosNovos)
  const ofertas = linha?.ofertas ?? ofertasPadrao(nutri.oferecerAosNovos)
  const ativos = new Set((await deps.banco.aceitesDoLink(link.id)).filter((a) => a.saiuEm === null && a.emailHash === emailHash).map((a) => a.tipo))
  const pedir = avisosOferecidos(avisosDoCorpo(corpo['avisos']), ofertas).filter((t) => !ativos.has(t))

  const itens: ItemDeServico[] = [linkDoPlano(link, nutri, email, emailHash, deps)]
  if (pedir.length > 0) itens.push(await pedidoDeAceite(link, nutri, email, emailHash, pedir, deps))
  if ((await enviarServico(itens, deps)) === 'fora') return erro(NAO_ENVIOU, 503)
  return { status: 200, corpo: { enviadoPara: mascararEmail(email), confirmar: pedir.length > 0 } }
}

/** CA-2256: ligar um aviso manda o S3 dele para o e-mail do link. */
async function ligar(corpo: Readonly<Record<string, unknown>>, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  const tipo = corpo['tipo']
  if (!ehTipoDeAviso(tipo)) return erro(PEDIDO_INVALIDO, 400)
  const aberto = await abrir(corpo['token'], deps)
  if (aberto === null) return erro(LINK_QUE_NAO_ABRE, 404)
  const { link, nutri } = aberto
  const linha = await deps.banco.emailDoLink(link.id)
  if (!linha?.email || !linha.emailHash) return erro(CONFIRA_O_EMAIL, 422)
  // CA-2242: o aviso que a nutricionista não oferece não liga.
  if (!linha.ofertas[tipo]) return erro('Este aviso não está disponível.', 409)
  if ((await deps.banco.suprimidos([linha.emailHash])).get(linha.emailHash) === 'devolvido') return erro(CONFIRA_O_EMAIL, 422)
  const ativo = (await deps.banco.aceitesDoLink(link.id)).some((a) => a.saiuEm === null && a.emailHash === linha.emailHash && a.tipo === tipo)
  if (ativo) return { status: 200, corpo: { enviadoPara: mascararEmail(linha.email), confirmar: false } }
  if (!(await deps.banco.anotarLimite(`link:${link.id}`, PEDIDOS_POR_DIA_NO_LINK, inicioDoDiaDeBrasilia(deps.agora())))) return erro(PEDIDOS_DEMAIS_NO_DIA, 429)
  const item = await pedidoDeAceite(link, nutri, linha.email, linha.emailHash, [tipo], deps)
  if ((await enviarServico([item], deps)) === 'fora') return erro(NAO_ENVIOU, 503)
  return { status: 200, corpo: { enviadoPara: mascararEmail(linha.email), confirmar: true } }
}
