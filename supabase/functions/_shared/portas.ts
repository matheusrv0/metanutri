// O que os núcleos das funções de cobrança recebem de fora (spec cobranca-em-producao, D-88): a
// operadora, o banco, o relógio e o registro. O index.ts de cada função liga os de verdade; os testes,
// os de mentira (src/data/servidorFalsos.test-utils.ts). Só tipos e a forma das respostas: sem Deno e sem rede.
import type { CartaoInformado, CicloDaAssinatura, PlanoAssinavel, StatusDaAssinatura } from './cobranca.ts'

export interface RespostaDaOperadora {
  readonly ok: boolean
  readonly status: number
  /** O corpo, quando é um objeto JSON; senão nulo. */
  readonly dados: Readonly<Record<string, unknown>> | null
}

/** Um pedido à API da operadora. `null` é sem resposta: rede caída ou prazo estourado. */
export type Operadora = (metodo: 'GET' | 'POST' | 'PUT', caminho: string, corpo?: Readonly<Record<string, unknown>>) => Promise<RespostaDaOperadora | null>

export interface FalhaDoBanco {
  readonly mensagem: string
  /** O código do Postgres; '23505' é chave repetida. */
  readonly codigo: string | null
}

export type EncerradaPor = 'pessoa' | 'recusa' | 'operadora'

/** A linha de public.assinaturas, só com as colunas que os núcleos leem. */
export interface LinhaDaAssinatura {
  readonly nutricionista_id: string
  readonly plano: string
  readonly status: string
  readonly ciclo: string | null
  readonly preapproval_id: string | null
  readonly cartao_final: string | null
  readonly proxima_cobranca: string | null
  readonly expira_em: string | null
  readonly ultima_cobranca_paga: string | null
  readonly encerrada_por: string | null
  /** Quando foi encerrada; na recusa, o dia da cobrança recusada (CA-393). */
  readonly encerrada_em: string | null
}

/** A assinatura nova, gravada por cima da linha da conta (upsert). Zera o que era da anterior (D-81). */
export interface NovaAssinatura {
  readonly nutricionista_id: string
  readonly plano: PlanoAssinavel
  readonly status: StatusDaAssinatura
  readonly preapproval_id: string
  readonly valor_centavos: number
  readonly ciclo: CicloDaAssinatura
  readonly expira_em: null
  readonly cartao_bandeira: string | null
  readonly cartao_final: string | null
  readonly proxima_cobranca: string
  readonly ultima_cobranca_paga: null
  readonly encerrada_por: null
  readonly encerrada_em: null
  readonly atualizado_em: string
}

/** O que muda numa linha que já existe. Só vai o que está aqui. */
export interface MudancaDaAssinatura {
  readonly status?: StatusDaAssinatura
  readonly proxima_cobranca?: string
  readonly expira_em?: string | null
  readonly ultima_cobranca_paga?: string
  /** Nulo apaga a anotação da recusa que sobrou (R12): a mensalidade passou antes de o corte pegar. */
  readonly encerrada_por?: EncerradaPor | null
  readonly encerrada_em?: string | null
  readonly cartao_bandeira?: string
  readonly cartao_final?: string
  readonly atualizado_em: string
}

/** Uma linha do registro de avisos (D-84). Sem dado pessoal. */
export interface AvisoAnotado {
  readonly topico: string
  readonly recurso_id: string | null
  /** Nulo: a função está sem o segredo do aviso e não conferiu. */
  readonly assinatura_confere: boolean | null
  readonly resultado: string
}

export interface CartaoDaReserva {
  readonly cartao_bandeira: string | null
  readonly cartao_final: string | null
}

export interface LeituraDaLinha {
  readonly linha: LinhaDaAssinatura | null
  readonly falha: FalhaDoBanco | null
}

/** Quantas recusas de cartão o portão olha (R6). */
export interface RecusasContadas {
  /** As recusas desta conta nas últimas 24 h. */
  readonly daConta24h: number
  /** As recusas desta conta nas últimas 24 h desde o último sucesso (as seguidas). */
  readonly seguidasDaConta: number
  /** As recusas de todas as contas somadas na última hora. */
  readonly doSite1h: number
}

/**
 * As consultas das três funções. Nenhuma lança, exceto `contarRecusas`: sem a contagem, o portão
 * responde 502 e não deixa passar. Nas outras, a falha volta no resultado, como no supabase-js, ou só
 * vai para o registro (anotar e apagar tentativas).
 */
export interface BancoDaCobranca {
  /** A linha da conta (uma por conta). */
  lerDaConta(conta: string): Promise<LeituraDaLinha>
  /** A linha que tem esta assinatura da operadora (`preapproval_id` é único). */
  lerDaOperadora(preapprovalId: string): Promise<LeituraDaLinha>
  /** Upsert pela conta. */
  gravar(nova: NovaAssinatura): Promise<FalhaDoBanco | null>
  /** Só a linha desta conta com esta assinatura; diz quantas linhas mudaram. */
  mudar(conta: string, preapprovalId: string, mudanca: MudancaDaAssinatura): Promise<{ readonly linhas: number; readonly falha: FalhaDoBanco | null }>
  /** Apaga a reserva desta conta feita antes de `antesDe` (função que morreu no meio). */
  soltarReservaVencida(conta: string, antesDe: string): Promise<FalhaDoBanco | null>
  /** Reserva a conta com o cartão do pedido; já reservada volta com o código '23505'. */
  reservar(conta: string, cartao: CartaoInformado): Promise<FalhaDoBanco | null>
  /** O cartão da reserva desta conta, se houver. Falha de leitura conta como "não há". */
  lerReserva(conta: string): Promise<CartaoDaReserva | null>
  soltarReserva(conta: string): Promise<FalhaDoBanco | null>
  anotarAviso(aviso: AvisoAnotado): Promise<FalhaDoBanco | null>
  /** Apaga do registro os avisos recebidos antes de `data` (CA-398). */
  apagarAvisosAntesDe(data: string): Promise<FalhaDoBanco | null>
  /** Conta as recusas de cartão desta conta e do site, olhando para trás a partir de `agora`. Se não conseguir contar, rejeita (o portão responde 502 e não deixa passar). */
  contarRecusas(conta: string, agora: Date): Promise<RecusasContadas>
  /** Anota que a conta tentou um cartão; `recusada` falso é um sucesso e zera as seguidas. Não rejeita: falha só vai para o registro. */
  anotarTentativa(conta: string, recusada: boolean): Promise<void>
  /** Apaga as tentativas feitas antes de `data` (retenção de 7 dias). Não rejeita. */
  apagarTentativasAntesDe(data: Date): Promise<void>
}

/** Quem pede, lido do token da sessão. */
export interface ContaQuePede {
  readonly id: string
  readonly email: string | null
}

/** O registro da função (no Deno, o erro padrão do console). Nunca recebe o código do cartão, o e-mail nem o corpo do pedido. */
export type Registro = (...partes: readonly unknown[]) => void

/** O que assinar e gerenciar-assinatura respondem; o index.ts transforma em Response. */
export interface RespostaDaFuncao {
  readonly status: number
  readonly corpo: Readonly<Record<string, unknown>>
}

export const respostaDeErro = (mensagem: string, status: number, codigo?: string): RespostaDaFuncao => ({
  status,
  corpo: codigo ? { erro: mensagem, codigo } : { erro: mensagem },
})
