import { CircleHelp, X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'
import { LICENCA_CC_BY, textoDoCreditoCdc, type AjudaDaMedida as Ajuda, type CreditoDaImagem, type ImagemDaAjuda } from './ajudas.ts'
import { useAjudaAberta } from './ajudaAberta.ts'

interface AjudaDaMedidaProps {
  /** O nome da medida, no "Como medir: <nome>" do botão e do painel. */
  readonly nome: string
  readonly ajuda: Ajuda
  /** Outro nome para o botão e o painel, como "Como usar a fita". */
  readonly rotulo?: string | undefined
  /**
   * Onde o painel abre em relação ao bloco posicionado mais próximo (quem chama põe `relative` nele). Padrão: logo abaixo
   * da linha do rótulo, alinhado à esquerda. No celular o painel abre sempre embaixo, preso à tela.
   */
  readonly posicao?: string | undefined
}

/** O crédito que a licença pede, sempre visível embaixo da imagem (D-1415; pesquisa 5.1). */
function credito(c: CreditoDaImagem): ReactNode {
  if (c.tipo === 'cdc') return c.antes ? `${c.antes} ${textoDoCreditoCdc(c.ano)}` : textoDoCreditoCdc(c.ano)
  return (
    <>
      {`Foto: ${c.autor}, `}
      <a href={LICENCA_CC_BY.endereco} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
        {LICENCA_CC_BY.rotulo}
      </a>
      .
    </>
  )
}

const ALTURA_DA_PLACA: Readonly<Record<NonNullable<ImagemDaAjuda['altura']>, string>> = { baixa: 'h-30', media: 'h-38', alta: 'h-48' }

/**
 * O "?" de uma medida e a ajuda que ele abre: título, imagem com o crédito embaixo e o texto da técnica (spec
 * antropometria-telas, D-1415). Uma aberta por vez na vista; Esc, "Fechar a ajuda" e tocar fora fecham.
 */
export function AjudaDaMedida({ nome, ajuda, rotulo, posicao = 'left-0 top-8' }: AjudaDaMedidaProps) {
  const id = useId()
  const { aberta, alternar, fechar } = useAjudaAberta(id)
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)
  const nomeDoPainel = rotulo ?? `Como medir: ${nome}`

  useEffect(() => {
    if (!aberta) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      fechar()
      botao.current?.focus()
    }
    const aoTocar = (e: PointerEvent) => {
      const alvo = e.target
      if (!(alvo instanceof Node) || painel.current?.contains(alvo) || botao.current?.contains(alvo)) return
      fechar()
    }
    document.addEventListener('keydown', aoTeclar)
    document.addEventListener('pointerdown', aoTocar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('pointerdown', aoTocar)
    }
  }, [aberta, fechar])

  const { imagem } = ajuda
  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={nomeDoPainel}
        aria-expanded={aberta}
        aria-controls={aberta ? `${id}-ajuda` : undefined}
        onClick={alternar}
        className={cn(
          'inline-grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'max-sm:-m-2.5 max-sm:size-11 sm:pointer-coarse:-m-2.5 sm:pointer-coarse:size-11',
          aberta && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        )}
      >
        <CircleHelp className="size-4" aria-hidden="true" />
      </button>
      {aberta ? (
        <div
          ref={painel}
          id={`${id}-ajuda`}
          role="dialog"
          aria-label={nomeDoPainel}
          className={cn(
            'absolute z-30 grid w-[min(23.75rem,92vw)] gap-2.5 rounded-xl border border-border bg-popover p-3.5 text-left text-sm font-normal text-popover-foreground shadow-pop',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
            'max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-3 max-sm:left-3 max-sm:right-3 max-sm:max-h-[70vh] max-sm:w-auto max-sm:overflow-y-auto',
            posicao,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-heading">{ajuda.titulo}</p>
            <button
              type="button"
              aria-label="Fechar a ajuda"
              onClick={() => {
                fechar()
                botao.current?.focus()
              }}
              className="-mr-1 -mt-1 inline-grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:size-11 sm:pointer-coarse:size-11"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {imagem ? (
            <figure className="m-0 grid gap-1.5">
              <div className={cn('flex items-center justify-center overflow-hidden rounded-md bg-white p-1.5', ALTURA_DA_PLACA[imagem.altura ?? 'alta'])}>
                <span className="relative block h-full max-w-full" style={{ aspectRatio: imagem.proporcao }}>
                  <img src={imagem.src} alt={imagem.alt} loading="lazy" decoding="async" className="absolute inset-0 block size-full object-contain" />
                  {imagem.marca ? (
                    <span aria-hidden="true" className="absolute -ml-3.25 -mt-3.25 size-6.5 rounded-full ring-3 ring-marca" style={{ left: imagem.marca.x, top: imagem.marca.y }} />
                  ) : null}
                </span>
              </div>
              <figcaption className="text-xs leading-snug text-muted-foreground">{credito(imagem.credito)}</figcaption>
            </figure>
          ) : null}
          <p className="text-foreground">{ajuda.texto}</p>
        </div>
      ) : null}
    </>
  )
}
