import { useId, useMemo, type ReactNode } from 'react'
import { avaliarCor, codigoDaCor } from '@/domain/corDaMarca.ts'
import type { MarcaDoLink } from '@/domain/marca.ts'
import { cn } from '@/lib/utils'
import { LinkDoPaciente, type TemaDaPrevia } from '../missoes/LinkDoPaciente.tsx'
import { linkDeExemplo } from './exemploDoLink.ts'

/*
 * A prévia de "Sua marca" (spec marca-no-link, D-950 e DP-ML-15): o link de verdade (`LinkDoPaciente`), com a paciente
 * de exemplo, num celular claro e num escuro, lado a lado; no celular, um embaixo do outro (CA-1981). A tela do
 * aparelho tem 360 px, a largura de um celular, desenhada a 80% (`zoom`). Ela é `inert` e `aria-hidden`: o Tab e o leitor
 * de tela não passam pelas missões de mentira; a legenda diz qual celular é e, com cor, o código que ele usa.
 */
const SEM_RETORNO = () => undefined

/** React 18 não conhece `inert`; o atributo vai como texto, e o navegador o entende. */
const INERTE = { inert: '' } as Record<string, string>

function Celular({ tema, legenda, codigo, children }: { readonly tema: TemaDaPrevia; readonly legenda: string; readonly codigo: string | null; readonly children: ReactNode }) {
  const id = useId()
  return (
    <figure aria-labelledby={id} className="m-0 flex min-w-0 flex-col items-center gap-3">
      <div className="w-77 max-w-full rounded-[2.5rem] border border-previacelularborda bg-previacelular p-2.5 shadow-raised">
        <div aria-hidden="true" {...INERTE} className={cn('overflow-hidden rounded-[2rem] bg-background', tema === 'escuro' ? 'dark' : 'tema-claro')}>
          <div className="w-90 select-none [zoom:0.8]">
            <div className="flex h-9 items-center justify-between px-7 text-xs font-bold text-heading">
              <span className="numeros">9:41</span>
              <span className="h-5 w-19 rounded-full bg-previacelular" />
              <span>5G</span>
            </div>
            {children}
          </div>
        </div>
      </div>
      <figcaption id={id} className="text-sm text-muted-foreground">
        {legenda}
        {codigo ? <span className="numeros text-foreground">{` · ${codigoDaCor(codigo)}`}</span> : null}
      </figcaption>
    </figure>
  )
}

interface PreviaDoLinkProps {
  readonly marca: MarcaDoLink
  /** O dia da paciente de exemplo (o de hoje, na tela). */
  readonly hoje: string
  readonly className?: string
}

export function PreviaDoLink({ marca, hoje, className }: PreviaDoLinkProps) {
  const exemplo = useMemo(() => linkDeExemplo(hoje), [hoje])
  const escuro = marca.cor ? avaliarCor(marca.cor).escuro : null
  return (
    <section aria-label="Prévia do link do paciente" className={cn('flex flex-wrap items-start justify-center gap-x-7 gap-y-8', className)}>
      {(['claro', 'escuro'] as const).map((tema) => (
        <Celular key={tema} tema={tema} legenda={tema === 'claro' ? 'Celular claro' : 'Celular escuro'} codigo={tema === 'claro' ? marca.cor : escuro}>
          <LinkDoPaciente acompanhamento={exemplo} marca={marca} hoje={hoje} naoSalvou={null} aoAlternar={SEM_RETORNO} previa={tema} />
        </Celular>
      ))}
    </section>
  )
}
