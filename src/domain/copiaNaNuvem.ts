// Cópia dos dados na nuvem, para trocar de aparelho sem passar arquivo.
//
// Não é sincronização automática, e isso é decisão, não preguiça: mesclar dois
// aparelhos por conta própria é como se perde plano de paciente. Aqui quem manda é
// o botão, e a tela sempre diz o que vai ser sobrescrito.
import { COPIA_GRANDE_DEMAIS, FALHA_DE_REDE, mensagemDoBanco } from '@/ui/estado/mensagemDoBanco.ts'
import type { Backup } from './perfil.ts'

interface Resposta<T> {
  readonly data: T | null
  readonly error: { readonly message: string; readonly code?: string } | null
  /** O status HTTP. O servidor pode recusar a cópia grande antes de ela chegar ao banco (413). */
  readonly status?: number
}

/** D-98: a tela recebe a frase traduzida, nunca o texto técnico do banco. */
const traduzido = (erro: { readonly message: string; readonly code?: string }): string => mensagemDoBanco(erro) ?? FALHA_DE_REDE

export interface ClienteCopia {
  from(tabela: string): {
    upsert(linha: Record<string, unknown>, opcoes?: { onConflict?: string }): PromiseLike<Resposta<unknown>>
    select(colunas: string): { eq(coluna: string, valor: string): { maybeSingle(): PromiseLike<Resposta<unknown>> } }
    delete(): { eq(coluna: string, valor: string): PromiseLike<Resposta<unknown>> }
  }
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null } }>
  }
}

const TABELA = 'copias'

export const SEM_CONTA = 'Entre na sua conta para guardar os dados na nuvem.'

export interface CopiaGuardada {
  readonly backup: Backup
  readonly atualizadoEm: string
  readonly aparelho: string
}

export interface Resultado<T> {
  readonly ok: T | null
  readonly erro: string | null
}

function ehBackup(v: unknown): v is Backup {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Partial<Backup>
  return o.formato === 1 && typeof o.geradoEm === 'string' && typeof o.dados === 'object' && o.dados !== null
}

/** Nome curto do aparelho, só para a pessoa reconhecer de onde veio a cópia. */
export function apelidoDoAparelho(agente: string): string {
  if (/android/i.test(agente)) return 'Celular Android'
  if (/iphone|ipad|ipod/i.test(agente)) return 'iPhone ou iPad'
  if (/macintosh|mac os/i.test(agente)) return 'Mac'
  if (/windows/i.test(agente)) return 'Windows'
  if (/linux/i.test(agente)) return 'Linux'
  return 'Este aparelho'
}

/**
 * A sessão é de outra conta que não a esperada (spec dados-por-conta, DP-19 e CA-474): a cópia de
 * uma conta nunca vai para a outra, nem a de outra vem para esta. Sem conta esperada, vale a da sessão.
 */
const deOutraConta = (usuario: string, esperado: string | null | undefined): boolean => esperado !== undefined && esperado !== null && usuario !== esperado

export async function enviarCopia(cliente: ClienteCopia, backup: Backup, aparelho: string, esperado?: string | null): Promise<Resultado<string>> {
  const { data } = await cliente.auth.getSession()
  const usuario = data.session?.user.id ?? null
  if (usuario === null) return { ok: null, erro: SEM_CONTA }
  if (deOutraConta(usuario, esperado)) return { ok: null, erro: FALHA_DE_REDE }

  const agora = new Date().toISOString()
  const { error, status } = await cliente
    .from(TABELA)
    .upsert({ nutricionista_id: usuario, dados: backup, aparelho, atualizado_em: agora }, { onConflict: 'nutricionista_id' })

  if (!error) return { ok: agora, erro: null }
  // R-41: o servidor pode recusar o pedido grande antes de ele chegar ao banco; a frase é a mesma da trava (CA-445).
  return { ok: null, erro: status === 413 ? COPIA_GRANDE_DEMAIS : traduzido(error) }
}

export async function baixarCopia(cliente: ClienteCopia, esperado?: string | null): Promise<Resultado<CopiaGuardada>> {
  const { data } = await cliente.auth.getSession()
  const usuario = data.session?.user.id ?? null
  if (usuario === null) return { ok: null, erro: SEM_CONTA }
  if (deOutraConta(usuario, esperado)) return { ok: null, erro: FALHA_DE_REDE }

  const { data: linha, error } = await cliente.from(TABELA).select('dados, aparelho, atualizado_em').eq('nutricionista_id', usuario).maybeSingle()
  if (error) return { ok: null, erro: traduzido(error) }
  if (linha === null) return { ok: null, erro: 'Ainda não existe cópia na nuvem desta conta.' }

  const o = linha as Record<string, unknown>
  if (!ehBackup(o['dados'])) return { ok: null, erro: 'A cópia na nuvem está num formato que este MetaNutri não entende.' }

  return {
    ok: {
      backup: o['dados'],
      atualizadoEm: typeof o['atualizado_em'] === 'string' ? o['atualizado_em'] : '',
      aparelho: typeof o['aparelho'] === 'string' ? o['aparelho'] : '',
    },
    erro: null,
  }
}

/**
 * D-94: "Apagar tudo" leva também a cópia completa da conta. Devolve a mensagem de erro já
 * traduzida, ou nulo quando deu certo (ou quando não há conta, e portanto nada a apagar).
 */
export async function apagarCopiaDaNuvem(cliente: ClienteCopia, esperado?: string | null): Promise<string | null> {
  const { data } = await cliente.auth.getSession()
  const usuario = data.session?.user.id ?? null
  // Servidor ligado e sem sessão (token vencido sem internet), ou sessão de outra conta: nada foi
  // apagado, e a tela precisa saber.
  if (usuario === null || deOutraConta(usuario, esperado)) return FALHA_DE_REDE

  const { error } = await cliente.from(TABELA).delete().eq('nutricionista_id', usuario)
  return error ? traduzido(error) : null
}
