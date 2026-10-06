import { DOMINIOS_FACULDADE, dominioDoEmail, ehEmailDeFaculdade } from './estudante.ts'

describe('e-mail de faculdade (spec estilo-spora, D-28)', () => {
  const lista = new Set(['usp.br', 'ufrj.br'])

  it('aceita o domínio exato e o subdomínio de aluno', () => {
    expect(ehEmailDeFaculdade('maria@usp.br', lista)).toBe(true)
    expect(ehEmailDeFaculdade('maria@aluno.ufrj.br', lista)).toBe(true)
  })

  it('aceita qualquer .edu.br, que só instituição de ensino registra', () => {
    expect(ehEmailDeFaculdade('joao@alguma.edu.br', lista)).toBe(true)
  })

  it('normaliza maiúscula e espaço antes de conferir', () => {
    expect(ehEmailDeFaculdade('  Maria@Aluno.UFRJ.br ', lista)).toBe(true)
  })

  it('recusa e-mail pessoal e domínio que só parece de faculdade', () => {
    expect(ehEmailDeFaculdade('maria@gmail.com', lista)).toBe(false)
    expect(ehEmailDeFaculdade('maria@falsausp.br', lista)).toBe(false)
    expect(ehEmailDeFaculdade('maria@usp.br.golpe.com', lista)).toBe(false)
  })

  it('recusa texto que não é e-mail', () => {
    expect(ehEmailDeFaculdade('maria', lista)).toBe(false)
    expect(ehEmailDeFaculdade('a@b@usp.br', lista)).toBe(false)
    expect(dominioDoEmail('sem-arroba')).toBeNull()
  })

  it('a lista gerada tem as grandes e as que faltavam na fonte pública', () => {
    expect(DOMINIOS_FACULDADE.size).toBeGreaterThan(190)
    for (const d of ['usp.br', 'ufrj.br', 'unicamp.br', 'unifesp.br', 'unip.br']) expect(DOMINIOS_FACULDADE.has(d)).toBe(true)
  })

  it('funciona com a lista padrão, sem precisar passar uma lista', () => {
    expect(ehEmailDeFaculdade('maria@aluno.unifesp.br')).toBe(true)
  })

  it('aceita o e-mail de aluno da Ânima (RA@ulife.com.br), pedido da primeira estudante em 06/10/2026', () => {
    expect(ehEmailDeFaculdade('12823210957@ulife.com.br')).toBe(true)
  })

  it('recusa e-mail sem parte local antes do @', () => {
    expect(ehEmailDeFaculdade('@usp.br', lista)).toBe(false)
  })
})
