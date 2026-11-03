// As chamadas do app aos e-mails do link (spec lado-do-paciente, seção 3 do PLAN): às funções do servidor (`meu-link`,
// `avisos-resposta`, `enviar-link`) e às funções do banco (supabase/017). Cada uma devolve `{ ok: true, … }` ou
// `{ ok: false, erro }`, com a frase que a tela mostra; nenhuma lança. O cliente chega de fora (o supabase-js, ou um
// falso nos testes), como em `fonteSupabase.ts`.
import { TIPOS_DE_AVISO, ehTipoDeAviso, type TipoDeAviso, type TipoDeEmail } from '../../supabase/functions/_shared/avisos/tipos.ts'

/** CB-1216: o Resend (ou a função) não respondeu. */
export const NAO_ENVIOU = 'Não foi possível enviar agora. Tente de novo em alguns minutos.'
/** A ficha sem o 017 ou sem internet: os cartões de e-mail dizem isto (DP-LP-30). */
export const EMAILS_INDISPONIVEIS = 'Indisponível no momento.'
/** CA-2233: a resposta de "Recuperar meu link", com cadastro ou sem. */
export const RESPOSTA_DA_RECUPERACAO = 'Se este e-mail estiver cadastrado por uma nutricionista, o link chega em instantes.'
/** CA-2236. */
export const CONFIRA_O_EMAIL = 'Confira o e-mail.'
/** CA-2237. */
export const PEDIDOS_DEMAIS_NO_DIA = 'Você já pediu 3 vezes hoje. Tente amanhã.'
/** CA-2255 e seção 6 da SPEC. */
export const CHAVE_QUE_NAO_VALE = 'Este endereço não vale. Abra o botão do e-mail mais recente.'

interface ErroDoBanco {
  readonly message: string
  readonly code?: string
}

/** O pedaço do supabase-js que os e-mails usam. */
export interface ClienteDosEmails {
  rpc(nome: string, parametros?: Record<string, unknown>): PromiseLike<{ readonly data: unknown; readonly error: ErroDoBanco | null }>
  from(tabela: string): {
    select(colunas: string): { eq(coluna: string, valor: string): { maybeSingle(): PromiseLike<{ readonly data: unknown; readonly error: ErroDoBanco | null }> } }
    upsert(linha: Record<string, unknown>, opcoes?: { onConflict?: string }): PromiseLike<{ readonly error: ErroDoBanco | null }>
  }
  readonly functions: {
    invoke(nome: string, opcoes: { readonly body: Record<string, unknown> }): Promise<{ readonly data: unknown; readonly error: unknown }>
  }
}

export type Resultado<T extends object = object> = ({ readonly ok: true } & T) | { readonly ok: false; readonly erro: string; readonly status?: number }

const objeto = (valor: unknown): Record<string, unknown> => (typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {})
const textoOuNulo = (valor: unknown): string | null => (typeof valor === 'string' && valor !== '' ? valor : null)
const tipos = (valor: unknown): readonly TipoDeAviso[] => (Array.isArray(valor) ? TIPOS_DE_AVISO.filter((tipo) => valor.includes(tipo)) : [])

/** A resposta de erro da função: o supabase-js guarda a `Response` em `context` (como em `usarAssinatura.ts`). */
async function lerFalha(erro: unknown): Promise<{ readonly status: number | null; readonly frase: string | null }> {
  const contexto = objeto(erro)['context']
  if (typeof contexto !== 'object' || contexto === null || typeof (contexto as { status?: unknown }).status !== 'number') return { status: null, frase: null }
  const resposta = contexto as { readonly status: number; json(): Promise<unknown> }
  try {
    const frase = objeto(await resposta.json())['erro']
    return { status: resposta.status, frase: typeof frase === 'string' ? frase : null }
  } catch {
    return { status: resposta.status, frase: null }
  }
}

/** Chama uma Edge Function. Sem resposta, ou com resposta sem frase, vale `NAO_ENVIOU` (CB-1216). */
async function chamarFuncao(cliente: ClienteDosEmails | null, nome: string, corpo: Record<string, unknown>): Promise<Resultado<{ readonly dados: Record<string, unknown> }>> {
  if (cliente === null) return { ok: false, erro: NAO_ENVIOU }
  try {
    const { data, error } = await cliente.functions.invoke(nome, { body: corpo })
    if (error) {
      const falha = await lerFalha(error)
      return falha.status === null ? { ok: false, erro: NAO_ENVIOU } : { ok: false, erro: falha.frase ?? NAO_ENVIOU, status: falha.status }
    }
    return { ok: true, dados: objeto(data) }
  } catch {
    return { ok: false, erro: NAO_ENVIOU }
  }
}

