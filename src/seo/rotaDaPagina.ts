// A página própria de Preços, Termos, Privacidade ou Fontes abre o app na tela dela (spec site-publico-profissional,
// D-331, CA-1015). O endereço passa a ser o da raiz com a rota, sem recarregar: daí em diante, o app é o de sempre.

const PAGINAS_PROPRIAS: readonly string[] = ['precos', 'termos', 'privacidade', 'fontes']

/**
 * O endereço para o `history.replaceState`, ou nulo quando não há nada a fazer: na página inicial, quando o endereço já
 * traz uma rota ou quando a página não é uma das próprias. `base` é o `document.baseURI` (a raiz, pelo `<base>`).
 */
export function enderecoDoApp(rotaDaPagina: string | undefined, hash: string, busca: string, base: string): string | null {
  if (!rotaDaPagina || !PAGINAS_PROPRIAS.includes(rotaDaPagina)) return null
  if (hash.replace(/^#\/?/, '') !== '') return null
  return `${base}${busca}#/${rotaDaPagina}`
}
