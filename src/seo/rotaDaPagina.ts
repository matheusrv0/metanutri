// A página própria de Preços, Termos, Privacidade ou Fontes abre o app na tela dela (spec site-publico-profissional,
// D-331, CA-1015). O endereço passa a ser o da raiz com a rota, sem recarregar: daí em diante, o app é o de sempre.

const PAGINAS_PROPRIAS: readonly string[] = ['precos', 'termos', 'privacidade', 'fontes']

/**
 * O endereço para o `history.replaceState`, ou nulo quando não há nada a fazer: na página inicial, quando o endereço já
 * traz uma rota ou quando a página não é uma das próprias. `base` é o `document.baseURI` (a raiz, pelo `<base>`).
 */
interface Abertura {
  readonly hash: string
  readonly busca: string
  /** `location.pathname`. */
  readonly caminho: string
  /** Com o servidor de conta (como no site no ar). Sem ele, a raiz é a área de trabalho (CA-150). */
  readonly comServidor: boolean
  /** O script do <head> marcou `sem-vitrine`: há sessão guardada ou o endereço pede outra tela. */
  readonly vitrineEscondida: boolean
}

/**
 * D-337 (CA-1023): a raiz sem sessão já nasce em `#/inicio`. Sem isso, ela caía na rota do painel, o portão da conta
 * mostrava "Carregando…" enquanto a sessão era conferida, e só então o CA-730 levava à landing: a página piscava.
 * Nulo quando não há nada a fazer.
 */
export function enderecoDaVitrine({ hash, busca, caminho, comServidor, vitrineEscondida }: Abertura): string | null {
  if (!comServidor || vitrineEscondida) return null
  if (hash.replace(/^#\/?/, '') !== '' || /[?&]volta=/.test(busca)) return null
  return `${caminho}${busca}#/inicio`
}

export function enderecoDoApp(rotaDaPagina: string | undefined, hash: string, busca: string, base: string): string | null {
  if (!rotaDaPagina || !PAGINAS_PROPRIAS.includes(rotaDaPagina)) return null
  if (hash.replace(/^#\/?/, '') !== '') return null
  return `${base}${busca}#/${rotaDaPagina}`
}
