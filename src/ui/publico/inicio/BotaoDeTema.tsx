import { Moon, Sun } from 'lucide-react'
import type { TemaDaLanding } from './temaDaLanding.ts'

interface BotaoDeTemaProps {
  readonly tema: TemaDaLanding
  readonly aoTrocar: () => void
  /** A barra está sobre o teal: o contorno é o marfim, nos dois temas. */
  readonly sobreTeal: boolean
}

/**
 * O botão de tema da landing (spec landing-v3, D-607): redondo, 44 px, com a lua no escuro e o sol no claro. Os dois
 * ícones estão no HTML e o CSS mostra o do tema, para a página pré-desenhada já nascer com o certo (D-613). O nome diz
 * o que o botão faz, não o tema de agora.
 */
export function BotaoDeTema({ tema, aoTrocar, sobreTeal }: BotaoDeTemaProps) {
  const nome = tema === 'claro' ? 'Usar o tema escuro' : 'Usar o tema claro'
  return (
    <button
      type="button"
      aria-label={nome}
      title={nome}
      onClick={aoTrocar}
      className={`inline-grid size-11 flex-none place-items-center rounded-full border bg-transparent text-inherit transition-[scale,background-color] duration-150 ease-out active:scale-[.97] ${
        sobreTeal ? 'border-landing-marfim/32 hover:bg-landing-marfim/12' : 'border-landing-contorno hover:bg-landing-trilho'
      }`}
    >
      <Moon aria-hidden="true" size={18} strokeWidth={2} className="landing-clara:hidden" />
      <Sun aria-hidden="true" size={18} strokeWidth={2} className="hidden landing-clara:block" />
    </button>
  )
}
