import { Logo } from '@ds/componentes/display/Logo.tsx'
import { varianteDaLogo, type TemaDaPrevia } from './marcaNoLink.ts'

/**
 * O MetaNutri no rodapé do link (spec marca-no-link, D-957 e D-959): pequeno, depois de tudo, quando a logo dela ocupa o
 * topo, em todas as assinaturas. Sem a logo dela, o topo já é do MetaNutri e o rodapé não o repete.
 */
export function RodapeDoLink({ previa }: { readonly previa?: TemaDaPrevia | undefined }) {
  return (
    <div className="mt-8 flex justify-center opacity-80">
      <Logo tamanho={16} variante={varianteDaLogo(previa)} />
    </div>
  )
}