async function chamarBanco(cliente: ClienteDosEmails | null, nome: string, parametros: Record<string, unknown>): Promise<Resultado<{ readonly dados: unknown }>> {
  if (cliente === null) return { ok: false, erro: EMAILS_INDISPONIVEIS }
  try {
    const { data, error } = await cliente.rpc(nome, parametros)
    return error ? { ok: false, erro: EMAILS_INDISPONIVEIS } : { ok: true, dados: data }
  } catch {
    return { ok: false, erro: EMAILS_INDISPONIVEIS }
  }
}

// ---------- O paciente, no link ----------

export type ResultadoDoEnvio = Resultado<{ readonly enviadoPara: string; readonly confirmar: boolean }>

const doEnvio = (r: Resultado<{ readonly dados: Record<string, unknown> }>): ResultadoDoEnvio =>
  r.ok ? { ok: true, enviadoPara: textoOuNulo(r.dados['enviadoPara']) ?? '', confirmar: r.dados['confirmar'] === true } : r

/**
 * D-1221 e CA-2235: "Receber meu link por e-mail". `email` nulo usa o e-mail que o link já tem (o da ficha, mascarado na
 * tela, "Usar este"). Com avisos marcados, sai também o S3 (CA-2240).
 */
export async function receberLinkPorEmail(
  cliente: ClienteDosEmails | null,
  pedido: { readonly token: string; readonly email: string | null; readonly avisos: readonly TipoDeAviso[] },
): Promise<ResultadoDoEnvio> {
  const quem = pedido.email === null ? { usarDaFicha: true } : { email: pedido.email }
  return doEnvio(await chamarFuncao(cliente, 'meu-link', { acao: 'receber', token: pedido.token, ...quem, avisos: [...pedido.avisos] }))
}

/** CA-2256: ligar um aviso no link manda o S3 daquele aviso. */
export async function ligarAviso(cliente: ClienteDosEmails | null, token: string, tipo: TipoDeAviso): Promise<ResultadoDoEnvio> {
  return doEnvio(await chamarFuncao(cliente, 'meu-link', { acao: 'ligar', token, tipo }))
}

/** CA-2256: desligar vale na hora, pela função do banco. */
export async function desligarAviso(cliente: ClienteDosEmails | null, token: string, tipo: TipoDeAviso): Promise<Resultado> {
  const r = await chamarBanco(cliente, 'desligar_aviso', { p_token: token, p_tipo: tipo })
  return r.ok ? { ok: true } : { ok: false, erro: NAO_ENVIOU }
}

/**
 * D-1220 e CA-2233: "Recuperar meu link". A resposta é sempre a mesma, com cadastro ou sem; só a falha da rede (o pedido
 * nem chegou) diz que não deu, o que não revela nada.
 */
export async function recuperarLink(cliente: ClienteDosEmails | null, email: string, turnstile: string | null): Promise<Resultado> {
  const r = await chamarFuncao(cliente, 'meu-link', { acao: 'recuperar', email, turnstile })
  return r.ok || r.status !== undefined ? { ok: true } : { ok: false, erro: NAO_ENVIOU }
}

/** CA-2239: o link registra o dia em que foi aberto; sem resposta, fica para a próxima abertura (CB-1205). */
export async function registrarAcesso(cliente: ClienteDosEmails | null, token: string): Promise<boolean> {
  return (await chamarBanco(cliente, 'registrar_acesso', { p_token: token })).ok
}

// ---------- As páginas do aceite e do descadastro (`/avisos/<chave>`) ----------

export type AcaoDaPagina = 'ler' | 'confirmar' | 'sair' | 'parar-todos' | 'desfazer'

