// Recebe os avisos da operadora de pagamento (spec checkout-proprio; spec cobranca-em-producao, D-80,
// D-83 a D-85 e D-102). Puro: a operadora, o banco, o segredo, o relógio e o registro chegam de fora
// (src/data/servidorWebhook.test.ts).
//
// Três regras que este arquivo não quebra:
//   1. Não confiar no corpo do aviso. Sem o segredo, nada é processado; com ele, o código do recurso
//      precisa ter o formato esperado e a assinatura do cabeçalho precisa conferir. O estado verdadeiro
//      é lido na API da operadora.
//   2. Cada aviso fica anotado, sem dado pessoal, com o que foi feito (D-84).
//   3. 200 quer dizer "entendido" (feito ou ignorado de propósito). 500 é falha passageira (sem o
//      segredo, operadora fora, banco fora, cancelamento que não pegou): a operadora manda de novo, e
//      refazer não muda nada que já foi feito.
import {
  dataDepoisDe,
  dataOuNula,
  ehCicloDaAssinatura,
  objeto,
  PAGOS,
  planoPeloValor,
  PLANOS_DO_SERVIDOR,
  previsaoDaProximaCobranca,
  traduzirStatus,
  UM_DIA_MS,
} from './cobranca.ts'
import { cancelarNaOperadora, tentarCancelarNaOperadora } from './operadora.ts'
import type { AvisoAnotado, BancoDaCobranca, FalhaDoBanco, LinhaDaAssinatura, MudancaDaAssinatura, Operadora, Registro } from './portas.ts'

export interface AvisoRecebido {
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
  /** `data.id` e `type` da URL do aviso (?data.id=…&type=…). */
  readonly idNaUrl: string | null
  readonly tipoNaUrl: string | null
  readonly xSignature: string | null
  readonly xRequestId: string | null
}

export interface DependenciasDoWebhook {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'lerDaOperadora' | 'gravar' | 'mudar' | 'lerReserva' | 'anotarAviso' | 'apagarAvisosAntesDe'>
  /** Nulo (ou vazio) quando a função está sem o segredo: nada é processado, o registro anota "sem segredo" e a resposta é 500, para o aviso voltar quando o segredo for posto (CA-436). */
  readonly segredo: string | null
  readonly agora: () => Date
  readonly log: Registro
}

export type StatusDoAviso = 200 | 500
/** D-84: o registro guarda 90 dias. */
export const GUARDA_DOS_AVISOS_MS = 90 * UM_DIA_MS
/** CA-437: o código do recurso aceito (letras e números, até 64). Nada fora disso chega à operadora. */
const RECURSO_VALIDO = /^[A-Za-z0-9]{1,64}$/

interface Feito {
  readonly status: StatusDoAviso
  readonly resultado: string
}
const feito = (resultado: string, status: StatusDoAviso = 200): Feito => ({ status, resultado })
const textoCurto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null)
const presente = (valor: unknown): valor is string => typeof valor === 'string' && valor.trim() !== ''
/** Corta em `limite` caracteres contados como o char_length do Postgres, sem partir um emoji ao meio. */
const cortar = (texto: string, limite: number): string => Array.from(texto).slice(0, limite).join('')
const mensagemDe = (erro: unknown): string => (erro instanceof Error ? erro.message : 'erro desconhecido')

/** O manifesto que a operadora assina: o id do recurso em minúsculas, o x-request-id (se veio) e o ts. */
export function manifestoDoAviso(id: string, requestId: string | null, ts: string): string {
  return `id:${id.toLowerCase()};${requestId ? `request-id:${requestId};` : ''}ts:${ts};`
}

