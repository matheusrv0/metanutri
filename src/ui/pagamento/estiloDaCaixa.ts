// A caixa dos cinco campos do cartão (protótipo v2, D-73; decisão 1 do plano): 48 de
// altura, canto 12, fundo afundado e sem fio; no foco vira cartão com anel por dentro; com
// erro, fundo e anel de erro. Os três campos seguros e os dois nossos usam a mesma caixa
// (CA-368). Para voltar ao Input do resto do site, é aqui.
export const CAIXA =
  'flex h-12 w-full min-w-0 items-center gap-2.5 rounded-md border-0 bg-surfacesunken px-4 text-sm text-heading ring-inset transition-[background-color,box-shadow]'
/** O foco do campo seguro mora dentro do iframe; o :focus-within da caixa enxerga. */
export const CAIXA_FOCO_DENTRO = 'focus-within:bg-card focus-within:ring-2 focus-within:ring-primary'
/** O foco dos campos nossos: o Input já traz um anel, e aqui ele vira o da caixa. */
export const CAIXA_FOCO_INPUT = 'placeholder:text-textsubtle focus-visible:border-0 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary'
export const CAIXA_ERRO = 'bg-lighterror ring-1 ring-error'