/** O que a página mostra (seção 6 da SPEC). */
export interface PaginaDoAviso {
  readonly tipo: 'aceite' | 'sair'
  /** "Ana Lima"; o N1 é do MetaNutri. */
  readonly nutricionista: string
  /** Aceite: os avisos que a nutricionista oferece, na ordem da página. */
  readonly avisos: readonly TipoDeAviso[]
  /** Aceite: os que o paciente escolheu (vêm marcados); depois de confirmar, os que ele recebe. */
  readonly escolhidos: readonly TipoDeAviso[]
  /** Descadastro: o que a chave tira ('plano', 'semana', 'lembrete', 's2' ou 'n1'). */
  readonly aviso: string | null
  /** A ação já foi feita com esta chave (a página mostra o "Pronto."). */
  readonly feito: boolean
}

export async function responderAviso(
  cliente: ClienteDosEmails | null,
  pedido: { readonly acao: AcaoDaPagina; readonly chave: string; readonly avisos?: readonly TipoDeAviso[] },
): Promise<Resultado<{ readonly pagina: PaginaDoAviso }>> {
  const r = await chamarFuncao(cliente, 'avisos-resposta', { acao: pedido.acao, chave: pedido.chave, ...(pedido.avisos ? { avisos: [...pedido.avisos] } : {}) })
  if (!r.ok) return r.status === 404 ? { ok: false, erro: CHAVE_QUE_NAO_VALE, status: 404 } : r
  const d = r.dados
  return {
    ok: true,
    pagina: {
      tipo: d['tipo'] === 'aceite' ? 'aceite' : 'sair',
      nutricionista: textoOuNulo(d['nutricionista']) ?? 'MetaNutri',
      avisos: tipos(d['avisos']),
      escolhidos: tipos(d['escolhidos']),
      aviso: textoOuNulo(d['aviso']),
      feito: d['feito'] === true,
    },
  }
}

// ---------- A nutricionista: a ficha ----------

export type EstadoDoEnvio = 'enviado' | 'entregue' | 'devolvido' | 'devolucao-temporaria' | 'queixa' | 'adiado' | 'pausado' | 'falhou'

const ESTADOS_DO_ENVIO: readonly EstadoDoEnvio[] = ['enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa', 'adiado', 'pausado', 'falhou']
const TIPOS_DE_EMAIL: readonly TipoDeEmail[] = ['S1', 'S2', 'S3', 'S4', 'A1', 'A2', 'A3', 'A4', 'N1']

export interface EnvioDoLink {
  readonly criadoEm: string
  readonly tipo: TipoDeEmail
  readonly assunto: string
  readonly estado: EstadoDoEnvio
}

export interface AceiteDoLink {
  readonly tipo: TipoDeAviso
  readonly aceitoEm: string
  readonly saiuEm: string | null
  readonly pausadoEm: string | null
}

/** O que a ficha sabe dos e-mails de um link (`emails_do_link`, supabase/017). */
export interface EmailsDoLink {
  readonly email: string | null
  readonly origem: 'ficha' | 'paciente' | null
  readonly confirmadoEm: string | null
  /** Os interruptores da nutricionista (D-1227). */
  readonly ofertas: Readonly<Record<TipoDeAviso, boolean>>
  /** Os aceites do e-mail de agora (ativos e os que saíram). */
  readonly aceites: readonly AceiteDoLink[]
  /** Os avisos pedidos no link e ainda não confirmados (S3 sem o "Confirmar"). */
  readonly pendentes: readonly TipoDeAviso[]
  readonly supressao: 'devolvido' | 'queixa' | null
  readonly parouTudoEm: string | null
  readonly conviteEm: string | null
  readonly a1Para: string | null
  /** Os últimos 30 dias, do mais novo para o mais antigo (CA-2264). */
  readonly envios: readonly EnvioDoLink[]
}

export const SEM_EMAILS: EmailsDoLink = {
  email: null,
  origem: null,
  confirmadoEm: null,
  ofertas: { plano: true, semana: true, lembrete: true },
  aceites: [],
  pendentes: [],
  supressao: null,
  parouTudoEm: null,
  conviteEm: null,
  a1Para: null,
  envios: [],
}

