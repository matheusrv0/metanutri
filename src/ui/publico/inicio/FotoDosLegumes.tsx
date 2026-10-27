const BASE = import.meta.env.BASE_URL

/**
 * A pausa entre as chaves e "Como funciona" (D-534): uma foto de ponta a ponta, que deriva devagar com
 * `motion-safe` (D-549). Preguiçosa e com o tamanho reservado (CA-1476).
 */
export function FotoDosLegumes() {
  return (
    <figure className="relative m-0 h-[420px] overflow-hidden bg-landing-chao-fundo">
      <img
        src={`${BASE}imagens/legumes-na-bancada.webp`}
        srcSet={`${BASE}imagens/legumes-na-bancada-800.webp 800w, ${BASE}imagens/legumes-na-bancada.webp 1024w`}
        sizes="100vw"
        width={1024}
        height={683}
        loading="lazy"
        decoding="async"
        alt="Tomates e cenouras frescos sobre uma bancada escura."
        className="size-full object-cover object-[50%_45%] motion-safe:animate-landing-deriva"
      />
    </figure>
  )
}
