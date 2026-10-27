import { Moon, Sun } from 'lucide-react'
import type { TemaDaLanding } from './temaDaLanding.ts'

interface BotaoDeTemaProps {
  readonly tema: TemaDaLanding
  readonly aoTrocar: () => void
}

/**
 * O botão de tema da landing (spec landing-v3, D-607; na barra de vidro, D-651): redondo, 44 px, com a lua no escuro e o sol no claro. Os dois
 * ícones estão no HTML e o CSS mostra o do tema, para a página pré-desenhada já nascer com o certo (D-613). O nome diz
 * o que o botão faz, não o tema de agora.
 */
export function BotaoDeTema({ tema, aoTrocar }: BotaoDeTemaProps) {
  const nome = tema === 'claro' ? 'Usar o tema escuro' : 'Usar o tema claro'
  return (
    <button
      type="button"
      aria-label={nome}
      title={nome}
      onClick={aoTrocar}
      className="inline-grid size-11 flex-none place-items-center rounded-full border border-landing-borda bg-transparent text-inherit transition-[scale,background-color] duration-150 ease-out hover:bg-landing-cartao active:scale-[.97]"
    >
      <Moon aria-hidden="true" size={18} strokeWidth={2} className="landing-clara:hidden" />
      <Sun aria-hidden="true" size={18} strokeWidth={2} className="hidden landing-clara:block" />
    </button>
  )
}