/** Compara sem parar no primeiro caractere diferente: o tempo da resposta não entrega quanto do código acertou. */
function mesmoTexto(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

/**
 * CA-399: confere o x-signature (`ts=…,v1=…`), que é o HMAC-SHA256 do manifesto com o segredo, em hexadecimal.
 * As partes valem em qualquer ordem e com o nome em maiúsculas; parte desconhecida fica de lado. Quem
 * decide é o HMAC. O segredo é aparado: colado com uma quebra de linha no fim, ainda vale.
 */
export async function assinaturaConfere(cabecalho: string | null, requestId: string | null, id: string, segredo: string): Promise<boolean> {
  const chaveDoSegredo = segredo.trim()
  if (chaveDoSegredo === '') return false
  const partes = new Map<string, string>()
  for (const parte of (cabecalho ?? '').split(',')) {
    const igual = parte.indexOf('=')
    if (igual > 0) partes.set(parte.slice(0, igual).trim().toLowerCase(), parte.slice(igual + 1).trim())
  }
  const ts = partes.get('ts')
  const v1 = partes.get('v1')
  if (!ts || !v1) return false
  const texto = new TextEncoder()
  const chave = await crypto.subtle.importKey('raw', texto.encode(chaveDoSegredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinado = new Uint8Array(await crypto.subtle.sign('HMAC', chave, texto.encode(manifestoDoAviso(id, textoCurto(requestId), ts))))
  const esperado = Array.from(assinado, (b) => b.toString(16).padStart(2, '0')).join('')
  return mesmoTexto(esperado, v1.toLowerCase())
}

/**
 * O código do recurso: o da URL, que é o assinado (CA-399); o do corpo (`data.id`) só quando a URL não
 * traz. Vai como veio, sem aparar: o formato (CA-437) é conferido no texto exato. A operadora pode
 * mandar número no corpo.
 */
function idDoAviso(aviso: AvisoRecebido, corpo: Readonly<Record<string, unknown>> | null): string | null {
  if (presente(aviso.idNaUrl)) return aviso.idNaUrl
  const doCorpo = objeto(corpo?.['data'])?.['id']
  if (typeof doCorpo === 'number') return Number.isFinite(doCorpo) ? String(doCorpo) : null
  return presente(doCorpo) ? doCorpo : null
}

/** Sem resposta, 5xx, 429 ou a nossa credencial recusada: passageiro, e o aviso volta. */
function falhaPassageira(status: number): Feito | null {
  if (status >= 500 || status === 429) return feito('falha: operadora fora', 500)
  if (status === 401 || status === 403) return feito('falha: credencial recusada', 500)
  return null
}

function falhaNoBanco(deps: DependenciasDoWebhook, falha: FalhaDoBanco, onde: string): Feito {
  deps.log(`O banco falhou ao ${onde}:`, falha.mensagem)
  return feito('falha: banco', 500)
}

/**
 * Muda a linha desta conta com esta assinatura. Nulo quando mudou; senão, o que responder. Nenhuma linha
 * mudada quer dizer que a linha deixou de ter esta assinatura entre ler e gravar (a pessoa assinou de
 * novo): o aviso volta e, na volta, é tratado com a linha nova (adoção, sobra ou CB-98).
 */
async function mudarLinha(deps: DependenciasDoWebhook, conta: string, id: string, mudanca: MudancaDaAssinatura, onde: string): Promise<Feito | null> {
  const { linhas, falha } = await deps.banco.mudar(conta, id, mudanca)
  if (falha) return falhaNoBanco(deps, falha, onde)
  if (linhas > 0) return null
  deps.log(`A linha mudou antes de ${onde}; o aviso volta:`, id)
  return feito('falha: linha mudou', 500)
}

async function porTopico(topico: string, id: string, deps: DependenciasDoWebhook): Promise<Feito> {
  switch (topico) {
    case 'subscription_preapproval':
      return tratarAssinatura(id, deps)
    case 'subscription_authorized_payment':
      return tratarMensalidade(id, deps)
    case 'payment':
      // Pagamento avulso não é usado pelo MetaNutri: só fica anotado.
      return feito('ignorado: pagamento')
    default:
      return feito(`ignorado: tópico ${topico || 'vazio'}`)
  }
}

/**
 * As conferências, nesta ordem (R2): sem segredo, sem id, recurso fora do formato, assinatura, tópico.
 * Nas três primeiras a assinatura não chega a ser conferida (fica nula no registro).
 */
export async function tratarAviso(aviso: AvisoRecebido, deps: DependenciasDoWebhook): Promise<StatusDoAviso> {
  const corpo = objeto(aviso.corpo)
  const topico = textoCurto(corpo?.['type']) ?? textoCurto(aviso.tipoNaUrl) ?? ''
  const id = idDoAviso(aviso, corpo)
  // Aparado: o segredo colado no painel com uma quebra de linha no fim ainda confere.
  const segredo = presente(deps.segredo) ? deps.segredo.trim() : null
  let confere: boolean | null = null
  let resultado: Feito
  try {
    if (segredo === null) {
      // CA-436: sem o segredo, qualquer um faria a função chamar a operadora com o token do dono (D-102).
      deps.log('A função está sem o segredo do aviso: nada foi processado, e o aviso volta.')
      resultado = feito('sem segredo', 500)
    } else if (id === null) {
      resultado = feito('ignorado: sem id')
    } else if (!RECURSO_VALIDO.test(id)) {
      resultado = feito('recurso inválido')
    } else {
      confere = await assinaturaConfere(aviso.xSignature, aviso.xRequestId, id, segredo)
      resultado = confere ? await porTopico(topico, id, deps) : feito('assinatura não confere')
    }
  } catch (erro) {
    deps.log('Falha inesperada ao tratar o aviso:', mensagemDe(erro))
    resultado = feito('falha: erro inesperado', 500)
  }

  await anotar(deps, {
    topico: cortar(topico, 80),
    recurso_id: id === null ? null : cortar(id, 80),
    assinatura_confere: confere,
    resultado: cortar(resultado.resultado, 200),
  })
  return resultado.status
}

/** CA-398: anota o aviso e apaga os de mais de 90 dias. Falha aqui só vai para o registro da função: a resposta não muda. */
async function anotar(deps: DependenciasDoWebhook, anotado: AvisoAnotado): Promise<void> {
  try {
    const falha = await deps.banco.anotarAviso(anotado)
    if (falha) deps.log('Não consegui anotar o aviso:', falha.mensagem)
  } catch (erro) {
    deps.log('Não consegui anotar o aviso:', mensagemDe(erro))
  }
  try {
    const falha = await deps.banco.apagarAvisosAntesDe(new Date(deps.agora().getTime() - GUARDA_DOS_AVISOS_MS).toISOString())
    if (falha) deps.log('Não consegui apagar os avisos velhos:', falha.mensagem)
  } catch (erro) {
    deps.log('Não consegui apagar os avisos velhos:', mensagemDe(erro))
  }
}

/** O aviso da assinatura: grava o status que a operadora diz, ou adota a assinatura sem dono (D-85). */
async function tratarAssinatura(id: string, deps: DependenciasDoWebhook): Promise<Feito> {
  const lida = await deps.operadora('GET', `/preapproval/${encodeURIComponent(id)}`)
  if (!lida) return feito('falha: operadora fora', 500)
  const passageira = falhaPassageira(lida.status)
  if (passageira) return passageira
  if (!lida.ok) return feito('ignorado: assinatura não existe na operadora')
  const assinatura = lida.dados
  // Um 2xx sem corpo legível é leitura que falhou, não "não existe": o aviso volta.
  if (!assinatura) return feito('falha: resposta ilegível', 500)
  const dono = textoCurto(assinatura['external_reference'])
  if (!dono) return feito('ignorado: assinatura sem conta')
  const status = traduzirStatus(assinatura['status'])

  const { linha, falha } = await deps.banco.lerDaOperadora(id)
  if (falha) return falhaNoBanco(deps, falha, 'ler a assinatura do aviso')
  if (!linha) return status === 'ativa' ? adotar(id, dono, assinatura, deps) : feito(`ignorado: assinatura ${status} sem linha`)
  if (linha.nutricionista_id !== dono) {
    deps.log('Aviso de assinatura com outra conta na linha; conferir à mão:', id)
    return feito('ignorado: conta não confere')
  }
  // Cancelada é final: um aviso atrasado nunca devolve o plano pago nem troca quem encerrou.
  if (linha.status === 'cancelada') return feito('sem mudança: já cancelada')

  const agora = deps.agora()
  // A data de hoje (a primeira cobrança, ainda por cair) não conta: só a que passa de amanhã.
  const proxima = status === 'ativa' ? dataDepoisDe(assinatura['next_payment_date'], agora.getTime() + UM_DIA_MS) : null
  // D-80: o corte por recusa anota "recusa" na linha antes de pedir o cancelamento lá. A cancelada que
  // chega com essa anotação é esse corte: quem encerrou e quando ficam como o corte gravou (CA-393).
  const pelaRecusa = status === 'cancelada' && linha.encerrada_por === 'recusa'
  const mudanca: MudancaDaAssinatura = {
    status,
    atualizado_em: agora.toISOString(),
    ...(proxima ? { proxima_cobranca: proxima } : {}),
    // CA-392: a cortada por recusa não tem período a respeitar.
    ...(pelaRecusa ? { expira_em: null } : {}),
    // CB-94: a cancelada pela operadora também não. O expira_em fica como está (nulo na paga).
    ...(status === 'cancelada' && !pelaRecusa ? { encerrada_por: 'operadora' as const, encerrada_em: agora.toISOString() } : {}),
  }
  const naoMudou = await mudarLinha(deps, dono, id, mudanca, 'gravar o status da assinatura')
  return naoMudou ?? feito(pelaRecusa ? 'assinatura cancelada (recusa)' : `assinatura ${status}`)
}

/** A assinatura que sobrou (ou que não dá para adotar) sai da operadora, para ninguém pagar sem ter o plano. */
async function cancelarSobra(id: string, motivo: string, deps: DependenciasDoWebhook): Promise<Feito> {
  if (await cancelarNaOperadora(deps.operadora, id)) return feito(`cancelada: ${motivo}`)
  deps.log('CANCELAMENTO FALHOU: assinatura sem dono continua na operadora; o aviso volta:', id)
  return feito(`falha: ${motivo} não cancelada`, 500)
}

/**
 * D-85 (CA-400 e CA-401): a assinatura autorizada que não tem linha aqui (a resposta da assinar se
 * perdeu). Se a conta já paga outra, esta é a sobra. Se não, a pessoa ganha o plano que está pagando,
 * achado pelo valor e pela frequência (R-39).
 */
async function adotar(id: string, dono: string, assinatura: Readonly<Record<string, unknown>>, deps: DependenciasDoWebhook): Promise<Feito> {
  const { linha: atual, falha } = await deps.banco.lerDaConta(dono)
  if (falha) return falhaNoBanco(deps, falha, 'ler a conta da assinatura sem dono')
  if (atual && atual.status === 'ativa' && PAGOS.includes(atual.plano) && atual.preapproval_id !== id) return cancelarSobra(id, 'sobra', deps)

  const recorrencia = objeto(assinatura['auto_recurring'])
  const achado = planoPeloValor(recorrencia?.['transaction_amount'], recorrencia?.['frequency'], recorrencia?.['frequency_type'])
  if (!achado) return cancelarSobra(id, 'valor desconhecido', deps)

  const agora = deps.agora()
  // O cartão que a pessoa digitou fica na reserva quando a resposta da operadora se perde (009).
  const reserva = await deps.banco.lerReserva(dono)
  const proxima = dataDepoisDe(assinatura['next_payment_date'], agora.getTime() + UM_DIA_MS) ?? previsaoDaProximaCobranca(agora, achado.ciclo)
  const naoGravou = await deps.banco.gravar({
    nutricionista_id: dono,
    plano: achado.plano,
    status: 'ativa',
    preapproval_id: id,
    valor_centavos: Math.round(PLANOS_DO_SERVIDOR[achado.plano][achado.ciclo] * 100),
    ciclo: achado.ciclo,
    expira_em: null,
    cartao_bandeira: reserva?.cartao_bandeira ?? null,
    cartao_final: reserva?.cartao_final ?? null,
    proxima_cobranca: proxima,
    ultima_cobranca_paga: null,
    encerrada_por: null,
    encerrada_em: null,
    atualizado_em: agora.toISOString(),
  })
  if (naoGravou) return falhaNoBanco(deps, naoGravou, 'adotar a assinatura sem dono')
  deps.log('Assinatura sem dono adotada:', id)
  return feito(`adotada: ${achado.plano} ${achado.ciclo}`)
}

/** D-83: paga é pagamento aprovado; recusada é pagamento recusado ou a operadora tentando de novo depois de uma recusa. */
export function situacaoDaMensalidade(status: unknown, statusDoPagamento: unknown): 'paga' | 'recusada' | 'outra' {
  if (statusDoPagamento === 'approved') return 'paga'
  if (statusDoPagamento === 'rejected' || status === 'recycling') return 'recusada'
  return 'outra'
}

/** O aviso de cada mensalidade (D-83): paga marca a data; recusada encerra a assinatura (D-80). */
async function tratarMensalidade(id: string, deps: DependenciasDoWebhook): Promise<Feito> {
  const lida = await deps.operadora('GET', `/authorized_payments/${encodeURIComponent(id)}`)
  if (!lida) return feito('falha: operadora fora', 500)
  const passageira = falhaPassageira(lida.status)
  if (passageira) return passageira
  if (!lida.ok) return feito('ignorado: mensalidade não existe na operadora')
  const mensalidade = lida.dados
  // Um 2xx sem corpo legível é leitura que falhou, não "não existe": o aviso volta.
  if (!mensalidade) return feito('falha: resposta ilegível', 500)
  const preapprovalId = textoCurto(mensalidade['preapproval_id'])
  if (!preapprovalId) return feito('ignorado: mensalidade sem assinatura')
  const pagamento = objeto(mensalidade['payment'])
  const situacao = situacaoDaMensalidade(mensalidade['status'], pagamento?.['status'])
  if (situacao === 'outra') return feito(`ignorado: mensalidade ${textoCurto(mensalidade['status']) ?? '?'}/${textoCurto(pagamento?.['status']) ?? '?'}`)

  const agora = deps.agora()
  // O dia da cobrança: o que a operadora diz, ou agora se ela não disser.
  const quando = dataOuNula(mensalidade['debit_date']) ?? agora.toISOString()
  const { linha, falha } = await deps.banco.lerDaOperadora(preapprovalId)
  if (falha) return falhaNoBanco(deps, falha, 'ler a assinatura da mensalidade')
  return situacao === 'paga'
    ? registrarPaga(preapprovalId, linha, quando, agora, deps)
    : cortarPorRecusa(preapprovalId, linha, quando, textoCurto(pagamento?.['status_detail']), agora, deps)
}

/** CA-394: a paga marca a data e, na ativa, a próxima cobrança. CB-97: na que não está ativa, só a data. */
async function registrarPaga(preapprovalId: string, linha: LinhaDaAssinatura | null, quando: string, agora: Date, deps: DependenciasDoWebhook): Promise<Feito> {
  if (!linha) return feito('ignorado: mensalidade paga sem linha')
  const anotada = dataOuNula(linha.ultima_cobranca_paga)
  const maisNova = anotada === null || Date.parse(quando) > Date.parse(anotada)
  let proxima: string | null = null
  if (linha.status === 'ativa') {
    const assinatura = await deps.operadora('GET', `/preapproval/${encodeURIComponent(preapprovalId)}`)
    // A data de hoje (a cobrança que acabou de cair) não conta: só a que passa de amanhã.
    const daOperadora = assinatura?.ok ? dataDepoisDe(assinatura.dados?.['next_payment_date'], agora.getTime() + UM_DIA_MS) : null
    // A prevista só sai da mensalidade mais nova: uma paga velha que chega atrasada não volta a data.
    const prevista =
      maisNova && ehCicloDaAssinatura(linha.ciclo) ? dataDepoisDe(previsaoDaProximaCobranca(new Date(quando), linha.ciclo), agora.getTime()) : null
    proxima = daOperadora ?? prevista
  }
  if (!maisNova && !proxima) return feito('sem mudança: mensalidade já anotada')
  const naoMudou = await mudarLinha(
    deps,
    linha.nutricionista_id,
    preapprovalId,
    {
      atualizado_em: agora.toISOString(),
      ...(maisNova ? { ultima_cobranca_paga: quando } : {}),
      ...(proxima ? { proxima_cobranca: proxima } : {}),
    },
    'gravar a mensalidade paga',
  )
  return naoMudou ?? feito('mensalidade paga')
}

/**
 * D-80 e CA-392: a primeira recusa encerra a assinatura na operadora e, só depois, aqui. A conta volta ao
 * Free na hora.
 *
 * A ordem, em três passos:
 *   1. anota na linha quem está encerrando (`recusa`) e quando, sem mexer no status: a conta continua no
 *      plano pago;
 *   2. cancela lá. Se não pegar, para aqui e o aviso volta. Cortar só aqui deixaria a operadora cobrando
 *      de novo quem já está no Free, e se ela tentar de novo e a cobrança passar, a conta segue no plano;
 *   3. grava o corte: cancelada, sem período.
 * O passo 1 vem antes porque, assim que cancela lá, a operadora manda o aviso de "cancelada", que pode
 * chegar antes do passo 3. Esse aviso lê a anotação e não troca a recusa por "operadora" (tratarAssinatura).
 */
async function cortarPorRecusa(
  preapprovalId: string,
  linha: LinhaDaAssinatura | null,
  quando: string,
  motivo: string | null,
  agora: Date,
  deps: DependenciasDoWebhook,
): Promise<Feito> {
  // CB-96: o mesmo aviso de novo (ou outra recusa da mesma assinatura) não muda nada nem cancela de novo.
  if (linha?.status === 'cancelada') return feito('sem mudança: já cancelada')
  if (linha) {
    const naoAnotou = await mudarLinha(
      deps,
      linha.nutricionista_id,
      preapprovalId,
      { encerrada_por: 'recusa', encerrada_em: quando, atualizado_em: agora.toISOString() },
      'anotar a recusa',
    )
    if (naoAnotou) return naoAnotou
  }
  const cancelamento = await tentarCancelarNaOperadora(deps.operadora, preapprovalId)
  if (!cancelamento.cancelada) {
    deps.log('CANCELAMENTO FALHOU: mensalidade recusada e a assinatura continua na operadora; o aviso volta:', preapprovalId, cancelamento.ultimoStatus)
    return feito('falha: recusa sem cancelar', 500)
  }
  // CB-98: sem linha com esta assinatura (a pessoa já tem outra), só ela é afetada, e só lá.
  if (!linha) return feito('cancelada: recusa sem linha')
  const naoMudou = await mudarLinha(
    deps,
    linha.nutricionista_id,
    preapprovalId,
    { status: 'cancelada', expira_em: null, encerrada_por: 'recusa', encerrada_em: quando, atualizado_em: agora.toISOString() },
    'gravar o corte por recusa',
  )
  return naoMudou ?? feito(`cortada: recusa${motivo ? ` (${motivo})` : ''}`)
}
