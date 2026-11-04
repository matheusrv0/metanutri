// A cor da nutricionista no link do paciente (spec marca-no-link, D-953 a D-955). Tudo aqui é conta: o contraste da
// WCAG 2.2, a mesma cor mais escura (a sugestão de quando a cor é recusada) e a mesma cor mais clara (a do celular no
// tema escuro). Nenhuma tela sabe fazer essas contas; elas pedem a este arquivo.

/*
 * DP-ML-21: estes hexadecimais são dados da SPEC, usados em conta, não valores de desenho. As seis cores prontas são
 * do D-953; o branco é o texto por cima da cor no tema claro (D-954); o fundo escuro do link é o `--carvao-900` dos
 * tokens (D-955), conferido no teste. A tela nunca os escreve: ela usa os tokens.
 */
/* eslint-disable no-restricted-syntax */
/** "Padrão do MetaNutri": o teal da marca (`--teal-900`). Escolher esta é o mesmo que não ter cor própria (D-953). */
export const COR_PADRAO = '#0e3b43'
/** O texto que vai por cima da cor no tema claro (D-954). */
export const BRANCO = '#ffffff'
/** O fundo do link no tema escuro, que também é o texto por cima da cor no escuro (D-955). */
export const FUNDO_ESCURO_DO_LINK = '#101a1d'

export interface CorPronta {
  readonly nome: string
  /** `#rrggbb`, em minúscula. */
  readonly valor: string
}

/** D-953: seis cores prontas. Nenhuma é violeta, laranja da marca ou verde de estado. */
export const CORES_PRONTAS: readonly CorPronta[] = [
  { nome: 'Padrão do MetaNutri', valor: COR_PADRAO },
  { nome: 'Verde-água', valor: '#0f6e66' },
  { nome: 'Verde-folha', valor: '#3f5f2a' },
  { nome: 'Azul', valor: '#1f4e8c' },
  { nome: 'Vinho', valor: '#7a2944' },
  { nome: 'Rosa-escuro', valor: '#b5476b' },
]
/* eslint-enable no-restricted-syntax */

/** D-954: texto comum pede 4,5:1 (WCAG 2.2, critério 1.4.3). */
export const CONTRASTE_MINIMO = 4.5
/** D-955: a versão do escuro fica na claridade do teal claro do app. */
export const CONTRASTE_DO_ESCURO = 7

/** Passo da claridade HSL ao escurecer ou clarear (DP-ML-6, o mesmo do protótipo). */
const PASSO = 0.01
const PASSOS_NO_MAXIMO = 120

/** "#1F4E8C", "1f4e8c", " #1f4e8C " viram "#1f4e8c"; o resto não é cor (CA-1958). */
export function normalizarCor(texto: string): string | null {
  const limpo = texto.trim()
  const casou = /^#?([0-9a-fA-F]{6})$/.exec(limpo)
  return casou?.[1] ? `#${casou[1].toLowerCase()}` : null
}

/** CB-960: a padrão, escolhida ou digitada, e a falta de cor são a mesma coisa. */
export const ehCorPadrao = (cor: string | null): boolean => cor === null || cor === COR_PADRAO

type Rgb = readonly [number, number, number]

const canais = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb

/** A linearização do sRGB da WCAG 2.2 (o limite de 0,04045 da norma atual). */
function linear(canal: number): number {
  const c = canal / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminância relativa da WCAG 2.2, de 0 (preto) a 1 (branco). */
export function luminancia(hex: string): number {
  const [r, g, b] = canais(hex)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** A razão de contraste da WCAG 2.2, de 1 a 21, sem arredondar (D-954: a comparação usa o valor exato). */
export function contraste(a: string, b: string): number {
  const x = luminancia(a)
  const y = luminancia(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

interface Hsl {
  readonly h: number
  readonly s: number
  readonly l: number
}

function paraHsl(hex: string): Hsl {
  const [r, g, b] = canais(hex).map((c) => c / 255) as unknown as Rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h / 6, s, l }
}

function deHsl({ h, s, l }: Hsl): string {
  const canal = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(0)}${canal(8)}${canal(4)}`
}

/**
 * A mesma cor (mesmo matiz e saturação), com a claridade andando em `passo` até ter `minimo` de contraste com `alvo`.
 * Na ponta (preto ou branco) ela para: o branco e o preto passam em qualquer conta deste arquivo.
 */
function andarAte(cor: string, alvo: string, minimo: number, passo: number): string {
  const { h, s, l: inicio } = paraHsl(cor)
  let l = inicio
  let atual = cor
  for (let i = 0; i < PASSOS_NO_MAXIMO && contraste(atual, alvo) < minimo; i++) {
    l = Math.max(0, Math.min(1, l + passo))
    atual = deHsl({ h, s, l })
  }
  return atual
}

export interface AvaliacaoDaCor {
  /** Contraste com o texto branco, sem arredondar. */
  readonly contraste: number
  /** 4,5:1 ou mais com o branco (D-954). */
  readonly aceita: boolean
  /** A própria cor, se aceita; senão, a mesma cor escurecida até passar (o "Usar #XXXXXX"). */
  readonly sugestao: string
  /** A versão do tema escuro: a mesma cor clareada até 7:1 contra o fundo escuro do link (D-955). */
  readonly escuro: string
}

/** Tudo o que a tela e o link precisam saber de uma cor `#rrggbb`. */
export function avaliarCor(cor: string): AvaliacaoDaCor {
  const comBranco = contraste(cor, BRANCO)
  const aceita = comBranco >= CONTRASTE_MINIMO
  return {
    contraste: comBranco,
    aceita,
    sugestao: aceita ? cor : andarAte(cor, BRANCO, CONTRASTE_MINIMO, -PASSO),
    escuro: andarAte(cor, FUNDO_ESCURO_DO_LINK, CONTRASTE_DO_ESCURO, PASSO),
  }
}

/** "8,31". Uma cor recusada nunca aparece como "4,50" pelo arredondamento: aparece "4,49" (CA-1961). */
export function formatarContraste(razao: number): string {
  const texto = razao < CONTRASTE_MINIMO && Number(razao.toFixed(2)) >= CONTRASTE_MINIMO ? '4.49' : razao.toFixed(2)
  return texto.replace('.', ',')
}

/** "#1F4E8C": o código como a tela mostra. */
export const codigoDaCor = (cor: string): string => cor.toUpperCase()

/** O nome da cor pronta, ou nulo para outra cor. */
export const nomeDaCorPronta = (cor: string | null): string | null => CORES_PRONTAS.find((c) => c.valor === (cor ?? COR_PADRAO))?.nome ?? null
