// As classes que se repetem nas seções da landing escura (spec landing-escura). Cor, letra e margem são os tokens
// `--landing-*` de design-system/tokens/tokens.css; aqui só a combinação, para cada seção não reescrever a mesma.

/** A ação: marfim com texto teal, em pílula; no hover, branco (D-532). 44 px de alvo (D-551). */
export const BOTAO =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-landing-marfim px-[22px] text-base font-bold leading-none whitespace-nowrap text-landing-teal no-underline transition-[scale,background-color] duration-200 hover:bg-landing-branco active:scale-[.97]'

/** A margem da página nos dois lados, a mesma em todas as seções. */
export const MARGEM = 'px-(--landing-margem)'

/** O espaço entre seções: 136 px no computador, 104 px no celular. */
export const ESPACO_DE_SECAO = 'pt-[136px] pb-[120px] max-[720px]:pt-[104px] max-[720px]:pb-24'

/** O título de seção do tamanho de texto grande (o campo vivo, as chaves, Quanto custa). */
export const TITULO_L = 'text-(length:--landing-fs-l) font-bold leading-tight tracking-[-0.02em] text-inherit'

/** O título de seção grande (Como funciona, a cozinha, as perguntas). */
export const TITULO_XL = 'text-(length:--landing-fs-xl) font-extrabold leading-none tracking-[-0.04em] text-inherit'

/** Texto de apoio de 20 px. */
export const LEAD = 'text-(length:--landing-fs-lead) leading-normal'
