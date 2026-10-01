// Sugestões de alimentos por tipo de refeição (spec ajustes-de-uso, US-A3, D-35 e D-36).
// A lista padrão é o ponto de partida; a pessoa edita, e o app nunca aprende sozinho.
import { normalizar } from './busca.ts'
import type { Armazenamento } from './persistencia.ts'
import type { Alimento, BuscarAlimento } from './tipos.ts'

export type TipoRefeicao = 'desjejum' | 'lanche' | 'almoco' | 'jantar' | 'ceia'

export const TIPOS_REFEICAO: readonly TipoRefeicao[] = ['desjejum', 'lanche', 'almoco', 'jantar', 'ceia']

/** "Sugestões para o almoço", "para a ceia". */
export const NOME_DO_TIPO: Readonly<Record<TipoRefeicao, string>> = {
  desjejum: 'o desjejum',
  lanche: 'o lanche',
  almoco: 'o almoço',
  jantar: 'o jantar',
  ceia: 'a ceia',
}

export interface SugestaoAlimento {
  readonly alimentoId: number
  readonly gramas: number
}

export type ListasDeSugestoes = Readonly<Record<TipoRefeicao, readonly SugestaoAlimento[]>>

/** Seção 3.1 da spec. Revisar com uma nutricionista antes de publicar (R-20). */
export const SUGESTOES_PADRAO: ListasDeSugestoes = {
  desjejum: [
    { alimentoId: 533, gramas: 135 }, // Cuscuz, de milho, cozido com sal
    { alimentoId: 488, gramas: 45 }, // Ovo, de galinha, inteiro, cozido/10minutos
    { alimentoId: 53, gramas: 50 }, // Pão, trigo, francês
    { alimentoId: 551, gramas: 50 }, // Tapioca, com manteiga
    { alimentoId: 471, gramas: 50 }, // Café, infusão 10%
  ],
  lanche: [
    { alimentoId: 182, gramas: 75 }, // Banana, prata, crua
    { alimentoId: 222, gramas: 150 }, // Maçã, Fuji, com casca, crua
    { alimentoId: 226, gramas: 170 }, // Mamão, Papaia, cru
    { alimentoId: 448, gramas: 200 }, // Iogurte, natural
    { alimentoId: 7, gramas: 15 }, // Aveia, flocos, crua
    { alimentoId: 461, gramas: 45 }, // Queijo, minas, frescal
  ],
  almoco: [
    { alimentoId: 3, gramas: 100 }, // Arroz, tipo 1, cozido
    { alimentoId: 561, gramas: 140 }, // Feijão, carioca, cozido
    { alimentoId: 410, gramas: 100 }, // Frango, peito, sem pele, grelhado
    { alimentoId: 377, gramas: 100 }, // Carne, bovina, patinho, sem gordura, grelhado
    { alimentoId: 78, gramas: 30 }, // Alface, crespa, crua
    { alimentoId: 157, gramas: 80 }, // Tomate, com semente, cru
  ],
  jantar: [
    { alimentoId: 533, gramas: 135 }, // Cuscuz, de milho, cozido com sal
    { alimentoId: 488, gramas: 45 }, // Ovo, de galinha, inteiro, cozido/10minutos
    { alimentoId: 410, gramas: 100 }, // Frango, peito, sem pele, grelhado
    { alimentoId: 3, gramas: 100 }, // Arroz, tipo 1, cozido
    { alimentoId: 561, gramas: 140 }, // Feijão, carioca, cozido
    { alimentoId: 88, gramas: 70 }, // Batata, doce, cozida
  ],
  ceia: [
    { alimentoId: 448, gramas: 200 }, // Iogurte, natural
    { alimentoId: 182, gramas: 75 }, // Banana, prata, crua
    { alimentoId: 226, gramas: 170 }, // Mamão, Papaia, cru
    { alimentoId: 7, gramas: 15 }, // Aveia, flocos, crua
  ],
}

/** CA-239: o nome manda; maiúscula e acento não contam. */
const PELO_NOME: readonly (readonly [RegExp, TipoRefeicao])[] = [
  [/desjejum|cafe da manha/, 'desjejum'],
  [/lanche|colacao/, 'lanche'],
  [/almoco/, 'almoco'],
  [/janta/, 'jantar'],
  [/ceia/, 'ceia'],
]

