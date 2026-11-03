// Tipos de importar-frisancho.mjs, para o teste de src/data importar o script com tipo.

export interface LinhaDePercentis {
  /** Faixa de idade em anos, como na fonte: 18,0 a 24,9 vale dos 18 anos feitos até a véspera dos 25. */
  readonly de: number
  readonly ate: number
  /** Na ordem de `percentis` da tabela. */
  readonly valores: readonly number[]
}

export interface TabelaDePercentis {
  readonly unidade: string
  readonly marcaM: string
  readonly marcaF: string
  readonly M: readonly LinhaDePercentis[]
  readonly F: readonly LinhaDePercentis[]
}

export interface TabelasDeFrisancho {
  readonly frisancho1990: {
    readonly percentis: readonly number[]
    readonly cb: TabelaDePercentis
    readonly dct: TabelaDePercentis
    readonly ambCorrigida: TabelaDePercentis
    readonly agb: TabelaDePercentis
  }
  readonly frisancho1981: {
    readonly percentis: readonly number[]
    readonly cmb: TabelaDePercentis
    readonly amb: TabelaDePercentis
  }
}

export function extrair(texto: string): TabelasDeFrisancho
