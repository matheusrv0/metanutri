import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AuroraBackground } from '../componentes/aurora-background.tsx'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'painel'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
  /** Menos estrelas em página longa, para não pesar a rolagem. */
  readonly estrelas?: number
}

const LINKS: readonly { readonly destino: DestinoPublico; readonly texto: string }[] = [
  { destino: 'inicio', texto: 'Início' },
  { destino: 'precos', texto: 'Preços' },
]

/** Moldura das telas públicas: fundo escuro animado, topo enxuto, sem menu lateral. */
export function MolduraPublica({ atual, aoIrPara, children, estrelas = 40 }: MolduraPublicaProps) {
  return (
    // O verde da marca é escuro demais sobre fundo escuro: dentro da área pública
    // o mesmo token aponta para a versão clara, então `text-primary` funciona nos dois temas.
    <AuroraBackground estrelas={estrelas} className="min-h-dvh [--color-primary:#59b877] [--color-primary-foreground:#0a1f12]">
      <header className="sticky top-0 z-30 border-b border-lombadafio bg-lombada/70 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 sm:px-8">
          <button
            type="button"
            onClick={() => aoIrPara('inicio')}
            className="flex flex-col rounded-xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span className="font-titulo text-lg font-bold tracking-[0.12em] text-lombadatexto">METANUTRI</span>
            <span className="rotulo text-lombadafraca">Planejador alimentar</span>
          </button>

          <nav aria-label="Seções" className="ml-auto hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => (
              <button
                key={link.destino}
                type="button"
                onClick={() => aoIrPara(link.destino)}
                aria-current={atual === link.destino ? 'page' : undefined}
                className={cn(
                  'rounded-xs px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                  atual === link.destino ? 'text-lombadatexto' : 'text-lombadafraca hover:text-lombadatexto',
                )}
              >
                {link.texto}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button
              type="button"
              onClick={() => aoIrPara('entrar')}
              className="rounded-xs px-3 py-2 text-sm font-medium text-lombadafraca transition-colors hover:text-lombadatexto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => aoIrPara('painel')}
              className="inline-flex h-10 items-center gap-2 rounded-xs bg-lombadatexto px-4 text-sm font-semibold text-lombada transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Abrir o sistema
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo">{children}</main>

      <footer className="border-t border-lombadafio px-4 py-8 text-center text-xs text-lombadafraca sm:px-8">
        <p>MetaNutri · Documento de apoio ao planejamento. A prescrição é responsabilidade do nutricionista (Lei 8.234/1991).</p>
        <p className="mt-1">Dados calculados a partir de TACO, POF/IBGE, DRI do NASEM, OMS e SISVAN.</p>
      </footer>
    </AuroraBackground>
  )
}
