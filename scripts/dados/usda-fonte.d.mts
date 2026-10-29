// Tipos de usda-fonte.mjs, para os testes de src/data importarem o script com tipo.
export interface PorcaoUsda {
  readonly quantidade: number | null
  readonly unidade: string
  readonly modificador: string
  readonly descricao: string
  readonly gramas: number | null
  readonly ordem: number
}

export interface AlimentoUsda {
  readonly fdcId: number
  readonly conjunto: 'SR Legacy' | 'Foundation Foods'
  readonly versao: string
  readonly descricao: string
  readonly categoria: string
  readonly nutrientes: ReadonlyMap<number, number>
  readonly porcoes: readonly PorcaoUsda[]
}

export function sha256(caminho: string): string
export function lerCsv(texto: string): Record<string, string>[]
export function valoresDoAlimento(bruto: Pick<AlimentoUsda, 'descricao' | 'nutrientes'>): Record<string, number | null>