/** CA-240: o horário decide quando o nome não diz. Minuto em que cada faixa começa. */
const PELO_HORARIO: readonly (readonly [number, TipoRefeicao])[] = [
  [4 * 60, 'desjejum'],
  [9 * 60, 'lanche'],
  [11 * 60, 'almoco'],
  [15 * 60, 'lanche'],
  [18 * 60, 'jantar'],
  [21 * 60, 'ceia'],
]

export function tipoDaRefeicao(nome: string, horario: string): TipoRefeicao {
  const texto = normalizar(nome)
  for (const [padrao, tipo] of PELO_NOME) if (padrao.test(texto)) return tipo

  const hora = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario)
  // Horário ilegível só aparece em plano importado: conta como almoço em vez de quebrar.
  if (!hora) return 'almoco'
  const minutos = Number(hora[1]) * 60 + Number(hora[2])
  let tipo: TipoRefeicao = 'ceia' // de 00:00 a 03:59
  for (const [inicio, t] of PELO_HORARIO) if (minutos >= inicio) tipo = t
  return tipo
}

export interface SugestaoPronta extends SugestaoAlimento {
  readonly alimento: Alimento
}

/** CB-57: alimento que não existe mais (produto apagado, base trocada) some sem erro. */
export function sugestoesProntas(lista: readonly SugestaoAlimento[], buscar: BuscarAlimento): readonly SugestaoPronta[] {
  return lista.flatMap((s) => {
    const alimento = buscar(s.alimentoId)
    return alimento ? [{ alimentoId: s.alimentoId, gramas: s.gramas, alimento }] : []
  })
}

const CHAVE = 'metanutri:sugestoes-por-refeicao'

export interface RepositorioSugestoes {
  /** A lista de cada tipo: a que a pessoa salvou ou, se não salvou, a padrão. */
  ler(): ListasDeSugestoes
  /** `false` quando o aparelho não guardou (CB-70); nesse caso nada muda. */
  salvar(tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]): boolean
}

type Guardadas = Partial<Record<TipoRefeicao, readonly SugestaoAlimento[]>>

function ehSugestao(valor: unknown): valor is SugestaoAlimento {
  if (typeof valor !== 'object' || valor === null) return false
  const { alimentoId, gramas } = valor as { alimentoId?: unknown; gramas?: unknown }
  return typeof alimentoId === 'number' && Number.isInteger(alimentoId) && typeof gramas === 'number' && Number.isFinite(gramas) && gramas > 0
}

function lerGuardadas(armazenamento: Armazenamento): Guardadas {
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '{}')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return {}
    const guardadas: Guardadas = {}
    for (const tipo of TIPOS_REFEICAO) {
      const lista = (bruto as Record<string, unknown>)[tipo]
      if (Array.isArray(lista)) guardadas[tipo] = lista.filter(ehSugestao).map(({ alimentoId, gramas }) => ({ alimentoId, gramas }))
    }
    return guardadas
  } catch {
    return {}
  }
}

const mesmaLista = (a: readonly SugestaoAlimento[], b: readonly SugestaoAlimento[]) =>
  a.length === b.length && a.every((s, i) => s.alimentoId === b[i]?.alimentoId && s.gramas === b[i]?.gramas)

export function criarRepositorioSugestoes(armazenamento: Armazenamento | null): RepositorioSugestoes {
  return {
    ler() {
      const guardadas = armazenamento ? lerGuardadas(armazenamento) : {}
      return {
        desjejum: guardadas.desjejum ?? SUGESTOES_PADRAO.desjejum,
        lanche: guardadas.lanche ?? SUGESTOES_PADRAO.lanche,
        almoco: guardadas.almoco ?? SUGESTOES_PADRAO.almoco,
        jantar: guardadas.jantar ?? SUGESTOES_PADRAO.jantar,
        ceia: guardadas.ceia ?? SUGESTOES_PADRAO.ceia,
      }
    },

    salvar(tipo, lista) {
      if (!armazenamento) return false
      const guardadas = lerGuardadas(armazenamento)
      const limpa = lista.map(({ alimentoId, gramas }) => ({ alimentoId, gramas }))
      const proximas: Guardadas = {}
      for (const t of TIPOS_REFEICAO) {
        const valor = t === tipo ? limpa : guardadas[t]
        if (valor === undefined) continue
        // Igual à padrão: guarda "usar a padrão", para uma revisão futura da lista chegar a quem voltou para ela.
        if (t === tipo && mesmaLista(valor, SUGESTOES_PADRAO[t])) continue
        proximas[t] = valor
      }
      try {
        armazenamento.setItem(CHAVE, JSON.stringify(proximas))
        return true
      } catch {
        return false
      }
    },
  }
}
