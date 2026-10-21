// Em que tela a página abriu (spec site-publico-profissional, D-320 revista na revisão de 21/10/2026, CA-1026).
// A versão nova só recarrega sozinha a página que abriu numa tela de vitrine: quem abriu na área de trabalho e foi a
// "Ver preços" ou a "Fontes da base" não tem a página recarregada no meio do caminho.
import { lerRota } from '../navegacao.ts'

const TELAS_DE_VITRINE: readonly string[] = ['inicio', 'precos', 'termos', 'privacidade', 'fontes']

let abriuNaVitrine = false

/** Chamado uma vez no boot (main.tsx), depois das trocas de endereço das páginas próprias e da raiz. */
export function marcarAbertura(hash: string): void {
  abriuNaVitrine = TELAS_DE_VITRINE.includes(lerRota(hash).tela)
}

export const paginaAbriuNaVitrine = (): boolean => abriuNaVitrine
