import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { irComAncora, navegarPeloApp, type DestinoPublico } from '../navegacaoPublica.ts'
import { MARGEM } from './estiloDaLanding.ts'

interface RodapeDaLandingProps {
  readonly aoIrPara: (destino: DestinoPublico) => void
  /** O contato do MetaNutri; nulo, o "Fale com a gente" não aparece (CB-542). Os testes passam outro. */
  readonly contato?: string | null
}

/** D-339 (CA-1028): o endereço que a aba nova e os robôs seguem; as páginas próprias são relativas à raiz do site. */
const LINKS: readonly { readonly texto: string; readonly destino: DestinoPublico; readonly href: string }[] = [
  { texto: 'Preços', destino: 'precos', href: 'precos/' },
  { texto: 'Termos de uso', destino: 'termos', href: 'termos/' },
  { texto: 'Política de privacidade', destino: 'privacidade', href: 'privacidade/' },
  // D-542: a página das fontes se chama Referências; o endereço continua o mesmo.
  { texto: 'Referências', destino: 'fontes', href: 'fontes/' },
]

const LINK = 'inline-flex min-h-11 items-center underline-offset-4 hover:text-landing-tinta hover:underline'

/**
 * O rodapé da landing (D-545, CA-1461): o nome volta grande no "Fale com a gente" (o e-mail do MetaNutri) e uma linha
 * com Preços, os termos, a privacidade e as Referências. Na v9, o mesmo de hoje (spec landing-v3, D-675), com 88 px
 * embaixo no celular para o botão fixo não cobrir o último link (D-674).
 */
export function RodapeDaLanding({ aoIrPara, contato = CONTATO_EMAIL }: RodapeDaLandingProps) {
  const ano = new Date().getFullYear()
  return (
    <footer
     
      className={`grid min-h-[56svh] grid-rows-[auto_1fr_auto_auto] gap-[22px] bg-landing-rodape pt-9 pb-[26px] text-landing-rodape-tinta max-[720px]:pb-[88px] ${MARGEM}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 text-(length:--landing-fs-s) text-landing-tinta-suave">
        <p>MetaNutri: software para nutricionistas.</p>
        <a
          href="#/inicio"
          className={LINK}
          onClick={(evento) => {
            evento.preventDefault()
            globalThis.scrollTo?.({ top: 0, behavior: 'smooth' })
            // Quem usa o teclado volta junto: o foco vai para a logo da barra, sem rolar de novo.
            globalThis.document.getElementById('inicio-da-landing')?.focus({ preventScroll: true })
          }}
        >
          Voltar ao topo
        </a>
      </div>
      <div />
      {contato ? (
        <a
          href={`mailto:${contato}`}
          className="min-h-11 self-end text-(length:--landing-fs-display) leading-[.95] font-extrabold tracking-[-0.05em] no-underline transition-colors duration-200 hover:text-landing-destaque max-[720px]:text-[12vw]"
        >
          Fale com a gente
        </a>
      ) : (
        <div />
      )}
      <div className="grid grid-cols-[2fr_1fr] items-center gap-x-6 text-(length:--landing-fs-s) text-landing-tinta-suave max-[720px]:grid-cols-1 max-[720px]:text-[13px]">
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-[18px]">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className={LINK} onClick={(evento) => navegarPeloApp(evento, () => irComAncora(aoIrPara, link.destino))}>
              {link.texto}
            </a>
          ))}
        </nav>
        <p className="text-right max-[720px]:text-left">{`Brasil, ${ano}`}</p>
      </div>
    </footer>
  )
}