/** O que a função do banco devolveu, montado de novo só com o que a ficha conhece. */
export function lerEmailsDoLink(bruto: unknown): EmailsDoLink {
  const o = objeto(bruto)
  const ofertas = objeto(o['ofertas'])
  const origem = o['origem']
  const supressao = o['supressao']
  const aceites = (Array.isArray(o['aceites']) ? o['aceites'] : []).map(objeto).flatMap((a): AceiteDoLink[] => {
    const tipo = a['tipo']
    const aceitoEm = textoOuNulo(a['aceito_em'])
    return ehTipoDeAviso(tipo) && aceitoEm ? [{ tipo, aceitoEm, saiuEm: textoOuNulo(a['saiu_em']), pausadoEm: textoOuNulo(a['pausado_em']) }] : []
  })
  const envios = (Array.isArray(o['envios']) ? o['envios'] : []).map(objeto).flatMap((e): EnvioDoLink[] => {
    const tipo = TIPOS_DE_EMAIL.find((t) => t === e['tipo'])
    const estado = ESTADOS_DO_ENVIO.find((s) => s === e['estado'])
    const criadoEm = textoOuNulo(e['criado_em'])
    return tipo && estado && criadoEm ? [{ criadoEm, tipo, estado, assunto: textoOuNulo(e['assunto']) ?? '' }] : []
  })
  return {
    email: textoOuNulo(o['email']),
    origem: origem === 'ficha' || origem === 'paciente' ? origem : null,
    confirmadoEm: textoOuNulo(o['confirmado_em']),
    ofertas: { plano: ofertas['plano'] !== false, semana: ofertas['semana'] !== false, lembrete: ofertas['lembrete'] !== false },
    aceites,
    pendentes: tipos(o['pendentes']),
    supressao: supressao === 'devolvido' || supressao === 'queixa' ? supressao : null,
    parouTudoEm: textoOuNulo(o['parou_tudo_em']),
    conviteEm: textoOuNulo(o['convite_em']),
    a1Para: textoOuNulo(o['a1_para']),
    envios: [...envios].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
  }
}

export async function buscarEmailsDoLink(cliente: ClienteDosEmails | null, linkId: string): Promise<Resultado<{ readonly emails: EmailsDoLink }>> {
  const r = await chamarBanco(cliente, 'emails_do_link', { p_link: linkId })
  return r.ok ? { ok: true, emails: lerEmailsDoLink(r.dados) } : r
}

/** DP-LP-7: o e-mail da ficha vai para o link quando muda; nulo apaga o da ficha. */
export async function definirEmailDaFicha(cliente: ClienteDosEmails | null, linkId: string, email: string | null): Promise<Resultado> {
  const r = await chamarBanco(cliente, 'definir_email_da_ficha', { p_link: linkId, p_email: email })
  return r.ok ? { ok: true } : r
}

/** D-1227 e CA-2263: os interruptores da nutricionista. */
export async function definirOfertas(cliente: ClienteDosEmails | null, linkId: string, ofertas: Readonly<Record<TipoDeAviso, boolean>>): Promise<Resultado> {
  const r = await chamarBanco(cliente, 'definir_ofertas', { p_link: linkId, p_plano: ofertas.plano, p_semana: ofertas.semana, p_lembrete: ofertas.lembrete })
  return r.ok ? { ok: true } : r
}

export type AcaoDoEnvio = 'enviar' | 'convite' | 'trocou' | 'atualizou'

/**
 * A nutricionista manda pelo servidor (`enviar-link`): o S2 ("E-mail" no cartão, CA-2262), o S2 com o convite (CA-2227),
 * o S4 depois de "Trocar o endereço" (CA-2223) e o A1 agendado depois de "Atualizar com este plano" (CA-2249).
 */
export async function pedirEnvio(
  cliente: ClienteDosEmails | null,
  acao: AcaoDoEnvio,
  linkId: string,
  avisar?: boolean,
): Promise<Resultado<{ readonly enviadoPara: string | null; readonly agendadoPara: string | null }>> {
  const r = await chamarFuncao(cliente, 'enviar-link', { acao, link: linkId, ...(avisar === undefined ? {} : { avisar }) })
  return r.ok ? { ok: true, enviadoPara: textoOuNulo(r.dados['enviadoPara']), agendadoPara: textoOuNulo(r.dados['agendadoPara']) } : r
}

/** O envelope da Adesão (CA-2269): os links com algum aviso aceito. */
export async function linksComAvisos(cliente: ClienteDosEmails | null): Promise<ReadonlySet<string>> {
  const r = await chamarBanco(cliente, 'avisos_aceitos_da_conta', {})
  if (!r.ok || !Array.isArray(r.dados)) return new Set()
  return new Set(r.dados.map((l) => objeto(l)['link_id']).filter((id): id is string => typeof id === 'string'))
}

