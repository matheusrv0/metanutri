// As classes que se repetem nas seções da landing (spec landing-escura; spec landing-v3). Cor, letra e margem são os
// tokens `--landing-*` de design-system/tokens/tokens.css; aqui só a combinação, para cada seção não reescrever a mesma.

const PILULA =
  'inline-flex min-h-11 items-center justify-center rounded-full px-[22px] text-base font-bold leading-none no-underline transition-[scale,background-color] duration-200 active:scale-[.97]'

const ACAO_DO_TEMA = 'bg-landing-acao text-landing-acao-tinta hover:bg-landing-acao-hover'

/** A ação sobre o chão: marfim com texto teal no escuro, teal com texto marfim no claro (D-609). 44 px de alvo (D-551). */
export const BOTAO = `${PILULA} whitespace-nowrap ${ACAO_DO_TEMA}`

/**
 * O botão que ocupa a largura do cartão (os planos): com o texto grande do sistema, ele quebra em linhas em vez de
 * empurrar o cartão para fora da tela (revisão `break-ui`, CA-1691).
 */
export const PILULA_QUE_QUEBRA = `${PILULA} py-2.5 text-center leading-tight`

/** A ação do tema no botão que quebra. */
export const BOTAO_QUE_QUEBRA = `${PILULA_QUE_QUEBRA} ${ACAO_DO_TEMA}`

/** A margem da página nos dois lados, a mesma em todas as seções. */
export const MARGEM = 'px-(--landing-margem)'

/** O espaço das seções: 88 px em cima e 80 px embaixo, em todas as larguras (spec landing-v3, D-677). */
export const ESPACO_DE_SECAO = 'pt-[88px] pb-20'


/** O título de seção da v9 (D-677): de 30 a 56 px, até 24 caracteres por linha. */
export const TITULO_DE_SECAO = 'max-w-[24ch] text-(length:--landing-fs-titulo) leading-[1.08] font-extrabold tracking-[-0.03em] text-inherit'

/** O texto de apoio debaixo do título de seção (D-677): 20 px, a 20 px do título, em tinta suave. */
export const APOIO = 'mt-5 max-w-[46ch] text-(length:--landing-fs-lead) leading-normal text-landing-tinta-suave'

/** O cartão e o painel da v9: o cartão do tema, a luz de cima e, no claro, a sombra (D-676). */
export const CARTAO_DA_V9 = 'relative isolate overflow-hidden bg-landing-cartao shadow-(--landing-sombra-cartao)'
