// A medida caseira escrita no rótulo: "4 colheres de sopa", "1 copo (200 ml)", "30 g" (spec alimentos-e-gramaturas,
// correção A, D-433). A RDC 429/2020 manda o rótulo trazer a porção e a medida caseira dela; o cadastro pelo rótulo
// pedia a medida e a jogava fora quando ela não começava por "1".
//
// Módulo sem dependência da base: `produtos.ts` o usa ao montar o alimento próprio, e a base depende de `produtos.ts`.

export interface MedidaLidaDoRotulo {
  /** A medida da porção ("colher de sopa", 4 × 10 g); `null` quando o texto só traz o peso. */
  readonly medida: { readonly nome: string; readonly quantidade: number; readonly gramas: number } | null
  /** O peso da porção: o que está entre parênteses no texto; sem ele, a porção do rótulo. */
  readonly porcaoG: number
}

const UNIDADE_DE_PESO = '(g|gr|grama|gramas|ml|mililitro|mililitros)'
const PESO_ENTRE_PARENTESES = new RegExp(`\\(\\s*(\\d+(?:[.,]\\d+)?)\\s*${UNIDADE_DE_PESO}\\s*\\)`, 'i')
const SO_O_PESO = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${UNIDADE_DE_PESO}$`, 'i')
/** "xícara (chá)" e "colher (sopa)", como muitos rótulos escrevem. */
const TIPO_ENTRE_PARENTESES = /\((chá|cha|sopa|sobremesa|café|cafe)\)/gi

const PALAVRAS: Readonly<Record<string, number>> = { meia: 0.5, meio: 0.5, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5 }
const FRACOES: Readonly<Record<string, number>> = { '½': 0.5, '¼': 0.25, '¾': 0.75 }

const numero = (s: string): number => Number(s.replace(',', '.'))

/** A quantidade no começo do texto: "4", "1,5", "1/2", "½", "meia", "duas". Sem número, 1. */
function lerQuantidade(texto: string): { readonly quantidade: number; readonly resto: string } {
  const fracao = /^(\d+)\s*\/\s*(\d+)\s*/.exec(texto)
  if (fracao?.[1] && fracao[2]) return { quantidade: Number(fracao[2]) === 0 ? Number.NaN : Number(fracao[1]) / Number(fracao[2]), resto: texto.slice(fracao[0].length) }
  const simbolo = /^([½¼¾])\s*/.exec(texto)
  if (simbolo?.[1]) return { quantidade: FRACOES[simbolo[1]] ?? Number.NaN, resto: texto.slice(simbolo[0].length) }
  const algarismo = /^(\d+(?:[.,]\d+)?)\s*/.exec(texto)
  if (algarismo?.[1]) return { quantidade: numero(algarismo[1]), resto: texto.slice(algarismo[0].length) }
  const palavra = /^(\p{L}+)\s+/u.exec(texto)
  const valor = palavra?.[1] ? PALAVRAS[palavra[1].toLowerCase()] : undefined
  if (palavra && valor !== undefined) return { quantidade: valor, resto: texto.slice(palavra[0].length) }
  return { quantidade: 1, resto: texto }
}

/** O texto já começa pela quantidade ("4 colheres", "meia xícara", "½ copo")? "pote" não começa (spec alimentos-e-gramaturas, D-491). */
export function comecaPelaQuantidade(texto: string): boolean {
  const limpo = texto.trim()
  return limpo !== '' && lerQuantidade(limpo).resto !== limpo
}

/** Palavras que já são singulares com "s" no fim (D-496 e D-508): "2 pires" é o pires de metade do peso. */
const SINGULAR_COM_S: ReadonlySet<string> = new Set(['pires', 'lápis', 'simples'])

/** "colheres" → "colher", "porções" → "porção", "fatias" → "fatia", "pães" → "pão". */
function singular(palavra: string): string {
  if (SINGULAR_COM_S.has(palavra.toLowerCase())) return palavra
  if (/ões$/.test(palavra) || /ães$/.test(palavra)) return `${palavra.slice(0, -3)}ão`
  if (/[rz]es$/.test(palavra)) return palavra.slice(0, -2)
  if (/éis$/.test(palavra)) return `${palavra.slice(0, -3)}el`
  if (palavra.length > 3 && palavra.endsWith('s')) return palavra.slice(0, -1)
  return palavra
}

/**
 * O nome da medida no singular, como a base escreve: "colheres de sopa" → "colher de sopa"; "xícaras pequenas" →
 * "xícara pequena". "colher" e "xícara" sozinhas são a de sopa e a de chá, como na entrada rápida (D-372).
 */
function nomeDaMedida(texto: string): string {
  const palavras = texto.toLowerCase().replace(/xicara/g, 'xícara').split(' ').filter((p) => p !== '')
  const [primeira = '', segunda, ...demais] = palavras
  const nome = [singular(primeira), ...(segunda === undefined ? [] : [segunda === 'de' ? segunda : singular(segunda)]), ...demais].join(' ')
  if (nome === 'colher') return 'colher de sopa'
  if (nome === 'xícara') return 'xícara de chá'
  return nome
}

const umaCasa = (n: number): number => Math.round(n * 10) / 10

/**
 * O texto da porção lida na Open Food Facts para o campo "Medida caseira da porção" (Importante 3 da revisão de código):
 * com o peso sempre escrito, porque o produto lido fica gravado por 100 g e a medida não pode virar 100 g. "1 unidade" e
 * 30 g dão "1 unidade (30 g)"; sem texto, "1 porção (30 g)"; texto que já traz o peso fica como está.
 */
export function medidaCaseiraDaLeitura(porcao: { readonly gramas: number; readonly texto: string } | null, unidade: 'g' | 'ml'): string {
  if (!porcao || !(porcao.gramas > 0)) return ''
  const texto = porcao.texto.trim()
  const peso = `${String(umaCasa(porcao.gramas)).replace('.', ',')} ${unidade}`
  if (texto === '') return `1 porção (${peso})`
  return PESO_ENTRE_PARENTESES.test(texto) || SO_O_PESO.test(texto) ? texto : `${texto} (${peso})`
}

/**
 * A medida da porção escrita no rótulo. O peso entre parênteses ("1 copo (200 ml)") vale mais que a porção, porque a
 * leitura da Open Food Facts grava os valores por 100 (Importante 3 da revisão de código). Sem peso no texto, vale
 * `porcaoG`; sem os dois, `null`. Quantidade zero ou peso inválido: só a porção, sem medida.
 */
export function lerMedidaDoRotulo(texto: string, porcaoG: number | null): MedidaLidaDoRotulo | null {
  const limpo = texto.trim().replace(/\s+/g, ' ')
  if (limpo === '') return null
  const entreParenteses = PESO_ENTRE_PARENTESES.exec(limpo)
  let resto = (entreParenteses ? limpo.replace(PESO_ENTRE_PARENTESES, ' ') : limpo).replace(TIPO_ENTRE_PARENTESES, 'de $1').trim().replace(/\s+/g, ' ')
  let total = entreParenteses?.[1] ? numero(entreParenteses[1]) : null
  const soOPeso = SO_O_PESO.exec(resto)
  if (soOPeso?.[1]) {
    total = numero(soOPeso[1])
    resto = ''
  }
  total ??= porcaoG
  if (total === null || !Number.isFinite(total) || !(total > 0)) return null
  if (resto === '') return { medida: null, porcaoG: total }
  const { quantidade, resto: semQuantidade } = lerQuantidade(resto)
  const nome = nomeDaMedida(semQuantidade.replace(/^de\s+/, ''))
  if (nome === '' || !Number.isFinite(quantidade) || !(quantidade > 0)) return { medida: null, porcaoG: total }
  return { medida: { nome, quantidade, gramas: umaCasa(total / quantidade) }, porcaoG: total }
}

/**
 * O nome sem número escrito no plural, no singular (D-508): "fatias" → "fatia", "fatias grossas" → "fatia grossa",
 * "Conchas da casa" → "Concha da casa". O resto fica como foi escrito; o nome no singular não muda.
 */
function noSingular(texto: string): string {
  const [primeira = '', segunda, ...demais] = texto.split(' ')
  const lida = singular(primeira)
  if (lida === primeira) return texto
  // O adjetivo logo depois concorda ("grossas" → "grossa"); "de", "da", "do" ficam.
  const adjetivo = segunda === undefined ? [] : [/^d[aeo]s?$/i.test(segunda) ? segunda : singular(segunda)]
  return [lida, ...adjetivo, ...demais].join(' ')
}

/**
 * Uma linha de "Medidas caseiras" do alimento próprio (spec alimentos-e-gramaturas, D-496; G4 da revisão da publicação
 * 2): o nome que começa por uma quantidade é lido como a medida da porção (D-433 e D-491), com o peso do campo: "2 fatias"
 * com 50 g é a fatia de 25 g, e o paciente nunca lê "2 2s fatiass". O peso entre parênteses sai do nome (vale o do
 * campo); o nome sem número fica como foi escrito, menos o plural, que passa ao singular (D-508: "fatias" com 30 g é a
 * fatia de 30 g, e o paciente nunca lê "2 fatiass").
 */
export function lerMedidaDaLista(nome: string, gramas: number): { readonly nome: string; readonly gramas: number } {
  const semPeso = nome.replace(PESO_ENTRE_PARENTESES, ' ').trim().replace(/\s+/g, ' ')
  if (!comecaPelaQuantidade(semPeso)) return { nome: noSingular(semPeso), gramas }
  if (!(gramas > 0)) return { nome: semPeso, gramas }
  const lida = lerMedidaDoRotulo(semPeso, gramas)?.medida
  return lida ? { nome: lida.nome, gramas: lida.gramas } : { nome: semPeso, gramas }
}
