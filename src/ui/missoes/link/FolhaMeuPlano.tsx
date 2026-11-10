import { Bell, ChevronRight, Mail, SquarePlus, Trash2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FolhaDoLink } from './FolhaDoLink.tsx'

interface FolhaMeuPlanoProps {
  readonly aberta: boolean
  readonly aoFechar: () => void
  readonly cor: string | null
  /** "Juliana · com Ana Lima"; sem os dois nomes, sem a linha. */
  readonly quem: string | null
  /** "Instalar na tela inicial" some no app instalado (D-1212). */
  readonly aoInstalar: (() => void) | null
  readonly aoReceberPorEmail: () => void
  /** "Avisos por e-mail", com o estado ("2 ligados", "Desligados"); nulo quando a nutricionista não oferece nenhum. */
  readonly avisos: { readonly estado: string; readonly aoAbrir: () => void } | null
  readonly aoEsquecer: () => void
}

function Item({ icone: Icone, texto, estado, aoTocar, perigo = false }: { readonly icone: LucideIcon; readonly texto: string; readonly estado?: string; readonly aoTocar: () => void; readonly perigo?: boolean }) {
  return (
    <li className="border-t border-border first:border-0">
      <button
        type="button"
        onClick={aoTocar}
        className={cn(
          'flex min-h-14 w-full items-center gap-3.5 px-1 text-left text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          perigo ? 'text-errortext' : 'text-heading',
        )}
      >
        <Icone className="size-5.5 shrink-0" aria-hidden="true" strokeWidth={1.8} />
        <span className="min-w-0 flex-1">{texto}</span>
        {estado ? <span className="shrink-0 text-sm font-semibold text-muted-foreground">{estado}</span> : null}
        {perigo ? null : <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </button>
    </li>
  )
}

/**
 * A folha "Meu plano" (D-1212, CA-2219): o nome do paciente e da nutricionista, "Instalar na tela inicial" (fora do app
 * instalado), "Receber meu link por e-mail", "Avisos por e-mail" com o estado e "Esquecer neste aparelho", por último.
 */
export function FolhaMeuPlano({ aberta, aoFechar, cor, quem, aoInstalar, aoReceberPorEmail, avisos, aoEsquecer }: FolhaMeuPlanoProps) {
  return (
    <FolhaDoLink aberta={aberta} aoFechar={aoFechar} titulo="Meu plano" descricao={quem ?? undefined} cor={cor}>
      <ul className="flex flex-col">
        {aoInstalar ? <Item icone={SquarePlus} texto="Instalar na tela inicial" aoTocar={aoInstalar} /> : null}
        <Item icone={Mail} texto="Receber meu link por e-mail" aoTocar={aoReceberPorEmail} />
        {avisos ? <Item icone={Bell} texto="Avisos por e-mail" estado={avisos.estado} aoTocar={avisos.aoAbrir} /> : null}
        <Item icone={Trash2} texto="Esquecer neste aparelho" aoTocar={aoEsquecer} perigo />
      </ul>
    </FolhaDoLink>
  )
}
