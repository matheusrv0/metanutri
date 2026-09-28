// A volta de fora: o link do e-mail (Supabase) e o fim do pagamento (Mercado Pago).
//
// Os dois devolvem a pessoa para `<site>?volta=<motivo>`, endereço que nós mesmos
// pedimos. Vai na consulta, e não no `#`, por dois motivos: o MetaNutri navega pelo
// `#`, e o Mercado Pago pode descartar o que vem depois dele (spec estilo-spora, R-11).
// O Supabase ainda escreve no `#` o resultado do link: o login ou o erro.
import type { Rota } from './navegacao.ts'

export type TipoVolta = 'confirmacao' | 'recuperacao' | 'pagamento'

export interface Volta {
  readonly tipo: TipoVolta | null
  readonly linkVencido: boolean
}

const TIPOS: readonly string[] = ['confirmacao', 'recuperacao', 'pagamento']

export function lerVolta(search: string, hash: string): Volta {
  const consulta = new URLSearchParams(search.replace(/^\?/, ''))
  // `#/painel` é rota do app; `#access_token=...` ou `#error=...` é o Supabase.
  const fragmento = hash.startsWith('#/') ? new URLSearchParams() : new URLSearchParams(hash.replace(/^#/, ''))

  const pedido = consulta.get('volta') ?? ''
  const tipoDoLink = fragmento.get('type')
  const tipo: TipoVolta | null = TIPOS.includes(pedido)
    ? (pedido as TipoVolta)
    : tipoDoLink === 'recovery'
      ? 'recuperacao'
      : tipoDoLink === 'signup'
        ? 'confirmacao'
        : null

  const linkVencido = fragmento.has('error') || fragmento.has('error_code') || consulta.has('error_code')
  return { tipo, linkVencido }
}

/** A tela onde a pessoa cai. `guardado` é o destino do pós-cadastro (Tarefa 7). */
export function destinoDaVolta(volta: Volta, guardado: Rota | null): Rota {
  if (volta.linkVencido) return volta.tipo === 'recuperacao' ? { tela: 'nova-senha', vencido: true } : { tela: 'confirmar-email', vencido: true }
  if (volta.tipo === 'recuperacao') return { tela: 'nova-senha' }
  if (volta.tipo === 'pagamento') return { tela: 'pagamento' }
  return guardado ?? { tela: 'painel' }
}
