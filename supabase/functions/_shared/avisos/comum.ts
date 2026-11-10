// O que as funções de e-mail fazem igual (spec lado-do-paciente): as frases das respostas, os endereços dos botões, quem
// assina o e-mail, a chave das páginas e o envio de serviço (S1 a S4) com o teto do dia. Puro: as dependências chegam de
// fora (portas.ts).
import { emBrasilia, instanteEmBrasilia } from './regras.ts'
import type { EmailParaEnviar, ResultadoDoEnvio } from './resend.ts'
import { primeiroNomeDe, linhaDoRegistro, type Remetente } from './emails.ts'
import type { BancoDosAvisos, DadosDaNutricionista, LinkDoBanco, NovoEnvio, Ofertas, Registro, RespostaDaFuncao } from './portas.ts'
import { cortarNoTeto, inicioDoDiaDoTeto, inicioDoMesDoTeto, type Tetos } from './tetos.ts'
import type { TipoDeAviso } from './tipos.ts'

// ---------- As frases (as mesmas de src/domain/emailsDoLink.ts; um teste confere) ----------

/** CB-1216. */
export const NAO_ENVIOU = 'Não foi possível enviar agora. Tente de novo em alguns minutos.'
/** CA-2236. */
export const CONFIRA_O_EMAIL = 'Confira o e-mail.'
/** CA-2237. */
export const PEDIDOS_DEMAIS_NO_DIA = 'Você já pediu 3 vezes hoje. Tente amanhã.'
/** CA-2255. */
export const CHAVE_QUE_NAO_VALE = 'Este endereço não vale. Abra o botão do e-mail mais recente.'
/** CA-2262. */
export const LIMITE_DA_CONTA = 'Você chegou a 30 e-mails hoje. Amanhã volta.'
/** D-1222: o token que não abre (endereço trocado ou link removido). */
export const LINK_QUE_NAO_ABRE = 'Este link não abre mais.'
export const PEDIDO_INVALIDO = 'O pedido chegou incompleto. Recarregue a página e tente de novo.'

// ---------- Os limites ----------

/** D-1220: até 3 pedidos de recuperação por hora, por e-mail e por endereço de internet. */
export const RECUPERACOES_POR_HORA = 3
/** D-1221: até 3 pedidos do paciente por dia, por link. */
export const PEDIDOS_POR_DIA_NO_LINK = 3
/** D-1237: até 30 envios de serviço por dia, por conta de nutricionista. */
export const ENVIOS_POR_DIA_NA_CONTA = 30
/** CB-1222: a chave do S3 vale 7 dias. */
export const VALIDADE_DO_ACEITE_MS = 7 * 24 * 60 * 60 * 1000
/** O convite do S2 vale 30 dias. */
export const VALIDADE_DO_CONVITE_MS = 30 * 24 * 60 * 60 * 1000

// ---------- O que as funções recebem ----------

export interface Ambiente {
  /** `ENDERECO_DO_APP`: https://app.metanutri.com.br. */
  readonly app: string
  /** `<SUPABASE_URL>/functions/v1`: o endereço do descadastro de um clique (D-1235). */
  readonly funcoes: string
}

export interface DependenciasComuns {
  readonly banco: BancoDosAvisos
  /** O envio em lote (resend.ts), com a chave e o remetente já ligados. */
  readonly enviar: (emails: readonly EmailParaEnviar[], idempotencia: string) => Promise<readonly ResultadoDoEnvio[]>
  readonly agora: () => Date
  readonly log: Registro
  readonly ambiente: Ambiente
  /** Os tetos do ambiente, lidos a cada chamada (CA-2274). */
  readonly tetos: () => Tetos
  /** O resumo SHA-256 (email.ts). */
  readonly hash: (texto: string) => Promise<string>
  /** Bytes aleatórios (as chaves das páginas). */
  readonly aleatorio: (tamanho: number) => Uint8Array
}

export const erro = (mensagem: string, status: number): RespostaDaFuncao => ({ status, corpo: { erro: mensagem } })

// ---------- Os endereços ----------

const semBarra = (url: string): string => url.replace(/\/+$/, '')
export const urlDoLink = (ambiente: Ambiente, token: string): string => `${semBarra(ambiente.app)}/p/${encodeURIComponent(token)}`
export const urlDaPagina = (ambiente: Ambiente, chave: string): string => `${semBarra(ambiente.app)}/avisos/${encodeURIComponent(chave)}`
export const urlDeUmClique = (ambiente: Ambiente, chave: string): string => `${semBarra(ambiente.funcoes)}/avisos-resposta?c=${encodeURIComponent(chave)}`
export const urlDaAdesao = (ambiente: Ambiente): string => `${semBarra(ambiente.app)}/#/adesao`

