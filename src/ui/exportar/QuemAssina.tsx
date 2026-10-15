import type { AssinaturaDaFolha } from '@/domain/folhaDieta.ts'

/** Quem assina, no topo da folha, à direita (CA-313). Saiu da `FolhaDieta` para servir também às folhas do paciente. */
export function QuemAssina({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  if (assinatura.tipo === 'vazia') return null
  if (assinatura.tipo === 'nutricionista') {
    return (
      <div className="text-right">
        <p className="text-base font-semibold text-heading">{assinatura.linha || 'Nutricionista'}</p>
        {assinatura.linha ? <p className="text-muted-foreground">Nutricionista</p> : null}
      </div>
    )
  }
  return (
    <div className="text-right">
      {assinatura.estagiario ? (
        <p>
          <span className="text-muted-foreground">Estagiário(a): </span>
          <span className="font-semibold text-heading">{assinatura.estagiario}</span>
        </p>
      ) : null}
      {assinatura.preceptor ? (
        <p>
          <span className="text-muted-foreground">Preceptor(a): </span>
          <span className="font-semibold text-heading">{assinatura.preceptor}</span>
        </p>
      ) : null}
    </div>
  )
}
