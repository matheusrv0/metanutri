// Líquido sai em ml (spec alimentos-e-gramaturas, D-378): leite, bebida, suco e alimento próprio cadastrado em ml.
// Densidade 1: 1 g = 1 ml, como a POF e a rotina de consultório tratam leite e suco.
import type { Alimento } from './tipos.ts'

const LIQUIDO_PELO_NOME = /^(Leite, de vaca, (integral|desnatado, UHT|achocolatado)|Leite, de cabra|Leite, fermentado|Leite, de coco|Bebida láctea)|(^|,\s*)suco($|[\s,])/i
const EM_PO = /(^|[\s,])pó($|[\s,])/i

export type UnidadeDoAlimento = 'g' | 'ml'

/** Verdadeiro quando o alimento se mede em ml. O alimento próprio diz isso no cadastro. */
export function ehLiquido(alimento: Pick<Alimento, 'descricao' | 'categoria' | 'unidade'>): boolean {
  if (alimento.unidade !== undefined) return alimento.unidade === 'ml'
  const nome = alimento.descricao.trim()
  if (EM_PO.test(nome)) return false
  return alimento.categoria.startsWith('Bebidas') || LIQUIDO_PELO_NOME.test(nome)
}

/** "g" ou "ml", para escrever ao lado do peso. */
export function unidadeDo(alimento: Pick<Alimento, 'descricao' | 'categoria' | 'unidade'> | undefined): UnidadeDoAlimento {
  return alimento !== undefined && ehLiquido(alimento) ? 'ml' : 'g'
}
