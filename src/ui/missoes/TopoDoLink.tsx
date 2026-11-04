import { Logo } from '@ds/componentes/display/Logo.tsx'
import { PlacaLogo } from '@ds/componentes/display/PlacaLogo.tsx'
import { ALT_DA_LOGO_NO_LINK, varianteDaLogo, type TemaDaPrevia } from './marcaNoLink.ts'

/**
 * O topo do link (spec marca-no-link, D-957): a logo dela numa placa branca, nos dois temas, até 40 × 200 px; sem logo,
 * a logo do MetaNutri de sempre.
 */
export function TopoDoLink({ logo, aoFalhar, previa }: { readonly logo: string | null; readonly aoFalhar: () => void; readonly previa?: TemaDaPrevia | undefined }) {
  return (
    <div className="mb-5 flex items-center">
      {logo ? <PlacaLogo src={logo} alt={ALT_DA_LOGO_NO_LINK} aoFalhar={aoFalhar} /> : <Logo tamanho={22} variante={varianteDaLogo(previa)} />}
    </div>
  )
}
