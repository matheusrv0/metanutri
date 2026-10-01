// CA-316: a linha fina no topo das páginas, da segunda em diante, pelas margens do @page.
// Chrome e Edge desenham; navegador que não conhece as margens do @page só não mostra (CB-77).
const textoCss = (texto: string) => `"${texto.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`

export function regraDaLinhaFina(esquerda: string, direita: string): string {
  return [
    '@media print {',
    `  @page { @top-left { content: ${textoCss(esquerda)}; font-size: 9pt; color: dimgray; } @top-right { content: ${textoCss(direita)}; font-size: 9pt; color: dimgray; } }`,
    '  @page :first { @top-left { content: none; } @top-right { content: none; } }',
    '}',
  ].join('\n')
}
