import type { LinhaDoCobrir } from './exemploDaLanding.ts'

interface ListaDoCobrirProps {
  readonly linhas: readonly LinhaDoCobrir[]
  /** "cobre 27% da falta" na primeira linha, como a gaveta; nas outras, só "cobre 91%". */
  readonly daFaltaNaPrimeira?: boolean
}

/**
 * As sugestões do Cobrir desenhadas como a gaveta do app (fragmento de interface, D-550): o "Adicionar" é imagem do
 * botão, não controle; não recebe foco nem clique, e o leitor de tela não o lê.
 */
export function ListaDoCobrir({ linhas, daFaltaNaPrimeira = false }: ListaDoCobrirProps) {
  return (
    <ul className="mt-3.5 grid list-none gap-2 p-0">
      {linhas.map((linha, i) => (
        <li key={linha.nome} className="flex items-center justify-between gap-3 rounded-[14px] bg-landing-afundado py-[11px] pr-[11px] pl-3.5">
          <div className="min-w-0">
            <div className="font-bold">{linha.nome}</div>
            <div className="text-[13px] text-landing-tinta-suave">
              {`${linha.porcao} · cobre `}
              <b className="font-bold text-landing-teal-claro">{linha.cobre}</b>
              {`${daFaltaNaPrimeira && i === 0 ? ' da falta' : ''} · +${linha.kcal} kcal`}
            </div>
          </div>
          <span
            aria-hidden="true"
            className="inline-flex min-h-[34px] flex-none items-center rounded-full bg-landing-marfim px-3.5 text-[13px] leading-none font-bold whitespace-nowrap text-landing-teal"
          >
            Adicionar
          </span>
        </li>
      ))}
    </ul>
  )
}
