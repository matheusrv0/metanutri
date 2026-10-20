// Exclui a conta de quem pede (spec exclusao-de-conta, D-251 a D-256). Puro: o banco, a operadora, a porta da
// exclusão (administrador, armazenamento e login), o relógio e o registro chegam de fora (src/data/servidorExcluir.test.ts;
// de ponta a ponta, no Supabase local, testes/seguranca/exclusao.test.ts).
//
// D-252, a ordem, para nunca ficar pela metade:
//   1. confere quem pede, a hora da senha, se é administrador e o limite de pedidos, e reserva a conta (a mesma
//      reserva do pagamento e da troca de cartão, CB-253), até o fim do pedido;
//   2. cancela a assinatura paga pelo mesmo caminho do "Cancelar assinatura" (gerenciarAssinatura). Se não der, para
//      aqui, sem apagar nada;
//   3. apaga os comprovantes de matrícula do armazenamento;
//   4. apaga o login. O banco apaga junto, no mesmo passo, todas as linhas da conta e guarda o que o D-253 manda
//      (supabase/013-exclusao-de-conta.sql).
// Antes do passo 4, a conta funciona com todos os dados (no máximo, sem os arquivos dos comprovantes). Pedir de novo
// faz só o que falta: a assinatura já cancelada não vai de novo à operadora, e arquivo que já saiu não é erro.
import { EM_ANDAMENTO, RESERVA_VENCE_MS } from './assinar.ts'
import { conferirChamadas } from './chamadas.ts'
import { objeto, PAGOS } from './cobranca.ts'
import { GRAVADA_LA_SO, gerenciarAssinatura, type DependenciasDeGerenciar } from './gerenciarAssinatura.ts'
import { respostaDeErro as erro, type ContaQuePede, type RespostaDaFuncao } from './portas.ts'

/** CA-809: qualquer falha antes do fim. Antes do passo 4 a conta continua (D-252). */
export const EXCLUSAO_FALHOU = 'Não deu para terminar a exclusão. Sua conta continua ativa. Tente de novo em alguns minutos.'
/** CA-809 (L5 da revisão): a falha depois de o mesmo pedido cancelar a assinatura; a conta continua, sem o plano pago. */
export const EXCLUSAO_FALHOU_CANCELADA = 'Não deu para terminar a exclusão. A assinatura já foi cancelada; o resto da conta continua. Tente de novo em alguns minutos.'
export const SEM_SESSAO = 'Entre na sua conta antes de excluir.'
/** CA-816: a senha foi conferida há mais de 10 minutos (ou o token não diz quando). */
export const CONFIRME_A_SENHA = 'Confirme sua senha de novo.'
/** D-254, CA-801 e CA-817. */
export const ADMINISTRADOR = 'Conta de administrador não é excluída pelo site.'
/** D-251: por quanto tempo a senha conferida vale para excluir. */
export const SENHA_VALE_MS = 10 * 60_000

/** Quem pede, lido do token da sessão. `apagada`: o token é válido, mas o login já não existe (CA-821). */
export type QuemPedeAExclusao =
  | { readonly tipo: 'conta'; readonly conta: ContaQuePede; readonly senhaEm: Date | null }
  | { readonly tipo: 'apagada' }
  | { readonly tipo: 'ninguem' }

export interface PedidoDeExclusao {
  readonly quem: QuemPedeAExclusao
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
}

/** A reserva da conta (assinando_agora): a mesma do pagamento e da troca de cartão, uma por conta. */
export type ReservaDaConta = { readonly tipo: 'reservada' } | { readonly tipo: 'ocupada' } | { readonly tipo: 'falhou'; readonly mensagem: string }

/** O que só a exclusão usa do servidor (supabase/functions/_shared/exclusaoSupabase.ts). */
export interface PortaDaExclusao {
  /** Solta a reserva desta conta feita antes de `antesDe` (função que morreu no meio) e reserva a conta. */
  reservar(conta: string, antesDe: string): Promise<ReservaDaConta>
  /** Solta a reserva desta conta. Nulo quando deu certo; senão, a mensagem (ela vence em 5 minutos). */
  soltarReserva(conta: string): Promise<string | null>
  /** A conta é de administrador? Sem conseguir saber, rejeita. */
  ehAdmin(conta: string): Promise<boolean>
  /** Apaga os arquivos da pasta da conta em `comprovantes`. Nulo quando não sobrou nenhum; senão, a mensagem da falha. */
  apagarArquivos(conta: string): Promise<string | null>
  /** Apaga o login. Nulo quando ele não existe mais (inclusive se já não existia); senão, a mensagem da falha. */
  apagarLogin(conta: string): Promise<string | null>
}

export interface DependenciasDaExclusao extends DependenciasDeGerenciar {
  readonly exclusao: PortaDaExclusao
}

const EXCLUIDA: RespostaDaFuncao = { status: 200, corpo: { excluida: true } }
const falhou = (): RespostaDaFuncao => erro(EXCLUSAO_FALHOU, 502)
const falhouCancelada = (): RespostaDaFuncao => erro(EXCLUSAO_FALHOU_CANCELADA, 502, 'assinatura-cancelada')
const mensagemDe = (falha: unknown): string => (falha instanceof Error ? falha.message : String(falha))

/** A carga do token, decodificada do base64url. Nula quando não é um token com carga JSON. */
function cargaDoToken(jwt: string): Readonly<Record<string, unknown>> | null {
  const parte = jwt.split('.')[1]
  if (!parte) return null
  try {
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const texto = new TextDecoder().decode(Uint8Array.from(binario, (letra) => letra.charCodeAt(0)))
    return objeto(JSON.parse(texto))
  } catch {
    return null
  }
}

