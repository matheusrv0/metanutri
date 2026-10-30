// O CSV da planilha: os bytes viram texto e o texto vira registros (spec importar-pacientes, D-903).
//
// O Excel no Brasil salva CSV com ponto e vírgula em Windows-1252 (o "ANSI"); o Google Planilhas, com vírgula em
// UTF-8; o "Texto Unicode" do Excel, com tabulação em UTF-16. A nutricionista não precisa saber qual é: o app tenta o
// UTF-8 estrito e, se falhar, lê como Windows-1252, que contém o Latin-1.

export type Codificacao = 'utf-8' | 'windows-1252' | 'utf-16le' | 'utf-16be'

export interface TextoLido {
  readonly texto: string
  readonly codificacao: Codificacao
}

/** O texto do arquivo. O BOM decide; sem ele, UTF-8 estrito e, se falhar, Windows-1252 (CB-902). */
export function decodificar(bytes: Uint8Array): TextoLido {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { texto: new TextDecoder('utf-16le').decode(bytes), codificacao: 'utf-16le' }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { texto: new TextDecoder('utf-16be').decode(bytes), codificacao: 'utf-16be' }
  try {
    // O decodificador tira o BOM de UTF-8 sozinho: "Nome" chega inteiro ao primeiro cabeçalho (CA-1904).
    return { texto: new TextDecoder('utf-8', { fatal: true }).decode(bytes), codificacao: 'utf-8' }
  } catch {
    return { texto: new TextDecoder('windows-1252').decode(bytes), codificacao: 'windows-1252' }
  }
}

export type Separador = ';' | ',' | '\t'

/** A ordem de preferência no empate: ponto e vírgula (o Excel brasileiro), tabulação, vírgula. */
const CANDIDATOS: readonly Separador[] = [';', '\t', ',']

export interface Registro {
  /** O número da linha, como o Excel mostra: a célula com quebra de linha conta uma vez. */
  readonly numero: number
  readonly celulas: string[]
}

const ASPAS = 34
const CR = 13
const LF = 10

/**
 * Os registros do texto, um por vez (RFC 4180): aspas em volta da célula, aspas duplicadas dentro dela e separador e
 * quebra de linha dentro das aspas. Aspas no meio de uma célula sem aspas ficam como texto. A quebra pode ser CRLF, LF
 * ou só CR. Um gerador: quem lê pode parar no meio (o limite de linhas, CA-1910) e dar a vez ao navegador (CB-911).
 */
export function* lerRegistros(texto: string, separador: Separador): Generator<Registro> {
  const sep = separador.charCodeAt(0)
  const tamanho = texto.length
  let i = 0
  let numero = 0
  while (i < tamanho) {
    const celulas: string[] = []
    let fimDoRegistro = false
    while (!fimDoRegistro) {
      let valor = ''
      if (texto.charCodeAt(i) === ASPAS) {
        // Célula entre aspas: vai até a aspa que não é seguida de outra.
        i += 1
        let inicio = i
        for (;;) {
          const proxima = texto.indexOf('"', i)
          if (proxima < 0) {
            valor += texto.slice(inicio)
            i = tamanho
            break
          }
          if (texto.charCodeAt(proxima + 1) === ASPAS) {
            valor += texto.slice(inicio, proxima + 1)
            i = proxima + 2
            inicio = i
            continue
          }
          valor += texto.slice(inicio, proxima)
          i = proxima + 1
          break
        }
        // O que vier depois da aspa que fecha, até o separador, entra como texto (arquivo fora da regra).
        const resto = i
        while (i < tamanho && texto.charCodeAt(i) !== sep && texto.charCodeAt(i) !== LF && texto.charCodeAt(i) !== CR) i += 1
        valor += texto.slice(resto, i)
      } else {
        const inicio = i
        while (i < tamanho && texto.charCodeAt(i) !== sep && texto.charCodeAt(i) !== LF && texto.charCodeAt(i) !== CR) i += 1
        valor = texto.slice(inicio, i)
      }
      celulas.push(valor)
      const codigo = texto.charCodeAt(i)
      if (i < tamanho && codigo === sep) {
        i += 1
        // Separador no fim do arquivo: a última célula existe e é vazia.
        if (i >= tamanho) {
          celulas.push('')
          fimDoRegistro = true
        }
        continue
      }
      if (codigo === CR) i += texto.charCodeAt(i + 1) === LF ? 2 : 1
      else if (codigo === LF) i += 1
      fimDoRegistro = true
    }
    numero += 1
    yield { numero, celulas }
  }
}

/** O registro tem alguma célula com texto. */
export const registroComTexto = (celulas: readonly string[]): boolean => celulas.some((c) => c.trim() !== '')

/**
 * O separador é o que dá o mesmo número de campos nas primeiras linhas, fora das aspas (D-903). Conta nas 10 primeiras
 * linhas com texto; a que mais se repete, com mais de um campo, vence. Linha de título (um campo só) não atrapalha.
 * Sem nenhum candidato, ponto e vírgula: numa coluna só, ele não corta "Souza, Ana".
 */
export function detectarSeparador(texto: string): Separador {
  const amostra = texto.slice(0, 64 * 1024)
  let melhor: { separador: Separador; linhas: number; campos: number } | null = null
  for (const separador of CANDIDATOS) {
    const contas: number[] = []
    for (const registro of lerRegistros(amostra, separador)) {
      if (!registroComTexto(registro.celulas)) continue
      contas.push(registro.celulas.length)
      if (contas.length === 10) break
    }
    const frequencia = new Map<number, number>()
    for (const campos of contas) if (campos > 1) frequencia.set(campos, (frequencia.get(campos) ?? 0) + 1)
    for (const [campos, linhas] of frequencia) {
      if (melhor === null || linhas > melhor.linhas || (linhas === melhor.linhas && campos > melhor.campos)) melhor = { separador, linhas, campos }
    }
  }
  return melhor?.separador ?? ';'
}
