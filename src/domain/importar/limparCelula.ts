// A limpeza de cada célula lida (spec importar-pacientes, D-918). O Ctrl-Z que exportações antigas põem no fim do
// arquivo virava um paciente de nome invisível, e um caractere de controle no nome quebra o Word do aconselhamento (o
// XML não o aceita). O Mac escreve "João" com o til separado (NFD), e a busca de Pacientes não o acharia.

const TABULACAO = 9
const QUEBRA = 10
const RETORNO = 13

/** Sem os controles de U+0000 a U+001F (menos tabulação, quebra de linha e retorno), em NFC. */
export function limparCelula(texto: string): string {
  let limpo = ''
  let inicio = 0
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i)
    if (codigo >= 32 || codigo === TABULACAO || codigo === QUEBRA || codigo === RETORNO) continue
    limpo += texto.slice(inicio, i)
    inicio = i + 1
  }
  limpo = inicio === 0 ? texto : limpo + texto.slice(inicio)
  return limpo.normalize('NFC')
}

/** O escape do XLSX para caractere que o XML não aceita (ST_Xstring, ECMA-376): "_x000D_" é o retorno; "_x005F_", "_". */
export function desfazerEscapeDoXlsx(texto: string): string {
  return texto.includes('_x') ? texto.replace(/_x([0-9A-Fa-f]{4})_/g, (_, hexa: string) => String.fromCharCode(parseInt(hexa, 16))) : texto
}
