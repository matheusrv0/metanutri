import type { ReactNode } from 'react'
import type { Verificacao } from './usarVerificacao.ts'

interface VerificacaoContraRobosProps {
  readonly verificacao: Verificacao
  /** O botão que leva a verificação: ela fica logo acima dele (CA-462). */
  readonly children: ReactNode
}

/**
 * O lugar da verificação contra robôs, logo acima do botão (spec seguranca-lote-3, D-114). Enquanto o
 * Cloudflare confere sozinho, a caixa tem altura zero e não empurra nada; quando ele pede um clique, ela
 * abre. Sem a chave (CA-463) ou sem o script (D-119), só o botão: a tela fica limpa, e a frase do CA-461
 * só aparece se o servidor recusar o pedido.
 */
export function VerificacaoContraRobos({ verificacao, children }: VerificacaoContraRobosProps) {
  // Desmontado aqui de propósito: lido como `verificacao.visivel` ao lado de `ref={verificacao.container}`,
  // a regra `react-hooks/refs` toma o objeto todo por ref e recusa a leitura durante a renderização.
  const { ligada, visivel, naoCarregou, container } = verificacao
  if (!ligada || naoCarregou) return <>{children}</>
  return (
    <div className="flex flex-col">
      <div ref={container} aria-hidden={visivel ? undefined : true} className={visivel ? 'mb-4 w-full' : 'h-0 w-full overflow-hidden'} />
      {children}
    </div>
  )
}
