// A função `meu-link` (spec lado-do-paciente, D-1220, D-1221, D-1226): o que o paciente pede sem conta.
//   - 'recuperar': "Recuperar meu link", com a verificação contra robôs. A resposta é sempre a mesma, no mesmo tempo
//     (CA-2233, CA-2234, D-1249); com cadastro, o S1 leva um link por nutricionista, e sai como "MetaNutri" (D-1225).
//   - 'receber': "Receber meu link por e-mail", de dentro do link (o token é a chave): o S1 na hora e, com avisos
//     marcados, o S3 do aceite (CA-2235, CA-2240); o e-mail digitado só vale no link depois de confirmado (D-1247).
//     Até 3 pedidos por dia por link (CA-2237).
//   - 'ligar': ligar um aviso na folha "Avisos por e-mail" manda o S3 daquele aviso (CA-2256).
// Puro: o banco, o envio, a verificação e o DNS chegam de fora.
import {
  avisosOferecidos,
  CONFIRA_O_EMAIL,
  ehToken,
  enviarServico,
  erro,
  gerarChave,
  hashDoToken,
  inicioDoDiaDeBrasilia,
  itemDoLinkDoPlano,
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
import { emailConfirmeOEmail, emailConfirmeOsAvisos, emailLinkDoPlano, type PlanoDoEmail } from './emails.ts'
import type { DadosDaNutricionista, EmailDoLink, LinkDoBanco, RespostaDaFuncao } from './portas.ts'
import { emBrasilia } from './regras.ts'
import { ehTipoDeAviso, TIPOS_DE_AVISO, type TipoDeAviso } from './tipos.ts'

const HORA_MS = 60 * 60 * 1000

/** D-1249: "Recuperar meu link" responde sempre 3 segundos depois do pedido, com cadastro ou sem. */
export const TEMPO_DA_RECUPERACAO_MS = 3_000

const esperarDeVerdade = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

export interface DependenciasDoMeuLink extends DependenciasComuns {
  /** A espera da resposta da recuperação (D-1249); por padrão, o relógio de verdade. */
  readonly esperar?: (ms: number) => Promise<void>
  /**
   * O trabalho da recuperação que pode passar da resposta (o `EdgeRuntime.waitUntil` das Edge Functions): a função não
   * termina antes dele. Sem isto, o trabalho só corre junto.
   */
  readonly emSegundoPlano?: (trabalho: Promise<unknown>) => void
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
  if (acao === 'recuperar') return recuperarNoTempo(corpo, pedido.ip, deps)
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

interface PedidoDeAceite {
  readonly item: ItemDeServico
  /** A chave criada para este pedido: sai de novo se o e-mail não sair (D-1247). */
  readonly chave: string
}

/**
 * O S3: a chave da página (vale 7 dias e uma vez, CB-1222) e o e-mail. Com `emailNovo`, é o e-mail que o paciente
 * digitou no link: a chave guarda o endereço, e o S3 é o "Confirme o seu e-mail" (D-1247), que vale sem aviso marcado.
 * A chave guarda também o resumo do endereço do link aberto no começo do pedido (D-1256); nulo: o banco a recusou,
 * porque a troca do endereço aconteceu no meio do pedido.
 */
async function pedidoDeAceite(
  link: LinkDoBanco,
  nutri: DadosDaNutricionista,
  email: string,
  emailHash: string,
  avisos: readonly TipoDeAviso[],
  emailNovo: boolean,
  deps: DependenciasComuns,
): Promise<PedidoDeAceite | null> {
  const agora = deps.agora()
  const chave = gerarChave(deps.aleatorio)
  const gravou = await deps.banco.criarChave({
    chave,
    linkId: link.id,
    nutricionistaId: link.nutricionistaId,
    tipo: 'aceite',
    avisos,
    emailHash,
    email: emailNovo ? email : null,
    tokenHash: await hashDoToken(link.token),
    criadoEm: agora,
    venceEm: new Date(agora.getTime() + VALIDADE_DO_ACEITE_MS).toISOString(),
  })
  if (!gravou) return null
  const dados = {
    primeiroNome: primeiroNomeDoLink(link),
    remetente: remetenteDoLink(nutri, link),
    avisos,
    diaDaSemana: emBrasilia(agora).diaDaSemana,
    urlConfirmar: urlDaPagina(deps.ambiente, chave),
  }
  const montado = emailNovo ? emailConfirmeOEmail(dados) : emailConfirmeOsAvisos(dados)
  return {
    chave,
    item: {
      email: { ...montado, nomeDoRemetente: nomeDoRemetente(nutri), para: email, responderPara: responderPara(nutri), tipo: 'S3' },
      envios: [{ linkId: link.id, nutricionistaId: link.nutricionistaId, emailHash, contaNoTeto: true, extra: { avisos } }],
    },
  }
}

const chaveDoLimite = (link: LinkDoBanco): string => `link:${link.id}`

/**
 * Manda o pedido do paciente. O que não sai (o Resend fora, o teto) não muda nada (D-1247, CA-2292): a chave criada
 * sai, e o pedido não conta nos 3 do dia.
 */
async function mandarPedido(link: LinkDoBanco, itens: readonly ItemDeServico[], chaves: readonly string[], deps: DependenciasComuns): Promise<boolean> {
  if ((await enviarServico(itens, deps)) === 'enviado') return true
  for (const chave of chaves) await deps.banco.apagarChave(chave)
  await deps.banco.devolverLimite(chaveDoLimite(link))
  return false
}

/** D-1247: o e-mail do link que vale para mandar e recuperar: o da ficha, ou o que o paciente já confirmou. */
const emailQueVale = (linha: EmailDoLink): boolean => linha.origem === 'ficha' || Boolean(linha.confirmadoEm)

/**
 * D-1249 e CA-2294: a resposta não espera o trabalho. Ela sai sempre `TEMPO_DA_RECUPERACAO_MS` depois do pedido, com
 * cadastro ou sem, mesmo com o Resend lento; o trabalho corre junto e, se passar disso, termina depois (em segundo
 * plano). O trabalho nunca rejeita: a falha vira registro.
 */
async function recuperarNoTempo(corpo: Readonly<Record<string, unknown>>, ip: string | null, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  const trabalho = recuperar(corpo, ip, deps).catch(() => deps.log('A recuperação falhou no meio.'))
  deps.emSegundoPlano?.(trabalho)
  await (deps.esperar ?? esperarDeVerdade)(TEMPO_DA_RECUPERACAO_MS)
  return RESPOSTA_IGUAL
}

/**
 * D-1220, CA-2233 e CA-2234. Nada aqui muda a resposta: e-mail sem cadastro, verificação que não confere, pedido demais
 * na hora (por e-mail ou por endereço de internet), endereço devolvido ou Resend fora, tudo responde `{ ok: true }`.
 */
async function recuperar(corpo: Readonly<Record<string, unknown>>, ip: string | null, deps: DependenciasDoMeuLink): Promise<void> {
  const email = typeof corpo['email'] === 'string' ? normalizarEmail(corpo['email']) : ''
  if (!emailValido(email)) return
  const token = typeof corpo['turnstile'] === 'string' ? corpo['turnstile'] : null
  if (!(await deps.turnstile(token, ip))) {
    deps.log('Recuperação sem a verificação contra robôs.')
    return
  }
  const agora = deps.agora()
  const desde = new Date(agora.getTime() - HORA_MS)
  const emailHash = await deps.hash(email)
  // As duas contas andam juntas: o pedido barrado por uma não passa pela outra.
  const cabeNoEmail = await deps.banco.anotarLimite(`rec-email:${emailHash}`, RECUPERACOES_POR_HORA, desde)
  const cabeNoIp = ip === null ? true : await deps.banco.anotarLimite(`rec-ip:${await deps.hash(`ip:${ip}`)}`, RECUPERACOES_POR_HORA, desde)
  if (!cabeNoEmail || !cabeNoIp) return

  // D-1247: só o e-mail da ficha ou o confirmado pelo paciente recupera o link.
  const linhas = (await deps.banco.emailsPorHash(emailHash)).filter((l) => l.email === email && emailQueVale(l))
  if (linhas.length === 0) return
  if ((await deps.banco.suprimidos([emailHash])).get(emailHash) === 'devolvido') return
  const links = (await deps.banco.linksPorIds(linhas.map((l) => l.linkId))).filter((l) => l.substituidoPor === null)
  if (links.length === 0) return

  const nutris = new Map<string, DadosDaNutricionista>()
  for (const link of links) {
    if (nutris.has(link.nutricionistaId)) continue
    const nutri = await deps.banco.nutricionista(link.nutricionistaId)
    if (nutri) nutris.set(link.nutricionistaId, nutri)
  }
  const comNutri = links.filter((l) => nutris.has(l.nutricionistaId))
  if (comNutri.length === 0) return
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
  if ((await enviarServico([item], deps)) !== 'enviado') deps.log('A recuperação não saiu agora.')
}

/** Os avisos pedidos no corpo, só os conhecidos. */
const avisosDoCorpo = (valor: unknown): readonly TipoDeAviso[] => (Array.isArray(valor) ? TIPOS_DE_AVISO.filter((t) => valor.includes(t)) : [])

/**
 * D-1221, D-1247, D-1258, CA-2235 a CA-2237, CA-2240, CA-2291, CA-2292 e CA-2303. O e-mail que o link já tem e vale
 * (mascarado na tela) recebe o S1 na hora e, com avisos marcados, o S3 do aceite. O e-mail digitado recebe só o S3
 * "Confirme o seu e-mail", sempre, mesmo igual ao do link (a resposta não revela se ele acertou o da ficha); o link do
 * plano vai para ele no "Confirmar" (avisosResposta.ts), e o link continua com o e-mail de antes até lá.
 */
async function receber(corpo: Readonly<Record<string, unknown>>, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  const aberto = await abrir(corpo['token'], deps)
  if (aberto === null) return erro(LINK_QUE_NAO_ABRE, 404)
  const { link, nutri } = aberto
  const linha = await deps.banco.emailDoLink(link.id)
  const ofertas = linha?.ofertas ?? ofertasPadrao(nutri.oferecerAosNovos)
  const marcados = avisosOferecidos(avisosDoCorpo(corpo['avisos']), ofertas)

  const usarDoLink = corpo['usarDaFicha'] === true
  let email: string
  if (usarDoLink) {
    // O e-mail que o link já tem (o da ficha ou um confirmado, mascarado na tela).
    if (!linha?.email || !emailQueVale(linha)) return erro(CONFIRA_O_EMAIL, 422)
    email = linha.email
  } else {
    email = typeof corpo['email'] === 'string' ? normalizarEmail(corpo['email']) : ''
  }
  const dominio = usarDoLink ? null : dominioDoEmail(email)
  if (!usarDoLink && dominio === null) return erro(CONFIRA_O_EMAIL, 422)
  // D-1256 e CA-2301: o pedido conta nos 3 do dia antes de qualquer consulta de fora, que pode demorar o quanto o dono
  // do domínio quiser; o recusado por ela continua contando (só o que não sai volta, em `mandarPedido`).
  if (!(await deps.banco.anotarLimite(chaveDoLimite(link), PEDIDOS_POR_DIA_NO_LINK, inicioDoDiaDeBrasilia(deps.agora())))) return erro(PEDIDOS_DEMAIS_NO_DIA, 429)
  // CA-2236: domínio sem servidor de e-mail é recusado na hora; a consulta que falha não recusa.
  if (dominio !== null && (await deps.temServidorDeEmail(dominio)) === false) return erro(CONFIRA_O_EMAIL, 422)
  const emailHash = await deps.hash(email)
  if ((await deps.banco.suprimidos([emailHash])).get(emailHash) === 'devolvido') return erro(CONFIRA_O_EMAIL, 422)

  const ativos = new Set((await deps.banco.aceitesDoLink(link.id)).filter((a) => a.saiuEm === null && a.emailHash === emailHash).map((a) => a.tipo))
  const pedir = marcados.filter((t) => !ativos.has(t))
  // D-1258: o link do plano só vai para o e-mail que já vale; o digitado o recebe no "Confirmar".
  const itens: ItemDeServico[] = usarDoLink ? [itemDoLinkDoPlano(link, nutri, email, emailHash, deps)] : []
  const chaves: string[] = []
  if (!usarDoLink || pedir.length > 0) {
    const aceite = await pedidoDeAceite(link, nutri, email, emailHash, pedir, !usarDoLink, deps)
    // D-1256 e CA-2300: o endereço foi trocado no meio do pedido; nada sai.
    if (aceite === null) return erro(LINK_QUE_NAO_ABRE, 404)
    itens.push(aceite.item)
    chaves.push(aceite.chave)
  }
  if (!(await mandarPedido(link, itens, chaves, deps))) return erro(NAO_ENVIOU, 503)
  return { status: 200, corpo: { enviadoPara: mascararEmail(email), confirmar: chaves.length > 0, confirmarEmail: !usarDoLink } }
}

/** CA-2256: ligar um aviso manda o S3 dele para o e-mail do link. */
async function ligar(corpo: Readonly<Record<string, unknown>>, deps: DependenciasDoMeuLink): Promise<RespostaDaFuncao> {
  const tipo = corpo['tipo']
  if (!ehTipoDeAviso(tipo)) return erro(PEDIDO_INVALIDO, 400)
  const aberto = await abrir(corpo['token'], deps)
  if (aberto === null) return erro(LINK_QUE_NAO_ABRE, 404)
  const { link, nutri } = aberto
  const linha = await deps.banco.emailDoLink(link.id)
  if (!linha?.email || !linha.emailHash || !emailQueVale(linha)) return erro(CONFIRA_O_EMAIL, 422)
  // CA-2242: o aviso que a nutricionista não oferece não liga.
  if (!linha.ofertas[tipo]) return erro('Este aviso não está disponível.', 409)
  if ((await deps.banco.suprimidos([linha.emailHash])).get(linha.emailHash) === 'devolvido') return erro(CONFIRA_O_EMAIL, 422)
  const ativo = (await deps.banco.aceitesDoLink(link.id)).some((a) => a.saiuEm === null && a.emailHash === linha.emailHash && a.tipo === tipo)
  if (ativo) return { status: 200, corpo: { enviadoPara: mascararEmail(linha.email), confirmar: false, confirmarEmail: false } }
  if (!(await deps.banco.anotarLimite(chaveDoLimite(link), PEDIDOS_POR_DIA_NO_LINK, inicioDoDiaDeBrasilia(deps.agora())))) return erro(PEDIDOS_DEMAIS_NO_DIA, 429)
  const aceite = await pedidoDeAceite(link, nutri, linha.email, linha.emailHash, [tipo], false, deps)
  if (aceite === null) return erro(LINK_QUE_NAO_ABRE, 404)
  if (!(await mandarPedido(link, [aceite.item], [aceite.chave], deps))) return erro(NAO_ENVIOU, 503)
  return { status: 200, corpo: { enviadoPara: mascararEmail(linha.email), confirmar: true, confirmarEmail: false } }
}
