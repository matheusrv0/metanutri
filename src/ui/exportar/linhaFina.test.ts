import { regraDaLinhaFina } from './linhaFina.ts'

describe('linha fina do topo (CA-316)', () => {
  it('põe os dois textos nas margens do @page e some na primeira página', () => {
    const css = regraDaLinhaFina('Plano alimentar · Maria', 'Ana Souza · CRN-6 12345')
    expect(css).toContain('@media print')
    expect(css).toContain('@top-left { content: "Plano alimentar · Maria"')
    expect(css).toContain('@top-right { content: "Ana Souza · CRN-6 12345"')
    expect(css).toMatch(/@page :first \{ @top-left \{ content: none; \} @top-right \{ content: none; \} \}/)
  })

  it('Foco de revisão 3: aspas, barra invertida e quebra de linha não quebram o CSS', () => {
    const css = regraDaLinhaFina('Plano alimentar · Maria "Mari" \\ 2\nfim', '')
    expect(css).toContain('content: "Plano alimentar · Maria \\"Mari\\" \\\\ 2 fim"')
    expect(css).toContain('@top-right { content: ""')
  })
})
