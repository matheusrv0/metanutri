// O catálogo que a IA recebe (spec assistente-ia, D-1315): os alimentos da Base MetaNutri que o MetaNutri pode
// propor, um por linha, com energia e macros por 100 g e os nutrientes de que são fonte. É fixo e igual para todas as
// contas, para o cache da Anthropic valer; a função guarda o texto gerado (supabase/functions/_shared/iaCatalogo.ts),
// e src/data/iaCatalogo.test.ts confere que ele é o que a base atual gera.
import { medidasDoAlimento, PREFERENCIA_MEDIDAS } from './busca.ts'
import { porcaoDoGrupo } from './cobrir.ts'
import { ehPrescritivelParaSugerir } from './sugestaoDoProprio.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

/** Os ids da tabela brasileira (TACO); a base ampliada começa em 100.001 (spec base-ampliada, D-709). */
const ULTIMO_ID_DA_TABELA = 597

/**
 * Os valores diários de referência de adulto da rotulagem (IN 75/2020, Anexo II). "Fonte" é a porção usual que dá ao
 * menos 15% deles: o mesmo critério de "fonte" do rótulo.
 */
export const REFERENCIA_DE_FONTE: readonly { readonly chave: ChaveNutrienteAlimento; readonly nome: string; readonly valor: number }[] = [
  { chave: 'calcio_mg', nome: 'cálcio', valor: 1000 },
  { chave: 'ferro_mg', nome: 'ferro', valor: 14 },
  { chave: 'magnesio_mg', nome: 'magnésio', valor: 420 },
  { chave: 'zinco_mg', nome: 'zinco', valor: 11 },
  { chave: 'potassio_mg', nome: 'potássio', valor: 3500 },
  { chave: 'vitamina_a_rae_mcg', nome: 'vitamina A', valor: 800 },
  { chave: 'vitamina_c_mg', nome: 'vitamina C', valor: 100 },
  { chave: 'vitamina_d_mcg', nome: 'vitamina D', valor: 15 },
  { chave: 'vitamina_b12_mcg', nome: 'B12', valor: 2.4 },
  { chave: 'folato_dfe_mcg', nome: 'folato', valor: 400 },
  { chave: 'fibra_g', nome: 'fibra', valor: 25 },
]

export const FONTE_MINIMA = 0.15

export const CABECALHO_DO_CATALOGO =
  'Catálogo da Base MetaNutri: id | alimento | kcal | proteína g | carboidrato g | gordura g | fonte de (valores por 100 g; [ml] marca o alimento medido em ml, com valores por 100 ml)'

/**
 * Entra no catálogo: o alimento da tabela brasileira que passa na regra prescritível sem "Incluir ingredientes" e o da
 * base ampliada que a curadoria marcou `sugerivel` e passa na mesma regra; os dois com energia. Alimento próprio não
 * entra: vai no pedido de cada conta.
 */
export function entraNoCatalogo(a: Alimento): boolean {
  if (a.proprio !== undefined || a.nutrientes.energia_kcal === null) return false
  const daTabela = a.id >= 1 && a.id <= ULTIMO_ID_DA_TABELA
  if (!daTabela && a.ampliada?.sugerivel !== true) return false
  return ehPrescritivelParaSugerir(a)
}

/**
 * A porção usual de adulto: a do grupo do alimento (a mesma do Cobrir: 150 g de cereal cozido, 1 unidade de fruta, 30 g
 * de oleaginosa); fora dos grupos, a medida caseira mais legível (a ordem de preferência da busca); sem medida, 100 g.
 */
export function porcaoUsual(a: Alimento): number {
  const doGrupo = porcaoDoGrupo(a)?.maxima
  if (doGrupo !== undefined) return doGrupo
  const conhecidas = medidasDoAlimento(a.id)
  const medidas = (conhecidas.length > 0 ? conhecidas : (a.medidas ?? [])).filter((m) => m.gramas > 0)
  const ordem = (nome: string) => {
    const i = PREFERENCIA_MEDIDAS.indexOf(nome)
    return i < 0 ? PREFERENCIA_MEDIDAS.length : i
  }
  const melhor = [...medidas].sort((x, y) => ordem(x.nome) - ordem(y.nome))[0]
  return melhor?.gramas ?? 100
}

/** Os nutrientes de que a porção usual é fonte, na ordem da tabela de referência. */
export function fonteDe(a: Alimento): readonly string[] {
  const porcao = porcaoUsual(a)
  return REFERENCIA_DE_FONTE.filter(({ chave, valor }) => ((a.nutrientes[chave] ?? 0) * porcao) / 100 >= FONTE_MINIMA * valor).map((r) => r.nome)
}

const numero = (v: number | null, casas: number): string => (v === null ? '-' : String(Math.round(v * 10 ** casas) / 10 ** casas))

/** "1 | Arroz, integral, cozido | 124 | 2.6 | 25.8 | 1 | fonte: fibra, magnésio". */
export function linhaDoCatalogo(a: Alimento): string {
  const n = a.nutrientes
  const nome = `${a.descricao.trim().replace(/\s+/g, ' ').replace(/\|/g, '/')}${a.unidade === 'ml' ? ' [ml]' : ''}`
  const fonte = fonteDe(a)
  const partes = [String(a.id), nome, numero(n.energia_kcal, 0), numero(n.proteina_g, 1), numero(n.carboidrato_g, 1), numero(n.lipideos_g, 1)]
  return `${partes.join(' | ')}${fonte.length > 0 ? ` | fonte: ${fonte.join(', ')}` : ''}`
}

export interface CatalogoIa {
  readonly texto: string
  readonly ids: readonly number[]
}

/**
 * O catálogo: o cabeçalho e, por grupo da base, uma linha por alimento. Os grupos vêm na ordem do menor id de cada um
 * e os alimentos, por id: a mesma base dá sempre o mesmo texto (o cache depende disso).
 */
export function montarCatalogoIa(alimentos: readonly Alimento[]): CatalogoIa {
  const entram = alimentos.filter(entraNoCatalogo).sort((a, b) => a.id - b.id)
  const grupos = new Map<string, Alimento[]>()
  for (const a of entram) {
    const grupo = a.categoria.trim() || 'Outros'
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), a])
  }
  const linhas = [CABECALHO_DO_CATALOGO]
  for (const [grupo, lista] of grupos) {
    linhas.push('', `## ${grupo}`, ...lista.map(linhaDoCatalogo))
  }
  return { texto: linhas.join('\n'), ids: entram.map((a) => a.id) }
}
