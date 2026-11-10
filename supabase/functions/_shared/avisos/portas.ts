// O que os núcleos das funções de e-mail recebem de fora (spec lado-do-paciente, seção 3 do PLAN): o banco, o envio, o
// relógio e o registro. O index.ts de cada função liga os de verdade (o banco em bancoDosAvisosSupabase.ts, o Resend em
// resend.ts); os testes, os de mentira. Só tipos: sem Deno e sem rede.
//
// As tabelas e as colunas são as do supabase/017-lado-do-paciente.sql (seção 3.1 do PLAN).
import type { MarcacaoDia } from '../adesao.ts'
import type { Contagem, Tetos } from './tetos.ts'
import type { TipoDeAviso, TipoDeEmail } from './tipos.ts'

/** O link do paciente (`acompanhamentos`), só com o que os e-mails usam. */
export interface LinkDoBanco {
  readonly id: string
  readonly nutricionistaId: string
  readonly token: string
  /** O nome do plano ("Juliana Martins, 34 anos"): o e-mail usa só o primeiro nome. */
  readonly nome: string
  readonly criadoEm: string
  /** Quando as missões, a dieta ou o plano mudaram (ISO). */
  readonly planoEm: string | null
  /** O dia (AAAA-MM-DD) em que o paciente abriu o link por último. */
  readonly ultimoAcesso: string | null
  /** O A1 agendado (ISO). */
  readonly a1Para: string | null
  readonly substituidoPor: string | null
  /** Conta de estudante: o e-mail diz "Estágio de nutrição, sob supervisão" (CA-2258). */
  readonly usoNaoComercial: boolean
  readonly marcacoes: readonly MarcacaoDia[]
  /** Quantas missões o link tem (a célula do resumo diz "3/4"). */
  readonly missoes: number
}

export type Ofertas = Readonly<Record<TipoDeAviso, boolean>>

/** O e-mail do link e as ofertas (`emails_dos_links`). */
export interface EmailDoLink {
  readonly linkId: string
  readonly nutricionistaId: string
  readonly email: string | null
  readonly emailHash: string | null
  readonly origem: 'ficha' | 'paciente' | null
  /** O e-mail que a nutricionista registrou na ficha (D-1248: o S4 só vai para ele). */
  readonly emailFicha: string | null
  /** Quando o paciente confirmou o e-mail que deu no link (D-1247); nulo no da ficha. */
  readonly confirmadoEm: string | null
  readonly ofertas: Ofertas
  readonly parouTudoEm: string | null
  readonly conviteEm: string | null
}

/** Um aceite (`aceites`). */
export interface AceiteDoBanco {
  readonly id: number
  readonly linkId: string | null
  readonly nutricionistaId: string
  readonly tipo: TipoDeAviso
  readonly emailHash: string
  readonly aceitoEm: string
  readonly diaDaSemana: number
  readonly saiuEm: string | null
  readonly pausadoEm: string | null
}

/** O que a chave de uma página tira ou pede. */
export type AvisoDaChave = TipoDeAviso | 's2' | 'todos' | 'n1'

/** O que desfazer guarda, para voltar como estava (D-1235). */
export interface Desfazer {
  /** Os aceites que saíram com este toque. */
  readonly aceites: readonly number[]
  /** O "parar todos" de antes (nulo: não estava parado). */
  readonly parouTudoAntes: string | null
  /** O N1 estava ligado antes. */
  readonly resumoAntes?: boolean
}

/** Uma chave das páginas (`chaves_de_aviso`, DP-LP-20). */
export interface ChaveDeAviso {
  readonly chave: string
  readonly linkId: string | null
  readonly nutricionistaId: string
  readonly tipo: 'aceite' | 'sair'
  readonly avisos: readonly AvisoDaChave[]
  readonly emailHash: string | null
  /**
   * D-1247 (DP-LP-34): o e-mail que o paciente digitou no link, normalizado, à espera do "Confirmar" (só na chave do
   * aceite). Nulo: a chave é do e-mail que o link já tem.
   */
  readonly email: string | null
  readonly criadoEm: string
  readonly venceEm: string | null
  readonly usadoEm: string | null
  readonly desfazer: Desfazer | null
}

export type EstadoDoEnvio = 'enviado' | 'entregue' | 'devolvido' | 'devolucao-temporaria' | 'queixa' | 'adiado' | 'pausado' | 'falhou'

/** Os estados de um e-mail que saiu (os outros não saíram). */
export const SAIRAM: readonly EstadoDoEnvio[] = ['enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa']

