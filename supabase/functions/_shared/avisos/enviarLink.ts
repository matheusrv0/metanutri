// A função `enviar-link` (spec lado-do-paciente, D-1215, D-1224, D-1227, D-1230): o que a nutricionista manda pelo
// servidor, logada.
//   - 'enviar': "E-mail" no cartão do link, o S2 (CA-2262); com avisos oferecidos e não aceitos, o bloco do convite
//     (CA-2243), um por mês.
//   - 'convite': "Enviar convite", o S2 com o pedido de aceite, um por mês (D-1227).
//   - 'trocou': depois de "Trocar o endereço", o S4 (CA-2223), só para o e-mail da ficha (D-1248).
//   - 'atualizou': depois de "Atualizar com este plano", agenda (ou cancela) o A1 (CA-2249).
// Até 30 envios de serviço por conta por dia (D-1237, CA-2262). Puro: o banco e o envio chegam de fora.
import {
  avisosOferecidos,
  ehToken,
  ENVIOS_POR_DIA_NA_CONTA,
  enviarServico,
  erro,
  gerarChave,
  inicioDoDiaDeBrasilia,
  LIMITE_DA_CONTA,
  NAO_ENVIOU,
  nomeDoRemetente,
  PEDIDO_INVALIDO,
  primeiroNomeDoLink,
  remetenteDoLink,
  responderPara,
  urlDaPagina,
  urlDeUmClique,
  urlDoLink,
  VALIDADE_DO_CONVITE_MS,
  type DependenciasComuns,
  type ItemDeServico,
} from './comum.ts'
import { mascararEmail } from './email.ts'
import { cabecalhosDeDescadastro, emailEnderecoTrocado, emailPlanoEnviado } from './emails.ts'
import type { DadosDaNutricionista, EmailDoLink, LinkDoBanco, RespostaDaFuncao } from './portas.ts'
import { agendarPlanoAtualizado, diaDeBrasilia } from './regras.ts'
import { TIPOS_DE_AVISO, type TipoDeAviso } from './tipos.ts'

export interface PedidoDeEnvio {
  readonly metodo: string
  /** Quem pede, lido do token da sessão; nulo sem sessão. */
  readonly conta: string | null
  readonly corpo: unknown
}

type Acao = 'enviar' | 'convite' | 'trocou' | 'atualizou'
const ACOES: readonly Acao[] = ['enviar', 'convite', 'trocou', 'atualizou']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** CA-2261: sem e-mail na ficha nem confirmado. */
export const SEM_EMAIL = 'Cadastre o e-mail na ficha.'
/** CA-2265. */
export const EMAIL_DEVOLVIDO = 'O e-mail voltou: o endereço não existe. Confira na ficha.'

const objeto = (valor: unknown): Readonly<Record<string, unknown>> => (typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {})
const quemE = (link: LinkDoBanco): string => primeiroNomeDoLink(link) ?? 'O paciente'
const ddmm = (iso: string): string => {
  const dia = diaDeBrasilia(iso)
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
}