// ---------- Quem assina ----------

/** D-1234 e CA-2258: o topo do e-mail. O link de estudante diz o estágio mesmo se a conta mudou depois. */
export function remetenteDoLink(nutri: DadosDaNutricionista, link: Pick<LinkDoBanco, 'usoNaoComercial'>): Remetente {
  return {
    nome: nutri.nome,
    registro: linhaDoRegistro({ estudante: nutri.estudante || link.usoNaoComercial, crnRegiao: nutri.crnRegiao, crnNumero: nutri.crnNumero }),
    cor: nutri.cor,
  }
}

/** Os pontos finais de outros alfabetos (o ideográfico, o árabe, o armênio, o etíope, o siríaco). */
const PONTOS_DE_OUTROS_ALFABETOS = /[。｡۔։።܁܂]/g
/** Os pontos do meio (·, •, ‧, ∙, ⋅, ・), que só viram ponto colados entre duas letras: "Ana · Nutri" fica. */
const PONTOS_DO_MEIO_COLADOS = /(?<=\S)[·•‧∙⋅・･]+(?=\S)/gu

/**
 * D-1254, D-1257, CA-2299 e CA-2302: o nome do remetente sem endereço web, sem e-mail, sem aspas e sem os sinais de
 * cabeçalho, com até 60 caracteres. Uma conta não manda e-mail com um nome que leva a outro site. Vale a regra geral,
 * não uma lista de terminações: sai qualquer "palavra.palavra" com 2 ou mais letras depois do ponto, depois de o nome
 * passar pela forma de compatibilidade do Unicode (o ponto largo "．" e o "․" viram "."), perder os caracteres
 * invisíveis e ter o espaço antes de um ponto tirado ("golpe .com"). "Dra. Ana" (ponto e espaço) fica.
 */
