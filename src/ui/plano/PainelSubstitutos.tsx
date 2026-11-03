import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { PorcaoDoSubstituto } from '@/domain/buscaDeSubstitutos.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { medidaNaLinha } from '@/domain/medidaDoItem.ts'
import type { Alimento, ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { cardVariants } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'
import { useRestricoesDoPlano } from '../estado/contextoRestricoes.ts'
import { BuscaDeSubstitutos } from './BuscaDeSubstitutos.tsx'
import { CalculadoraDeSubstituto } from './CalculadoraDeSubstituto.tsx'

type Modo = 'buscar' | 'manual'

interface PainelSubstitutosProps {
  readonly item: ItemPlano
  readonly alimento: Alimento
  /** O nome da refeição do item ("Almoço"). */
  readonly refeicao: string
  /** Tela larga: ao lado das refeições; senão, gaveta de baixo (D-1116). */
  readonly aoLado: boolean
  readonly aoAdicionarOpcao: (escolha: PorcaoDoSubstituto) => void
  readonly aoSubstituir: (escolha: PorcaoDoSubstituto) => void
  readonly aoFechar: () => void
}

/**
 * O painel de substitutos de um item do plano (spec busca-substitutos, D-1100, D-1101 e D-1116): "Buscar substitutos"
 * (o padrão) ou "Adicionar manualmente" (a calculadora de hoje). Em tela larga, fica ao lado das refeições, preso ao
 * rolar; abaixo disso, sobe numa gaveta, como a ficha da Tabela de alimentos.
 */
export function PainelSubstitutos({ item, alimento, refeicao, aoLado, aoAdicionarOpcao, aoSubstituir, aoFechar }: PainelSubstitutosProps) {
  const [modo, setModo] = useState<Modo>('buscar')
  const restricoes = useRestricoesDoPlano()
  const idTitulo = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  const medida = medidaNaLinha(item)
  const porcao = [medida?.texto, `${formatarNumero(item.gramas, 0)} ${unidadeDo(alimento)}`, refeicao.toLowerCase()].filter(Boolean).join(' · ')
  const nomeDoTitulo = `Substitutos de ${alimento.descricao}`

  // Ao lado (sem foco preso), o foco vai para o título quando o painel abre ou troca de item: o teclado continua dali.
  useEffect(() => {
    if (aoLado) titulo.current?.focus()
  }, [aoLado, item.id])

  const corpo = (
    <div className="flex flex-col gap-4">
      <SeletorSegmentado<Modo>
        rotulo="Modo"
        opcoes={[
          { valor: 'buscar', rotulo: 'Buscar substitutos' },
          { valor: 'manual', rotulo: 'Adicionar manualmente' },
        ]}
        valor={modo}
        aoEscolher={setModo}
        className="grid w-full grid-cols-2 [&>button]:justify-center [&>button]:whitespace-nowrap [&>button]:px-1.5 [&>button]:text-xs sm:[&>button]:px-2 sm:[&>button]:text-[0.8125rem]"
      />
      {/* Um estado por item: trocar de item recomeça a busca do macro dele. */}
      {modo === 'buscar' ? (
        <BuscaDeSubstitutos
          key={`${item.id}-${item.alimentoId}`}
          item={item}
          alimento={alimento}
          restricoes={restricoes}
          aoAdicionarOpcao={aoAdicionarOpcao}
          aoSubstituir={aoSubstituir}
        />
      ) : (
        <CalculadoraDeSubstituto
          key={`${item.id}-${item.alimentoId}`}
          item={item}
          alimento={alimento}
          aoAdicionarOpcao={aoAdicionarOpcao}
          aoSubstituir={aoSubstituir}
        />
      )}
    </div>
  )

  if (!aoLado) {
    return (
      <Sheet open onOpenChange={(aberto) => !aberto && aoFechar()}>
        <SheetContent side="bottom" className="gap-0 p-0">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
            {/* O "Fechar" tem 44 px no celular (D-246): o título termina antes dele, com folga. */}
            <div className="flex flex-col gap-1 pr-8 max-sm:pr-11">
              <SheetTitle className="line-clamp-2 break-words text-base leading-snug" title={nomeDoTitulo}>
                {nomeDoTitulo}
              </SheetTitle>
              <SheetDescription className="numeros line-clamp-2 break-words" title={porcao}>
                {porcao}
              </SheetDescription>
            </div>
            {corpo}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const aoTeclar = (e: KeyboardEvent<HTMLElement>) => {
    // Esc fecha o painel, como a gaveta; a janela Comparar, aberta por cima, trata o Esc dela antes. Num campo, o Esc é
    // do campo (a entrada rápida limpa o que foi digitado), não do painel.
    const noCampo = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement
    if (e.key === 'Escape' && !e.defaultPrevented && !noCampo) aoFechar()
  }

  return (
    <aside
      aria-labelledby={idTitulo}
      onKeyDown={aoTeclar}
      // O cartão do sistema, preso ao rolar e com rolagem própria; entra com um deslize curto, só sem "reduzir movimento".
      className={cn(
        cardVariants(),
        'sticky top-24 max-h-[calc(100dvh-7rem)] self-start overflow-y-auto overscroll-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id={idTitulo}
            ref={titulo}
            tabIndex={-1}
            title={nomeDoTitulo}
            className="line-clamp-2 break-words text-base font-semibold leading-snug text-heading focus-visible:outline-none"
          >
            {nomeDoTitulo}
          </h2>
          <p className="numeros line-clamp-2 break-words text-sm text-muted-foreground" title={porcao}>
            {porcao}
          </p>
        </div>
        <Button variant="ghost" size="iconsm" className="-mr-1.5 -mt-1 shrink-0" aria-label="Fechar substitutos" onClick={aoFechar}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {corpo}
    </aside>
  )
}
