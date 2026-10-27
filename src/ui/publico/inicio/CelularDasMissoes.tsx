import { Check } from 'lucide-react'
import { CELULAR_DO_EXEMPLO, MISSOES_DO_EXEMPLO } from './exemploDaLanding.ts'

interface CelularDasMissoesProps {
  /** Uma marca por missão de `MISSOES_DO_EXEMPLO`, na mesma ordem. */
  readonly feitas: readonly boolean[]
  readonly aoVirar: (indice: number) => void
}

/**
 * O celular do exemplo (spec landing-v3, D-659 e D-660): a tela do link do paciente com as nove missões do plano de
 * exemplo, no texto do app, que dá para marcar. Nove não cabem na tela do aparelho; a lista rola dentro dele, e o
 * "Ver meu plano alimentar" fica no pé, como imagem do botão (D-550). As medidas são em px: o aparelho é desenho, não
 * cresce com o texto do sistema (revisão `break-ui`, D-682).
 */
export function CelularDasMissoes({ feitas, aoVirar }: CelularDasMissoesProps) {
  const total = MISSOES_DO_EXEMPLO.length
  const quantas = feitas.filter(Boolean).length

  return (
    <div className="relative h-[576px] w-[300px] flex-none rounded-[52px] bg-(image:--landing-aparelho) p-[12px] shadow-(--landing-aparelho-sombra) max-[720px]:h-[556px] max-[720px]:w-[280px]">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[41px] bg-landing-celular-tela px-[18px] pt-[54px] pb-[18px] text-[14px] text-landing-celular-tinta">
        <span aria-hidden="true" className="absolute top-[12px] left-1/2 -ml-[46px] h-[26px] w-[92px] rounded-full bg-landing-aparelho-ilha" />
        <span aria-hidden="true" className="absolute top-[15px] left-[30px] text-[13px] font-bold">
          {CELULAR_DO_EXEMPLO.hora}
        </span>
        <p className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">{CELULAR_DO_EXEMPLO.saudacao}</p>
        <p className="mt-[2px] text-[13px] text-landing-celular-suave">{CELULAR_DO_EXEMPLO.data}</p>
        <div className="mt-[18px] rounded-[16px] bg-landing-teal p-[14px] text-landing-marfim">
          <p className="flex justify-between gap-[12px] text-[13px] font-bold">
            <span>Missões de hoje</span>
            <span data-contagem="">{`${quantas} de ${total}`}</span>
          </p>
          <div aria-hidden="true" className="mt-[10px] h-[8px] overflow-hidden rounded-full bg-landing-marfim/20">
            <i
              data-barra-das-missoes=""
              className="block h-full origin-left rounded-full bg-landing-teal-claro transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${quantas / total})` }}
            />
          </div>
        </div>
        <div
          role="group"
          aria-label="Missões do dia (exemplo)"
          className="-mx-[8px] mt-[8px] grid min-h-0 flex-1 content-start gap-[8px] overflow-y-auto px-[8px] pt-[8px] pb-[8px]"
        >
          {MISSOES_DO_EXEMPLO.map((missao, i) => (
            <button
              key={missao.texto}
              type="button"
              aria-pressed={feitas[i] === true}
              onClick={() => aoVirar(i)}
              className="group grid min-h-[56px] w-full grid-cols-[26px_minmax(0,1fr)] items-center gap-[12px] rounded-[14px] border-0 bg-landing-celular-missao px-[12px] py-[10px] text-left text-[13.5px] leading-tight font-bold text-landing-celular-tinta shadow-(--landing-celular-sombra) transition-[background-color,scale] duration-200 focus-visible:outline-landing-teal active:scale-[.97] aria-pressed:bg-landing-celular-feita motion-reduce:active:scale-100"
            >
              <span
                aria-hidden="true"
                className="grid size-[26px] place-items-center rounded-full text-transparent shadow-[inset_0_0_0_2px_var(--landing-celular-caixa)] transition-[background-color,box-shadow,color] duration-200 group-aria-pressed:bg-landing-teal group-aria-pressed:text-landing-marfim group-aria-pressed:shadow-none"
              >
                <Check size={14} strokeWidth={3.2} />
              </span>
              <span className="min-w-0">
                {missao.texto}{' '}
                <small className="mt-[2px] block text-[12px] font-medium text-landing-celular-suave">{missao.origem}</small>
              </span>
            </button>
          ))}
        </div>
        <span
          aria-hidden="true"
          className="mt-[8px] grid min-h-[46px] flex-none place-items-center rounded-[14px] text-[14px] font-bold text-landing-teal shadow-[inset_0_0_0_1.5px_var(--landing-celular-contorno)]"
        >
          Ver meu plano alimentar
        </span>
      </div>
    </div>
  )
}
