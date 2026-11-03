// O estado da tela de importar (spec importar-pacientes): o passo, a planilha lida, o mapeamento, as correções e as
// marcas. Só isso é guardado; a prévia é refeita dele a cada mudança (CA-1932). Fica na memória da aba (D-914), no
// rascunho da conta (`rascunhoDaImportacao.ts`).
import type { Destino } from '@/domain/importar/colunas.ts'
import type { LinhaDeFora } from '@/domain/importar/csvDeFora.ts'
import type { PlanilhaLida } from '@/domain/importar/lerPlanilha.ts'
import type { Correcao } from '@/domain/importar/previa.ts'

export type Passo = 'arquivo' | 'colunas' | 'previa'

export const PASSOS: readonly { readonly valor: Passo; readonly rotulo: string }[] = [
  { valor: 'arquivo', rotulo: 'Arquivo' },
  { valor: 'colunas', rotulo: 'Colunas' },
  { valor: 'previa', rotulo: 'Prévia' },
]

export interface PlanilhaCarregada {
  readonly nome: string
  readonly lida: PlanilhaLida
}

/** O que a prévia avisa depois do clique em "Importar" sem criar nada (DP-IP-17, CA-1936). */
export type AvisoDaPrevia = { readonly tipo: 'mudou' } | { readonly tipo: 'nao-cabe'; readonly cabem: number }

export interface PacienteImportado {
  readonly id: string
  readonly nome: string
  /** "F · 14/03/1991", o que a conclusão mostra ao lado do nome. */
  readonly detalhe: string
}

export interface ResultadoDaImportacao {
  readonly importacaoId: string
  readonly importados: readonly PacienteImportado[]
  readonly deFora: readonly LinhaDeFora[]
  /** Depois do "Desfazer": quantos ficaram porque já foram mudados. */
  readonly desfeita: { readonly ficaram: number } | null
}

export interface EstadoDaImportacao {
  readonly passo: Passo | 'concluida'
  /** O passo mais adiante já alcançado com esta planilha: dá para voltar e avançar sem refazer. */
  readonly alcancado: Passo
  readonly planilha: PlanilhaCarregada | null
  readonly aba: number
  readonly destinos: readonly Destino[]
  readonly correcoes: Readonly<Record<number, Correcao>>
  readonly marcas: Readonly<Record<number, boolean>>
  /** Quantas páginas de 50 linhas a prévia mostra (CA-1931). */
  readonly paginas: number
  readonly aviso: AvisoDaPrevia | null
  readonly resultado: ResultadoDaImportacao | null
}

export const ESTADO_INICIAL: EstadoDaImportacao = {
  passo: 'arquivo',
  alcancado: 'arquivo',
  planilha: null,
  aba: 0,
  destinos: [],
  correcoes: {},
  marcas: {},
  paginas: 1,
  aviso: null,
  resultado: null,
}

const ORDEM: readonly Passo[] = ['arquivo', 'colunas', 'previa']
export const maisAdiante = (a: Passo, b: Passo): Passo => (ORDEM.indexOf(a) >= ORDEM.indexOf(b) ? a : b)

/** CA-1932: trocar o arquivo recomeça do zero, já no passo Colunas. */
export function comPlanilha(nome: string, lida: PlanilhaLida): EstadoDaImportacao {
  return {
    ...ESTADO_INICIAL,
    passo: 'colunas',
    alcancado: 'colunas',
    planilha: { nome, lida },
    aba: lida.abaInicial,
    destinos: lida.abas[lida.abaInicial]?.analise.destinos ?? [],
  }
}

/** CA-1908: trocar a aba relê as colunas; as correções e as marcas eram das linhas da outra. */
export function comAba(estado: EstadoDaImportacao, aba: number): EstadoDaImportacao {
  const analise = estado.planilha?.lida.abas[aba]?.analise
  if (analise === undefined) return estado
  return { ...estado, aba, alcancado: 'colunas', destinos: analise.destinos, correcoes: {}, marcas: {}, paginas: 1, aviso: null }
}
