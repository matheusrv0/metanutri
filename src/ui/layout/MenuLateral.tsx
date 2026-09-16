import { BookOpen, ClipboardList, FolderOpen, HardDrive, Leaf, Plus, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../componentes/button.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import type { Rota } from '../navegacao.ts'
import { ItemMenu } from './ItemMenu.tsx'
import { SeletorTema } from './SeletorTema.tsx'

export interface CasoAtual {
  readonly id: string
  readonly nome: string
}

interface MenuLateralProps {
  readonly rota: Rota
  /** Caso aberto agora ou o último alterado; `null` quando não há casos. */
  readonly casoAtual: CasoAtual | null
  readonly navegar: (rota: Rota) => void
  readonly aoNovoCaso: () => void
  readonly aoEscolher?: () => void
}

function Secao({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-4 pb-1 text-xs font-bold uppercase tracking-wider text-charcoal">{titulo}</p>
      {children}
    </div>
  )
}

/**
 * Menu em três blocos, do mais usado ao menos usado:
 * ação principal (Novo caso) · trabalho (Meus casos e o caso atual) · consulta (Fontes científicas).
 * O rodapé mostra onde os dados ficam e a aparência.
 */
export function MenuLateral({ rota, casoAtual, navegar, aoNovoCaso, aoEscolher }: MenuLateralProps) {
  const { casos, avisoArmazenamento } = useCasos()
  const ir = (r: Rota) => {
    navegar(r)
    aoEscolher?.()
  }

  return (
    <nav aria-label="Menu principal" className="flex h-full flex-col bg-card">
      <div className="flex h-[70px] shrink-0 items-center gap-2 px-6">
        <span className="flex size-9 items-center justify-center rounded-full bg-lightprimary text-primary">
          <Leaf className="size-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-bold tracking-tight text-heading">MetaNutri</span>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
        <Button
          className="w-full"
          onClick={() => {
            aoNovoCaso()
            aoEscolher?.()
          }}
        >
          <Plus aria-hidden="true" />
          Novo caso
        </Button>

        <Secao titulo="Trabalho">
          <ItemMenu
            icone={<FolderOpen aria-hidden="true" />}
            rotulo="Meus casos"
            ativo={rota.tela === 'casos'}
            aoClicar={() => ir({ tela: 'casos' })}
            extra={
              casos.length > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {casos.length}
                  <span className="sr-only"> {casos.length === 1 ? 'caso' : 'casos'}</span>
                </span>
              ) : null
            }
          />
          {casoAtual ? (
            <ItemMenu
              icone={<ClipboardList aria-hidden="true" />}
              rotulo={rota.tela === 'planejador' ? 'Caso aberto' : 'Continuar caso'}
              detalhe={casoAtual.nome || 'Caso sem nome'}
              ativo={rota.tela === 'planejador'}
              aoClicar={() => ir({ tela: 'planejador', casoId: casoAtual.id, aba: rota.tela === 'planejador' ? rota.aba : 'caso' })}
            />
          ) : null}
        </Secao>

        <Secao titulo="Consulta">
          <ItemMenu icone={<BookOpen aria-hidden="true" />} rotulo="Fontes científicas" ativo={rota.tela === 'fontes'} aoClicar={() => ir({ tela: 'fontes' })} />
        </Secao>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-4">
        {avisoArmazenamento ? (
          <p role="status" className="flex items-start gap-2 px-2 text-xs text-warningtext">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {avisoArmazenamento}
          </p>
        ) : (
          <p className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <HardDrive className="size-4 shrink-0" aria-hidden="true" />
            Casos salvos só neste aparelho
          </p>
        )}
        <SeletorTema />
      </div>
    </nav>
  )
}