/** DP-LP-26: excluir o paciente apaga o e-mail, os aceites e os envios do link antes de o link sair. */
export async function apagarEmailsDoLink(cliente: ClienteDosEmails | null, linkId: string): Promise<Resultado> {
  const r = await chamarBanco(cliente, 'apagar_emails_do_link', { p_link: linkId })
  return r.ok ? { ok: true } : r
}

// ---------- A nutricionista: Configurações › E-mails ----------

export interface ConfigDeEmails {
  readonly nome: string
  readonly responderPara: string | null
  readonly resumoDaAdesao: boolean
  readonly oferecerAosNovos: boolean
}

export const CONFIG_PADRAO: ConfigDeEmails = { nome: '', responderPara: null, resumoDaAdesao: true, oferecerAosNovos: true }

export async function lerConfigDeEmails(cliente: ClienteDosEmails | null, usuario: string): Promise<Resultado<{ readonly config: ConfigDeEmails }>> {
  if (cliente === null) return { ok: false, erro: EMAILS_INDISPONIVEIS }
  try {
    const { data, error } = await cliente.from('config_de_emails').select('*').eq('nutricionista_id', usuario).maybeSingle()
    if (error) return { ok: false, erro: EMAILS_INDISPONIVEIS }
    if (data === null) return { ok: true, config: CONFIG_PADRAO }
    const o = objeto(data)
    return {
      ok: true,
      config: {
        nome: textoOuNulo(o['nome']) ?? '',
        responderPara: textoOuNulo(o['responder_para']),
        resumoDaAdesao: o['resumo_da_adesao'] !== false,
        oferecerAosNovos: o['oferecer_aos_novos'] !== false,
      },
    }
  } catch {
    return { ok: false, erro: EMAILS_INDISPONIVEIS }
  }
}

/** Grava a configuração da conta (uma linha por conta, sempre por cima). */
export async function salvarConfigDeEmails(cliente: ClienteDosEmails | null, usuario: string, config: ConfigDeEmails): Promise<Resultado> {
  if (cliente === null) return { ok: false, erro: EMAILS_INDISPONIVEIS }
  try {
    const { error } = await cliente.from('config_de_emails').upsert(
      {
        nutricionista_id: usuario,
        nome: config.nome.trim().slice(0, 120),
        responder_para: config.responderPara,
        resumo_da_adesao: config.resumoDaAdesao,
        oferecer_aos_novos: config.oferecerAosNovos,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'nutricionista_id' },
    )
    return error ? { ok: false, erro: EMAILS_INDISPONIVEIS } : { ok: true }
  } catch {
    return { ok: false, erro: EMAILS_INDISPONIVEIS }
  }
}

// ---------- O dono: o Painel (D-1240) ----------

export interface PainelDeEmails {
  readonly hoje: number
  readonly mes: number
  readonly tetoDia: number
  readonly tetoMes: number
  readonly adiados7d: number
  readonly envios7d: number
  /** Em porcentagem (2,4 = 2,4%). */
  readonly devolucao7d: number
  readonly queixa7d: number
  readonly pausadoEm: string | null
  readonly motivo: string | null
}

const numero = (valor: unknown, padrao = 0): number => (typeof valor === 'number' && Number.isFinite(valor) ? valor : padrao)

export async function lerPainelDeEmails(cliente: ClienteDosEmails | null): Promise<Resultado<{ readonly painel: PainelDeEmails }>> {
  const r = await chamarBanco(cliente, 'painel_emails', {})
  if (!r.ok) return r
  const o = objeto(r.dados)
  return {
    ok: true,
    painel: {
      hoje: numero(o['hoje']),
      mes: numero(o['mes']),
      tetoDia: numero(o['teto_dia'], 70),
      tetoMes: numero(o['teto_mes'], 2100),
      adiados7d: numero(o['adiados_7d']),
      envios7d: numero(o['envios_7d']),
      devolucao7d: numero(o['devolucao_7d']),
      queixa7d: numero(o['queixa_7d']),
      pausadoEm: textoOuNulo(o['pausado_em']),
      motivo: textoOuNulo(o['motivo']),
    },
  }
}

export async function retomarAvisos(cliente: ClienteDosEmails | null): Promise<Resultado> {
  const r = await chamarBanco(cliente, 'retomar_avisos', {})
  return r.ok ? { ok: true } : r
}
