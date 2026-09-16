import { useEffect, useState, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../componentes/sheet.tsx'
import type { Rota } from '../navegacao.ts'
import { Cabecalho, type PassoTrilha } from './Cabecalho.tsx'
import { MenuLateral, type CasoAtual } from './MenuLateral.tsx'

interface EstruturaProps {
  readonly rota: Rota
  readonly navegar: (rota: Rota) => void
  readonly casoAtual: CasoAtual | null
  readonly aoNovoCaso: () => void
  readonly titulo: string
  readonly subtitulo?: string | undefined
  readonly trilha?: readonly PassoTrilha[] | undefined
  readonly acoes?: ReactNode
  readonly children: ReactNode
}

/** Layout do MaterialM: menu lateral fixo de 270 px (gaveta abaixo de 1280 px), cabeçalho e conteúdo em até 1400 px. */
export function Estrutura({ rota, navegar, casoAtual, aoNovoCaso, titulo, subtitulo, trilha, acoes, children }: EstruturaProps) {
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    document.title = `${titulo} · MetaNutri`
  }, [titulo])

  const fecharMenu = () => setMenuAberto(false)

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#conteudo"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('conteudo')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] xl:block">
        <MenuLateral rota={rota} navegar={navegar} casoAtual={casoAtual} aoNovoCaso={aoNovoCaso} />
      </aside>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="w-[280px] border-none p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal do MetaNutri</SheetDescription>
          <MenuLateral rota={rota} navegar={navegar} casoAtual={casoAtual} aoNovoCaso={aoNovoCaso} aoEscolher={fecharMenu} />
        </SheetContent>
      </Sheet>

      <div className="xl:pl-[264px]">
        <Cabecalho titulo={titulo} subtitulo={subtitulo} trilha={trilha} acoes={acoes} aoAbrirMenu={() => setMenuAberto(true)} />
        <main id="conteudo" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-6 focus:outline-none sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
