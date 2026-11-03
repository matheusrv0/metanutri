// "Baixar as que ficaram de fora" (spec importar-pacientes, D-915): um CSV gerado no navegador, só com as linhas que
// não entraram, as colunas da planilha e o motivo. A nutricionista corrige essas e importa de novo.
import type { Coluna } from './colunas.ts'
import type { Registro, Separador } from './lerTexto.ts'
import type { Previa } from './previa.ts'

export interface LinhaDeFora {
  readonly numero: number
  /** Vazio na linha sem nome. */
  readonly nome: string
  readonly motivo: string
}

/** DP-IP-21: as linhas que não entraram, na ordem da planilha: as não marcadas da prévia, com o motivo, e as sem nome. */
export function linhasDeFora(previa: Previa): LinhaDeFora[] {
  const naoMarcadas = previa.linhas.filter((l) => !l.marcada).map((l) => ({ numero: l.numero, nome: l.nome, motivo: l.motivo }))
  const semNome = previa.semNome.map((numero) => ({ numero, nome: '', motivo: 'Sem nome' }))
  return [...naoMarcadas, ...semNome].sort((a, b) => a.numero - b.numero)
}

/**
 * D-915 e DP-IP-22: a célula que começa com `=`, `+`, `-`, `@` (e tabulação ou retorno, como a OWASP pede) ganha um
 * apóstrofo, para o Excel não rodar uma fórmula escondida nela (injeção de CSV). A que tem aspas, separador ou quebra
 * de linha vai entre aspas, com as aspas duplicadas (RFC 4180).
 */
function celulaDoCsv(valor: string, separador: Separador): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
  return seguro.includes('"') || seguro.includes(separador) || /[\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

export interface PedidoDoCsv {
  readonly colunas: readonly Coluna[]
  /** As linhas de paciente da aba, como vieram da planilha. */
  readonly linhas: readonly Registro[]
  readonly deFora: readonly LinhaDeFora[]
  readonly separador: Separador
}

/** O texto do arquivo, com o BOM do UTF-8 na frente (o Excel o lê com os acentos) e CRLF no fim de cada linha. */
export function csvDasQueFicaramDeFora({ colunas, linhas, deFora, separador }: PedidoDoCsv): string {
  const motivoDe = new Map(deFora.map((l) => [l.numero, l.motivo]))
  const linha = (celulas: readonly string[]) => `${celulas.map((c) => celulaDoCsv(c, separador)).join(separador)}\r\n`
  const corpo = linhas
    .filter((registro) => motivoDe.has(registro.numero))
    .map((registro) => linha([...colunas.map((c) => registro.celulas[c.indice] ?? ''), motivoDe.get(registro.numero) ?? '']))
    .join('')
  return `\uFEFF${linha([...colunas.map((c) => c.nome), 'Motivo'])}${corpo}`
}
