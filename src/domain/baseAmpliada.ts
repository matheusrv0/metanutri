// A base ampliada (spec base-ampliada): os alimentos genéricos do USDA que a TACO não tem, com nome, grupo e preparo
// em português. O arquivo grande chega sob demanda pela interface (D-710); aqui ele vira `Alimento`. A citação e as
// contagens moram no arquivo pequeno, que o site também lê.
import fonte from '../data/base-ampliada-fonte.json'
import { receitaDoItem } from './receitaNoPlano.ts'
import { OPCOES, type Alimento, type ChaveNutrienteAlimento, type IdAlergenico, type Plano } from './tipos.ts'

/** A faixa de ids da base ampliada (D-709): acima da TACO (1 a 597), abaixo dos alimentos próprios (900.000). */
export const PRIMEIRO_ID_AMPLIADA = 100_001
export const ULTIMO_ID_AMPLIADA = 199_999

export const ehDaBaseAmpliada = (id: number): boolean => Number.isInteger(id) && id >= PRIMEIRO_ID_AMPLIADA && id <= ULTIMO_ID_AMPLIADA

/** Um alimento como o script grava (`scripts/dados/importar-base-ampliada.mjs`). */
interface ItemDoArquivo {
  readonly id: number
  readonly fdcId: number
  readonly conjunto: string
  readonly nome: string
  readonly grupo: string
  readonly preparo: string | null
  readonly paciente: string
  readonly original: string
  readonly sugerivel: boolean
  readonly valores: readonly (number | null)[]
  readonly medidas: readonly (readonly [string, number])[]
  readonly ml?: boolean
  readonly alergenicos?: readonly IdAlergenico[]
  readonly complemento?: { readonly fdcId: number; readonly chaves: readonly string[] }
}

export interface ArquivoBaseAmpliada {
  readonly chaves: readonly string[]
  readonly alimentos: readonly ItemDoArquivo[]
}

export interface FonteBaseAmpliada {
  readonly fonte: {
    readonly nome: string
    readonly autor: string
    readonly citacao: string
    readonly licenca: string
    readonly url: string
    readonly baixadoEm: string
    readonly base: string
    readonly conjuntos: readonly { readonly nome: string; readonly versao: string; readonly arquivo: string; readonly url: string; readonly sha256: string }[]
    readonly criterio: string
  }
  readonly alimentos: number
  readonly sugeriveis: number
  readonly porConjunto: Readonly<Record<string, number>>
  readonly porGrupo: Readonly<Record<string, number>>
}

// O JSON importado é tipado de forma ampla; a forma exata é conferida em src/data/base-ampliada.test.ts.
export const FONTE_BASE_AMPLIADA: FonteBaseAmpliada = fonte as unknown as FonteBaseAmpliada

const VERSAO_DO_CONJUNTO = new Map(FONTE_BASE_AMPLIADA.fonte.conjuntos.map((c) => [c.nome, c.versao]))
const versaoDe = (conjunto: string): string => VERSAO_DO_CONJUNTO.get(conjunto) ?? ''

/** "Tilápia, filé, grelhada": a base é a primeira parte; os qualificadores, o meio (o preparo fica no campo próprio). */
function partesDoNome(nome: string, preparo: string | null): { readonly base: string; readonly qualificadores: string | null } {
  const partes = nome.split(',').map((p) => p.trim())
  const meio = partes.slice(1, preparo !== null && partes.length > 1 ? -1 : undefined)
  return { base: partes[0] ?? nome, qualificadores: meio.length > 0 ? meio.join(', ') : null }
}

/** O arquivo vira `Alimento`: as chaves na ordem do cabeçalho, as medidas, a unidade e a origem. */
export function decodificarBaseAmpliada(arquivo: ArquivoBaseAmpliada): readonly Alimento[] {
  const chaves = arquivo.chaves as readonly ChaveNutrienteAlimento[]
  return arquivo.alimentos.map((a): Alimento => {
    const nutrientes = Object.fromEntries(chaves.map((c, i) => [c, a.valores[i] ?? null])) as Record<ChaveNutrienteAlimento, number | null>
    return {
      id: a.id,
      descricao: a.nome,
      categoria: a.grupo,
      ...partesDoNome(a.nome, a.preparo),
      preparo: a.preparo,
      nutrientes,
      tracos: [],
      medidas: a.medidas.map(([nome, gramas]) => ({ nome, gramas })),
      ...(a.ml === true ? { unidade: 'ml' as const } : {}),
      ampliada: {
        fdcId: a.fdcId,
        conjunto: a.conjunto,
        versao: versaoDe(a.conjunto),
        nomeOriginal: a.original,
        nomeParaPaciente: a.paciente,
        sugerivel: a.sugerivel,
        ...(a.alergenicos && a.alergenicos.length > 0 ? { alergenicos: a.alergenicos } : {}),
        ...(a.complemento
          ? {
              complemento: {
                fdcId: a.complemento.fdcId,
                conjunto: 'SR Legacy',
                versao: versaoDe('SR Legacy'),
                chaves: a.complemento.chaves as readonly ChaveNutrienteAlimento[],
              },
            }
          : {}),
      },
    }
  })
}

/**
 * D-711: o plano tem alimento da base ampliada (no item, num substituto ou num ingrediente de receita), e por isso
 * precisa dela carregada para abrir.
 */
export function planoUsaBaseAmpliada(plano: Plano): boolean {
  return plano.refeicoes.some((r) =>
    OPCOES.some((o) =>
      r.opcoes[o].some((item) => ehDaBaseAmpliada(item.alimentoId) || (receitaDoItem(item)?.ingredientes.some((i) => ehDaBaseAmpliada(i.alimentoId)) ?? false)),
    ),
  )
}