export async function enviarLink(pedido: PedidoDeEnvio, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  if (pedido.metodo !== 'POST') return erro('Use POST.', 405)
  if (pedido.conta === null) return erro('Entre na sua conta para enviar.', 401)
  const corpo = objeto(pedido.corpo)
  const acao = ACOES.find((a) => a === corpo['acao'])
  const id = corpo['link']
  if (acao === undefined || typeof id !== 'string' || !UUID.test(id)) return erro(PEDIDO_INVALIDO, 400)
  const [link] = await deps.banco.linksPorIds([id])
  // O link de outra conta é tratado como inexistente: nada sobre ele sai daqui.
  if (!link || link.nutricionistaId !== pedido.conta || !ehToken(link.token)) return erro('Este link não existe mais.', 404)
  const nutri = await deps.banco.nutricionista(pedido.conta)
  if (nutri === null) return erro('Entre na sua conta para enviar.', 401)
  const linha = await deps.banco.emailDoLink(link.id)

  if (acao === 'atualizou') return agendar(link, linha, corpo['avisar'] === true, deps)
  if (acao === 'trocou') return trocou(link, nutri, linha, pedido.conta, deps)

  // Os motivos de não mandar vêm antes do limite da conta: o pedido que não sai não gasta um dos 30.
  if (!linha?.email || !linha.emailHash) return erro(SEM_EMAIL, 422)
  const suprimido = (await deps.banco.suprimidos([linha.emailHash])).get(linha.emailHash)
  if (suprimido === 'devolvido') return erro(EMAIL_DEVOLVIDO, 422)
  // CA-2254 e CB-1213: quem parou os e-mails do plano (ou marcou como spam) não recebe o S2 nem o S4.
  if (linha.parouTudoEm !== null || suprimido === 'queixa') return erro(`${quemE(link)} pediu para não receber e-mails.`, 409)

  const agora = deps.agora()
  const ativos = new Set((await deps.banco.aceitesDoLink(link.id)).filter((a) => a.saiuEm === null && a.emailHash === linha.emailHash).map((a) => a.tipo))
  const naoAceitos = avisosOferecidos(TIPOS_DE_AVISO, linha.ofertas).filter((t) => !ativos.has(t))
  const conviteRecente = linha.conviteEm !== null && agora.getTime() - Date.parse(linha.conviteEm) < VALIDADE_DO_CONVITE_MS
  if (acao === 'convite') {
    if (naoAceitos.length === 0) return erro(`${quemE(link)} já recebe os avisos oferecidos.`, 409)
    if (conviteRecente && linha.conviteEm !== null) return erro(`Um convite por mês. O último foi em ${ddmm(linha.conviteEm)}.`, 429)
  }

  if (!(await deps.banco.anotarLimite(`conta:${pedido.conta}`, ENVIOS_POR_DIA_NA_CONTA, inicioDoDiaDeBrasilia(agora)))) return erro(LIMITE_DA_CONTA, 429)

  const convidar = acao === 'convite' || (acao === 'enviar' && !conviteRecente && naoAceitos.length > 0)
  const item = await planoEnviado(link, nutri, linha, convidar ? naoAceitos : [], deps)
  const enviado = await enviarServico([item], deps)
  // D-1254 e CA-2299: a conta que chegou ao teto dela ouve a frase do limite da conta.
  if (enviado === 'conta') return erro(LIMITE_DA_CONTA, 429)
  if (enviado === 'fora') return erro(NAO_ENVIOU, 503)
  if (convidar) await deps.banco.marcarConvite(link.id, agora)
  return { status: 200, corpo: { enviadoPara: mascararEmail(linha.email), agendadoPara: null } }
}

/** CA-2249: "Avisar por e-mail" marcado agenda o A1 (30 minutos depois, na janela); desmarcado, cancela. */
async function agendar(link: LinkDoBanco, linha: EmailDoLink | null, avisar: boolean, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  let quando: Date | null = null
  if (avisar && linha?.emailHash && linha.ofertas.plano && linha.parouTudoEm === null) {
    const aceitou = (await deps.banco.aceitesDoLink(link.id)).some((a) => a.saiuEm === null && a.tipo === 'plano' && a.emailHash === linha.emailHash)
    const suprimido = (await deps.banco.suprimidos([linha.emailHash])).has(linha.emailHash)
    if (aceitou && !suprimido) quando = agendarPlanoAtualizado(deps.agora())
  }
  await deps.banco.agendarA1(link.id, quando)
  return { status: 200, corpo: { enviadoPara: null, agendadoPara: quando ? quando.toISOString() : null } }
}

