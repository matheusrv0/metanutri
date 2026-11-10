import { useId, type ReactNode } from 'react'
import type { ItemDoQueAjustar } from '@/domain/iaGaveta.ts'
import { CaixaDeMarcar } from '@ds/componentes/forms/CaixaDeMarcar.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'

/** D-1309: o "Outro pedido", até 300 caracteres. */
export const MAXIMO_DO_OUTRO_PEDIDO = 300

interface AdequarComIaProps {
  readonly itens: readonly ItemDoQueAjustar[]
  readonly desmarcadas: ReadonlySet<string>
  readonly aoAlternar: (id: string) => void
  readonly outro: string
  readonly aoMudarOutro: (texto: string) => void
  /** A linha da autorização gravada, ou a chave quando ainda não há. */
  readonly autorizacao: ReactNode
}

/** D-1309: o pedido do adequar. "O que ajustar" já vem marcado com o que o app calculou. */
export function AdequarComIa({ itens, desmarcadas, aoAlternar, outro, aoMudarOutro, autorizacao }: AdequarComIaProps) {
  const id = useId()
  return (
    <div className="flex flex-col">
      <section aria-labelledby={`${id}-lac`} className="flex flex-col gap-1.5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={`${id}-lac`} className="text-sm font-bold text-heading">
            O que ajustar
          </h3>
          <span className="text-xs text-muted-foreground">Calculado pelo app</span>
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">O plano está dentro das metas. Escreva em "Outro pedido" o que quer mudar.</p>
        ) : (
          <ul className="flex flex-col">
            {itens.map((l) => (
              <li key={l.id}>
                <CaixaDeMarcar
                  marcada={!desmarcadas.has(l.id)}
                  aoMudar={() => aoAlternar(l.id)}
                  rotulo={
                    <>
                      <b className="font-semibold text-heading">{l.nome}</b>
                      <span className="numeros ml-2 text-muted-foreground">{l.valor}</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby={`${id}-outro-titulo`} className="flex flex-col gap-2.5 border-t border-bordersubtle py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={`${id}-outro-titulo`} className="text-sm font-bold text-heading">
            <label htmlFor={`${id}-outro`}>Outro pedido</label>
          </h3>
          <span className="numeros text-xs text-muted-foreground">{`Opcional · ${outro.length}/${MAXIMO_DO_OUTRO_PEDIDO}`}</span>
        </div>
        <Textarea
          id={`${id}-outro`}
          rows={2}
          maxLength={MAXIMO_DO_OUTRO_PEDIDO}
          className="min-h-16"
          placeholder="Ex.: jantar mais leve; opções mais baratas"
          value={outro}
          onChange={(e) => aoMudarOutro(e.target.value.slice(0, MAXIMO_DO_OUTRO_PEDIDO))}
        />
      </section>
      {autorizacao}
    </div>
  )
}
