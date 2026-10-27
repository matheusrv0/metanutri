import { navegarPeloApp } from '../navegacaoPublica.ts'
import { BOTAO } from './estiloDaLanding.ts'

interface BotaoFixoDoCelularProps {
  readonly aoCriarConta: () => void
}

/**
 * "Criar conta grátis" preso no pé da tela, só até 720 px (spec landing-v3, D-674): 52 px de altura, a 12 px das bordas
 * (e acima da barra de gestos do aparelho). A moldura só o desenha sem sessão; o rodapé deixa 88 px embaixo para ele.
 */
export function BotaoFixoDoCelular({ aoCriarConta }: BotaoFixoDoCelularProps) {
  return (
    <div data-botao-fixo="" className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 hidden max-[720px]:flex">
      <a
        href="#/criar-conta"
        onClick={(evento) => navegarPeloApp(evento, aoCriarConta)}
        className={`${BOTAO} min-h-[52px] w-full shadow-(--landing-sombra-fixo)`}
      >
        Criar conta grátis
      </a>
    </div>
  )
}