/** S2 (D-1224), com o bloco do convite quando há avisos para oferecer (CA-2243). */
async function planoEnviado(link: LinkDoBanco, nutri: DadosDaNutricionista, linha: EmailDoLink, convite: readonly TipoDeAviso[], deps: DependenciasComuns): Promise<ItemDeServico> {
  const agora = deps.agora()
  const email = linha.email ?? ''
  const emailHash = linha.emailHash ?? ''
  let urlDoConvite: string | null = null
  if (convite.length > 0) {
    const chave = gerarChave(deps.aleatorio)
    await deps.banco.criarChave({
      chave,
      linkId: link.id,
      nutricionistaId: link.nutricionistaId,
      tipo: 'aceite',
      avisos: convite,
      emailHash,
      email: null,
      criadoEm: agora,
      venceEm: new Date(agora.getTime() + VALIDADE_DO_CONVITE_MS).toISOString(),
    })
    urlDoConvite = urlDaPagina(deps.ambiente, chave)
  }
  const sair = (await deps.banco.chaveDeSair(link.id, link.nutricionistaId, 's2', emailHash)) ?? ''
  const montado = emailPlanoEnviado({
    primeiroNome: primeiroNomeDoLink(link),
    remetente: remetenteDoLink(nutri, link),
    url: urlDoLink(deps.ambiente, link.token),
    atualizadoEm: diaDeBrasilia(link.planoEm ?? link.criadoEm),
    convite: urlDoConvite ? { avisos: convite, url: urlDoConvite } : null,
    urlSair: urlDaPagina(deps.ambiente, sair),
  })
  return {
    email: {
      ...montado,
      nomeDoRemetente: nomeDoRemetente(nutri),
      para: email,
      responderPara: responderPara(nutri),
      // D-1235 e CA-2252: o S2 também leva o descadastro de um clique (sai dos e-mails deste plano).
      cabecalhos: cabecalhosDeDescadastro(urlDeUmClique(deps.ambiente, sair)),
      tipo: 'S2',
    },
    envios: [{ linkId: link.id, nutricionistaId: link.nutricionistaId, emailHash, contaNoTeto: true, extra: convite.length > 0 ? { convite } : null }],
  }
}

/**
 * S4 (D-1215, D-1248, CA-2223 e CA-2293): o endereço novo, na hora, só para o e-mail da ficha. O e-mail que entrou pelo
 * link pode ser de quem pegou o link que vazou; o da ficha é o que a nutricionista conferiu com o paciente.
 */
async function trocou(link: LinkDoBanco, nutri: DadosDaNutricionista, linha: EmailDoLink | null, conta: string, deps: DependenciasComuns): Promise<RespostaDaFuncao> {
  const email = linha?.emailFicha ?? null
  if (email === null) return erro(SEM_EMAIL, 422)
  const emailHash = await deps.hash(email)
  const suprimido = (await deps.banco.suprimidos([emailHash])).get(emailHash)
  if (suprimido === 'devolvido') return erro(EMAIL_DEVOLVIDO, 422)
  if (linha?.parouTudoEm || suprimido === 'queixa') return erro(`${quemE(link)} pediu para não receber e-mails.`, 409)
  if (!(await deps.banco.anotarLimite(`conta:${conta}`, ENVIOS_POR_DIA_NA_CONTA, inicioDoDiaDeBrasilia(deps.agora())))) return erro(LIMITE_DA_CONTA, 429)
  const montado = emailEnderecoTrocado({ primeiroNome: primeiroNomeDoLink(link), remetente: remetenteDoLink(nutri, link), url: urlDoLink(deps.ambiente, link.token) })
  const item: ItemDeServico = {
    email: { ...montado, nomeDoRemetente: nomeDoRemetente(nutri), para: email, responderPara: responderPara(nutri), tipo: 'S4' },
    envios: [{ linkId: link.id, nutricionistaId: link.nutricionistaId, emailHash, contaNoTeto: true, extra: null }],
  }
  const enviado = await enviarServico([item], deps)
  if (enviado === 'conta') return erro(LIMITE_DA_CONTA, 429)
  if (enviado === 'fora') return erro(NAO_ENVIOU, 503)
  return { status: 200, corpo: { enviadoPara: mascararEmail(email), agendadoPara: null } }
}