/**
 * D-251: quando a pessoa entrou por último nesta sessão (senha ou código), pelo `amr` do token. O servidor de login
 * guarda ali cada entrada, com a hora; renovar a sessão não muda a hora. Quem chama já conferiu o token (a porta da
 * função, verify_jwt, e o getUser). Sem a hora, nulo: o pedido pede a senha de novo.
 */
export function horaDaSenha(jwt: string): Date | null {
  const amr = cargaDoToken(jwt)?.['amr']
  if (!Array.isArray(amr)) return null
  let maisNova = 0
  for (const entrada of amr) {
    const hora = objeto(entrada)?.['timestamp']
    if (typeof hora === 'number' && Number.isFinite(hora) && hora > maisNova) maisNova = hora
  }
  return maisNova > 0 ? new Date(maisNova * 1000) : null
}

/** Paga e ainda não cancelada: precisa sair da operadora antes (CA-814). */
const precisaCancelar = (linha: { readonly plano: string; readonly status: string; readonly preapproval_id: string | null } | null): boolean =>
  linha !== null && PAGOS.includes(linha.plano) && linha.preapproval_id !== null && linha.status !== 'cancelada'

export async function excluirConta(pedido: PedidoDeExclusao, deps: DependenciasDaExclusao): Promise<RespostaDaFuncao> {
  const { quem } = pedido
  if (quem.tipo === 'ninguem') return erro(SEM_SESSAO, 401)
  // CA-821 e CB-250: o token vale, mas o login já saiu; a resposta do pedido anterior se perdeu.
  if (quem.tipo === 'apagada') return EXCLUIDA
  if (objeto(pedido.corpo)?.['acao'] !== 'excluir') return erro('Corpo da requisição inválido.', 400)

  const agora = deps.agora()
  const dono = quem.conta.id
  // CA-816: a hora no futuro (relógio do servidor de login adiantado) passa; a de mais de 10 minutos atrás, não.
  if (quem.senhaEm === null || agora.getTime() - quem.senhaEm.getTime() > SENHA_VALE_MS) return erro(CONFIRME_A_SENHA, 401, 'login-antigo')

  let admin: boolean
  try {
    admin = await deps.exclusao.ehAdmin(dono)
  } catch (falha) {
    deps.log('Não consegui saber se a conta é de administrador:', mensagemDe(falha))
    return falhou()
  }
  if (admin) return erro(ADMINISTRADOR, 403, 'administrador')

  // D-256 (CA-822): até 5 pedidos por hora, contados aqui, depois da senha e do administrador.
  const barrado = await conferirChamadas(deps.banco, dono, 'excluir', agora, deps.log, EXCLUSAO_FALHOU)
  if (barrado) return barrado

  // CB-253 (L4 da revisão): a mesma reserva do pagamento e da troca de cartão. Com um deles em andamento, uma assinatura
  // poderia nascer entre o passo 2 e o 4 sem ninguém cancelar; com a exclusão em andamento, eles esperam.
  const reserva = await deps.exclusao.reservar(dono, new Date(agora.getTime() - RESERVA_VENCE_MS).toISOString())
  if (reserva.tipo === 'ocupada') return erro(EM_ANDAMENTO, 409, 'em-andamento')
  if (reserva.tipo === 'falhou') {
    deps.log('Não consegui reservar a conta para a exclusão:', reserva.mensagem)
    return falhou()
  }
  try {
    return await excluirReservada(quem.conta, deps)
  } finally {
    // Apagado o login, a reserva já saiu junto; soltar de novo não faz nada.
    const naoSoltou = await deps.exclusao.soltarReserva(dono)
    if (naoSoltou) deps.log('Não consegui soltar a reserva da exclusão (ela vence em 5 minutos):', naoSoltou)
  }
}

/** Os passos 2 a 4, com a conta já reservada. */
async function excluirReservada(conta: ContaQuePede, deps: DependenciasDaExclusao): Promise<RespostaDaFuncao> {
  const dono = conta.id
  // Passo 2 (CA-814): a assinatura paga sai da operadora antes de qualquer coisa ser apagada.
  const { linha, falha } = await deps.banco.lerDaConta(dono)
  if (falha) {
    deps.log('Não consegui ler a assinatura da conta:', falha.mensagem)
    return falhou()
  }
  // L5 da revisão: se este pedido cancelou a assinatura, a falha depois diz isso (CA-809), e a tela relê a assinatura.
  let cancelou = false
  if (precisaCancelar(linha)) {
    const cancelamento = await gerenciarAssinatura({ conta, corpo: { acao: 'cancelar' } }, deps)
    if (cancelamento.status === 200) cancelou = true
    // 409: a linha deixou de ser paga entre as duas leituras; não há o que cancelar.
    else if (cancelamento.status !== 409) {
      deps.log('A assinatura não foi cancelada; nada foi apagado. Status:', cancelamento.status)
      if (cancelamento.status === 429) return cancelamento
      // Cancelada lá e não gravada aqui: para a pessoa, a assinatura já foi cancelada.
      return cancelamento.corpo['erro'] === GRAVADA_LA_SO ? falhouCancelada() : falhou()
    }
  }
  const falhouDepois = (): RespostaDaFuncao => (cancelou ? falhouCancelada() : falhou())

  // Passo 3: os comprovantes. Apagado o login, só a chave de serviço os acharia.
  const arquivos = await deps.exclusao.apagarArquivos(dono)
  if (arquivos) {
    deps.log('Não consegui apagar os comprovantes; o login ficou:', arquivos)
    return falhouDepois()
  }

  // Passo 4: o login, e com ele, num passo só, as linhas da conta (013).
  const login = await deps.exclusao.apagarLogin(dono)
  if (login) {
    deps.log('Não consegui apagar o login:', login)
    return falhouDepois()
  }
  return EXCLUIDA
}