export function nomeLimpoDoRemetente(nome: string): string {
  const normalizado = nome
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(PONTOS_DE_OUTROS_ALFABETOS, '.')
    .replace(PONTOS_DO_MEIO_COLADOS, '.')
  // Os sinais de controle (a quebra de linha que abriria outro cabeçalho) viram espaço.
  const semControle = Array.from(normalizado, (letra) => (letra.charCodeAt(0) < 32 || letra.charCodeAt(0) === 127 ? ' ' : letra)).join('')
  return semControle
    .replace(/\s+\.\s*(?=[\p{L}\p{N}])/gu, '.')
    .replace(/\S+@\S+/g, ' ')
    .replace(/\b(?:https?:\/\/|www\.)\S*/gi, ' ')
    .replace(/\S*[\p{L}\p{N}]\.\p{L}{2,}\S*/gu, ' ')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b\S*/g, ' ')
    .replace(/["'`<>\\;:,()[\]{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim()
}

/** D-1225: "Ana Lima via MetaNutri"; sem nome no Perfil, "MetaNutri". O nome sai limpo (D-1254). */
export const nomeDoRemetente = (nutri: DadosDaNutricionista): string => {
  const nome = nomeLimpoDoRemetente(nutri.nome)
  return nome ? `${nome} via MetaNutri` : 'MetaNutri'
}

/** D-1225 e CA-2259: a resposta vai para o e-mail do Perfil, ou o da conta. */
export const responderPara = (nutri: DadosDaNutricionista): string | null => nutri.responderPara ?? nutri.emailDaConta

/** O primeiro nome do paciente no link (CB-1227: sem nome, nulo). */
export const primeiroNomeDoLink = (link: Pick<LinkDoBanco, 'nome'>): string | null => primeiroNomeDe(link.nome)

/** As ofertas de quem ainda não tem a linha do e-mail: a escolha da conta para os pacientes novos (D-1227). */
export const ofertasPadrao = (oferece: boolean): Ofertas => ({ plano: oferece, semana: oferece, lembrete: oferece })

// ---------- As chaves das páginas ----------

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** DP-LP-20: 32 letras e números sorteados (62 ≈ 2^5,95 cada: 190 bits). */
export function gerarChave(aleatorio: (tamanho: number) => Uint8Array): string {
  // 248 é o maior múltiplo de 62 abaixo de 256: os bytes de cima são sorteados de novo, sem puxar para nenhuma letra.
  let chave = ''
  while (chave.length < 32) {
    for (const byte of aleatorio(48)) {
      if (byte < 248 && chave.length < 32) chave += LETRAS[byte % 62]
    }
  }
  return chave
}

/** A chave de 32 letras e números das páginas; o resto é "não vale" sem perguntar ao banco. */
export const ehChave = (valor: unknown): valor is string => typeof valor === 'string' && /^[A-Za-z0-9]{32}$/.test(valor)

/** O token do link (12 a 64 letras minúsculas e números, como o 010). */
export const ehToken = (valor: unknown): valor is string => typeof valor === 'string' && /^[a-z0-9]{12,64}$/.test(valor)

/**
 * D-1256 (DP-LP-42): o resumo do endereço do link, igual ao `hash_do_token` do 017: SHA-256 do token como está, em
 * hexadecimal minúsculo. A chave do aceite o guarda, e o banco e a página conferem com o token de agora.
 */
export async function hashDoToken(token: string): Promise<string> {
  const resumo = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(resumo), (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- Os dias ----------

/** O começo do dia de Brasília (os limites "por dia" do paciente e da conta, CA-2237 e CA-2262). */
export const inicioDoDiaDeBrasilia = (agora: Date): Date => instanteEmBrasilia(emBrasilia(agora).dia, 0)

// ---------- O envio de serviço ----------

export interface ItemDeServico {
  readonly email: EmailParaEnviar
  /** O envio gravado: o primeiro do pedido conta no teto (o S1 da recuperação grava um por link). */
  readonly envios: readonly Omit<NovoEnvio, 'estado' | 'chaveUnica' | 'dia' | 'tipo' | 'assunto'>[]
}

/**
 * S1 a S4: confere o teto do dia e do mês (D-1237: serviço só não passa do dia; S1 e S3 passam do mês), grava os envios e
 * manda. Qualquer e-mail que não sai deixa o pedido como "não deu" (CB-1216): a linha dele é apagada (DP-LP-13) e a tela
 * mostra a frase. Devolve 'enviado', 'fora' ou 'conta' (a conta passou do `TETO_CONTA_DIA`, D-1254).
 */
export async function enviarServico(itens: readonly ItemDeServico[], deps: DependenciasComuns): Promise<'enviado' | 'fora' | 'conta'> {
  if (itens.length === 0) return 'enviado'
  const agora = deps.agora()
  const contagem = await deps.banco.contarEnvios(inicioDoDiaDoTeto(agora), inicioDoMesDoTeto(agora))
  const corte = cortarNoTeto(
    itens.map((item, i) => ({ tipo: item.email.tipo, i, nutricionistaId: item.envios[0]?.nutricionistaId ?? null })),
    contagem,
    deps.tetos(),
  )
  if (corte.barrados.length > 0 || corte.vao.length !== itens.length) {
    // D-1254: a conta que passou do teto dela não gasta o teto de todo mundo.
    const daConta = corte.pelaConta.length > 0
    deps.log(daConta ? 'Serviço barrado pelo teto da conta:' : 'Serviço barrado pelo teto do dia ou do mês:', itens.map((i) => i.email.tipo).join(','))
    return daConta ? 'conta' : 'fora'
  }
  const dia = emBrasilia(agora).dia
  const marca = agora.toISOString()
  const porItem: NovoEnvio[][] = itens.map((item, i) =>
    item.envios.map((envio, j) => ({
      ...envio,
      tipo: item.email.tipo,
      assunto: item.email.assunto,
      estado: 'enviado' as const,
      dia,
      chaveUnica: `${envio.emailHash}:${item.email.tipo}:${marca}:${envio.linkId ?? envio.nutricionistaId}:${i}.${j}`,
    })),
  )
  const novos = porItem.flat()
  const gravadas = new Set(await deps.banco.registrarEnvios(novos))
  const idempotencia = `servico-${(await deps.hash(novos.map((n) => n.chaveUnica).join('|'))).slice(0, 40)}`
  const resultados = await deps.enviar(
    itens.map((i) => i.email),
    idempotencia,
  )
  let falhou = false
  for (let i = 0; i < itens.length; i++) {
    const r = resultados[i]
    const chaves = (porItem[i] ?? []).map((n) => n.chaveUnica).filter((c) => gravadas.has(c))
    if (r?.ok) {
      const [primeira, ...resto] = chaves
      if (primeira) await deps.banco.marcarEnvio(primeira, { estado: 'enviado', resendId: r.id })
      for (const c of resto) await deps.banco.marcarEnvio(c, { estado: 'enviado' })
    } else {
      falhou = true
      await deps.banco.apagarEnvios(chaves)
      deps.log('O Resend não mandou o e-mail de serviço:', itens[i]?.email.tipo, r?.ok === false ? r.motivo : 'sem resposta')
    }
  }
  return falhou ? 'fora' : 'enviado'
}

/** Os avisos pedidos que valem: só os que a nutricionista oferece (CA-2242), na ordem de sempre. */
export const avisosOferecidos = (pedidos: readonly TipoDeAviso[], ofertas: Ofertas): readonly TipoDeAviso[] =>
  (['plano', 'semana', 'lembrete'] as const).filter((t) => pedidos.includes(t) && ofertas[t])

