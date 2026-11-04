// A marca da nutricionista no link do paciente (spec marca-no-link, D-955 a D-957), separada do resto da tela: o que
// pinta a cor dela, a logo do topo e o MetaNutri do rodapé. Quem redesenhar o link usa estas peças sem reescrevê-las.
import { useState, type CSSProperties } from 'react'
import { avaliarCor } from '@/domain/corDaMarca.ts'

/** O tema fixo de um celular da prévia de "Sua marca"; fora da prévia, o link segue o tema do celular do paciente. */
export type TemaDaPrevia = 'claro' | 'escuro'

/** O texto alternativo da logo dela: o link não sabe o nome de quem montou o plano, e não precisa saber (D-952). */
export const ALT_DA_LOGO_NO_LINK = 'Logo de quem montou seu plano'

/**
 * D-955 e DP-ML-9: a raiz do link com a cor dela leva a classe `marca-da-nutricionista` e as duas versões da cor no
 * estilo; os tokens `--link-acao` e `--link-acao-texto` (tokens.css) escolhem a do tema. Sem cor, nada: o link de hoje.
 */
export function propsDaCorDaMarca(cor: string | null): { readonly className: string | undefined; readonly style: CSSProperties | undefined } {
  if (cor === null) return { className: undefined, style: undefined }
  return { className: 'marca-da-nutricionista', style: { '--marca-claro': cor, '--marca-escuro': avaliarCor(cor).escuro } as CSSProperties }
}

/** D-956: a ação do link (a barra do dia). Sem cor, `--link-acao` é a ação do sistema, como antes. */
export const FUNDO_DA_ACAO = 'bg-linkacao'

/** D-956 e DP-ML-8: a aba escolhida. Sem a cor dela, a pílula branca de sempre; com a cor, a pílula na cor. */
export const classeDaAbaEscolhida = (comCor: boolean): string =>
  comCor ? 'data-[state=active]:bg-linkacao data-[state=active]:text-linkacaotexto' : 'data-[state=active]:bg-card data-[state=active]:text-heading'

/** A variante da `Logo` do MetaNutri: a do tema do celular da prévia, ou a do tema do app. */
export const varianteDaLogo = (previa: TemaDaPrevia | undefined): 'auto' | 'claro' | 'escuro' => (previa === 'claro' ? 'claro' : previa === 'escuro' ? 'escuro' : 'auto')

/** CA-1973: a logo que não abriu volta à do MetaNutri (no topo e no rodapé); uma logo nova tenta de novo. */
export function useLogoDoLink(logo: string | null): { readonly logo: string | null; readonly aoFalhar: () => void } {
  const [quebrada, setQuebrada] = useState<string | null>(null)
  return { logo: logo !== null && logo !== quebrada ? logo : null, aoFalhar: () => setQuebrada(logo) }
}