/** Um envio (`envios`). */
export interface EnvioDoBanco {
  readonly linkId: string | null
  readonly nutricionistaId: string
  readonly tipo: TipoDeEmail
  readonly emailHash: string
  readonly estado: EstadoDoEnvio
  readonly resendId: string | null
  readonly chaveUnica: string | null
  /** O dia de Brasília (AAAA-MM-DD). */
  readonly dia: string
  readonly extra: Readonly<Record<string, unknown>> | null
  readonly criadoEm: string
}

export interface NovoEnvio {
  readonly linkId: string | null
  readonly nutricionistaId: string
  readonly tipo: TipoDeEmail
  readonly emailHash: string
  readonly assunto: string
  readonly estado: 'enviado' | 'adiado' | 'pausado'
  readonly chaveUnica: string
  readonly dia: string
  readonly contaNoTeto: boolean
  readonly extra: Readonly<Record<string, unknown>> | null
}

/** A nutricionista, como os e-mails a mostram (D-1225, DP-LP-8). */
export interface DadosDaNutricionista {
  readonly id: string
  /** `config_de_emails.nome`, senão `perfis.nome`; vazio sem nenhum. */
  readonly nome: string
  /** `config_de_emails.responder_para`. */
  readonly responderPara: string | null
  /** O e-mail da conta (o resumo da adesão vai para ele; e é a resposta quando o Perfil não tem e-mail). */
  readonly emailDaConta: string | null
  readonly estudante: boolean
  readonly crnRegiao: number | null
  readonly crnNumero: string | null
  /** A cor publicada em "Sua marca" (`marcas.cor`). */
  readonly cor: string | null
  readonly resumoDaAdesao: boolean
  readonly oferecerAosNovos: boolean
}

/** As contas da devolução e da queixa dos últimos 7 dias (D-1239). */
export interface Taxas {
  readonly envios: number
  readonly devolvidos: number
  readonly queixas: number
}

/**
 * O banco dos e-mails. Nenhuma consulta engole erro: falha do banco rejeita, e o núcleo responde 502 (ou deixa para a
 * próxima rodada), nunca finge que deu certo.
 */
export interface BancoDosAvisos {
  // ---- Os links ----
  /** O link pelo token; o token antigo de um paciente devolve o fixo (DP-LP-5). */
  linkPorToken(token: string): Promise<LinkDoBanco | null>
  linksPorIds(ids: readonly string[]): Promise<readonly LinkDoBanco[]>
  /** Os links que contam (sem os substituídos) de uma conta: o resumo da adesão (D-1231). */
  linksDaConta(nutricionistaId: string): Promise<readonly LinkDoBanco[]>
  /** As contas com algum link que conta. */
  contasComLinks(): Promise<readonly string[]>
  /** Os links com o A1 vencido até `ate`. */
  linksComA1Vencido(ate: Date): Promise<readonly LinkDoBanco[]>
  agendarA1(linkId: string, quando: Date | null): Promise<void>

  // ---- O e-mail do link ----
  emailDoLink(linkId: string): Promise<EmailDoLink | null>
  emailsDosLinks(ids: readonly string[]): Promise<readonly EmailDoLink[]>
  /** Os links com este endereço (a recuperação, D-1220): só o e-mail da ficha ou o confirmado pelo paciente (D-1247). */
  emailsPorHash(emailHash: string): Promise<readonly EmailDoLink[]>
  /**
   * O e-mail que o paciente confirmou no link (D-1247): cria a linha, se faltar, com as ofertas padrão da conta; troca o
   * endereço, a origem vira "paciente", com a data da confirmação, e o aceite do endereço antigo deixa de valer
   * (CA-2257).
   */
  gravarEmailDoPaciente(link: LinkDoBanco, email: string, emailHash: string, ofertasPadrao: boolean, confirmadoEm: Date): Promise<void>
  marcarConfirmado(linkId: string, quando: Date): Promise<void>
  marcarConvite(linkId: string, quando: Date): Promise<void>
  /** "Parar todos os e-mails deste plano" (CA-2254); nulo desfaz. */
  pararTudo(linkId: string, quando: string | null): Promise<void>

