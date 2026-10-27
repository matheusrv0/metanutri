import { useState, useSyncExternalStore } from 'react'
import { navegarPeloApp } from '../navegacaoPublica.ts'
import { BOTAO } from './estiloDaLanding.ts'

interface BotaoFixoDoCelularProps {
  readonly aoCriarConta: () => void
}

/** O do topo conta como na tela até 88 px abaixo do pé dela: o fixo some antes de o do topo passar por baixo dele. */
const MARGEM_DO_PE = '0px 0px 88px 0px'

/** O React 18 não conhece `inert`: vai como texto, como o `fetchpriority` da foto do topo. */
const INERTE: Readonly<Record<string, string>> = { inert: '' }

/**
 * D-688: se o fixo está à vista, lido do navegador. Sem IntersectionObserver, à vista, como era; com ele, escondido até
 * o primeiro aviso dizer onde está o "Criar conta grátis" do topo (`data-acao-do-topo`); sem o do topo na página, à
 * vista.
 */
function criarVigia() {
  let aVista = typeof IntersectionObserver === 'undefined'
  return {
    ler: () => aVista,
    assinar: (aoMudar: () => void) => {
      if (typeof IntersectionObserver === 'undefined') return () => undefined
      const doTopo = globalThis.document.querySelector('[data-acao-do-topo]')
      if (!doTopo) {
        aVista = true
        aoMudar()
        return () => undefined
      }
      const observador = new IntersectionObserver(
        (entradas) => {
          const ultima = entradas[entradas.length - 1]
          if (!ultima) return
          aVista = !ultima.isIntersecting
          aoMudar()
        },
        { rootMargin: MARGEM_DO_PE },
      )
      observador.observe(doTopo)
      return () => observador.disconnect()
    },
  }
}

/** Na página pré-desenhada (o build), escondido: o do topo está na tela e a página inteira é `inert` (D-331). */
const naPaginaPreDesenhada = () => false

/**
 * "Criar conta grátis" preso no pé da tela, só até 720 px (spec landing-v3, D-674): 52 px de altura, a 12 px das bordas
 * (e acima da barra de gestos do aparelho). A moldura só o desenha sem sessão; o rodapé deixa 88 px embaixo para ele.
 *
 * D-688: ele só aparece depois que o "Criar conta grátis" do topo sai da tela; antes, os dois repetiam a ação e o fixo
 * cobria a linha do Free. Entra e sai em 200 ms, pela opacidade e por 8 px (com menos movimento, só a opacidade).
 * Escondido, fica fora do foco, do toque e do leitor de tela.
 */
export function BotaoFixoDoCelular({ aoCriarConta }: BotaoFixoDoCelularProps) {
  const [vigia] = useState(criarVigia)
  const aVista = useSyncExternalStore(vigia.assinar, vigia.ler, naPaginaPreDesenhada)

  return (
    <div
      data-botao-fixo=""
      aria-hidden={aVista ? undefined : true}
      {...(aVista ? {} : INERTE)}
      className={`fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 hidden max-[720px]:flex transition-[opacity,translate] duration-200 ease-out ${aVista ? '' : 'pointer-events-none opacity-0 motion-safe:translate-y-2'}`}
    >
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