  // ---- Os aceites ----
  aceitesDoLink(linkId: string): Promise<readonly AceiteDoBanco[]>
  /** Os aceites sem descadastro, com link. */
  aceitesAtivos(): Promise<readonly AceiteDoBanco[]>
  /** Cria o aceite, se não houver um ativo igual (link, tipo e endereço). */
  criarAceite(aceite: Omit<AceiteDoBanco, 'id' | 'saiuEm' | 'pausadoEm'>): Promise<void>
  sairDosAceites(ids: readonly number[], quando: Date): Promise<void>
  /** "Desfazer": os aceites voltam sem novo S3 (CA-2253). */
  voltarAosAceites(ids: readonly number[]): Promise<void>
  /** D-1229: o resumo pausado (com a data) ou de volta (nulo). */
  pausarResumo(aceiteId: number, quando: Date | null): Promise<void>
  /** O resumo da adesão da conta (o N1) ligado ou desligado. */
  definirResumoDaAdesao(nutricionistaId: string, ligado: boolean): Promise<void>

  // ---- As chaves das páginas ----
  criarChave(chave: Omit<ChaveDeAviso, 'usadoEm' | 'desfazer' | 'criadoEm'> & { readonly criadoEm: Date }): Promise<void>
  /** A chave de descadastro de um link e de um aviso (uma só, sem prazo); com `criar`, ela nasce se faltar. */
  chaveDeSair(linkId: string | null, nutricionistaId: string, aviso: AvisoDaChave): Promise<string | null>
  lerChave(chave: string): Promise<ChaveDeAviso | null>
  /** A chave de um pedido que não saiu (D-1247: o pedido que falhou não muda nada). */
  apagarChave(chave: string): Promise<void>
  marcarChave(chave: string, mudanca: { readonly usadoEm: Date | null; readonly desfazer: Desfazer | null }): Promise<void>

  // ---- Os envios ----
  /** Os envios dos links, ou dos endereços, desde a data. */
  enviosDosLinks(linkIds: readonly string[], desde: Date): Promise<readonly EnvioDoBanco[]>
  enviosDosEnderecos(emailHashes: readonly string[], desde: Date): Promise<readonly EnvioDoBanco[]>
  /** O que já saiu no dia e no mês do teto (UTC), só o que conta no teto. */
  contarEnvios(inicioDoDia: Date, inicioDoMes: Date): Promise<Contagem>
  /**
   * Grava os envios antes de mandar (DP-LP-13). Devolve as chaves únicas que ficaram com quem chamou: as novas e as que
   * estavam adiadas ou pausadas (que este envio retoma). A chave que já saiu não volta: o e-mail não sai duas vezes.
   */
  registrarEnvios(novos: readonly NovoEnvio[]): Promise<readonly string[]>
  marcarEnvio(chaveUnica: string, mudanca: { readonly estado: EstadoDoEnvio; readonly resendId?: string | null }): Promise<void>
  apagarEnvios(chavesUnicas: readonly string[]): Promise<void>
  envioPorResendId(resendId: string): Promise<EnvioDoBanco | null>
  mudarEstadoPeloResend(resendId: string, estado: EstadoDoEnvio): Promise<void>
  contarDevolucoesTemporarias(emailHash: string, desde: Date): Promise<number>
  taxasDesde(desde: Date): Promise<Taxas>

  // ---- A supressão e a pausa ----
  suprimidos(emailHashes: readonly string[]): Promise<ReadonlyMap<string, 'devolvido' | 'queixa'>>
  suprimir(emailHash: string, motivo: 'devolvido' | 'queixa'): Promise<void>
  estadoDosAvisos(): Promise<{ readonly pausadoEm: string | null; readonly motivo: string | null }>
  pausarAvisos(motivo: string, quando: Date): Promise<void>
  gravarTetos(tetos: Tetos): Promise<void>

  // ---- Os limites e a conta ----
  /** Conta e anota num passo (`anotar_limite`): verdadeiro, coube e foi anotado. */
  anotarLimite(chave: string, limite: number, desde: Date): Promise<boolean>
  /** Tira a anotação mais nova da chave (`devolver_limite`): o pedido que não saiu não conta (CA-2292). */
  devolverLimite(chave: string): Promise<void>
  nutricionista(id: string): Promise<DadosDaNutricionista | null>
  /** A chave do cofre do agendamento (`conferir_chave_dos_avisos`). */
  chaveDaRodadaConfere(chave: string): Promise<boolean>
}

/** O registro da função. Nunca recebe e-mail, nome, token nem corpo de pedido. */
export type Registro = (...partes: readonly unknown[]) => void

export interface RespostaDaFuncao {
  readonly status: number
  readonly corpo: Readonly<Record<string, unknown>>
}
