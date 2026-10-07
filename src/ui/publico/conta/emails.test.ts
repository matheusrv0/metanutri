// Os modelos de e-mail que o dono cola no painel do Supabase (spec confirmacao-por-codigo, D-91).
import confirmarAcao from '../../../../supabase/emails/confirmar-acao.html?raw'
import confirmarConta from '../../../../supabase/emails/confirmar-conta.html?raw'
import trocarEmail from '../../../../supabase/emails/trocar-email.html?raw'
import trocarSenha from '../../../../supabase/emails/trocar-senha.html?raw'

describe.each([
  ['confirmar-conta.html', confirmarConta, 'Seu código do MetaNutri'],
  ['trocar-senha.html', trocarSenha, 'Código para trocar sua senha do MetaNutri'],
  ['trocar-email.html', trocarEmail, 'Código para trocar seu e-mail do MetaNutri'],
  ['confirmar-acao.html', confirmarAcao, 'Seu código do MetaNutri'],
])('CA-413: supabase/emails/%s', (_arquivo, html, assunto) => {
  it('traz o código', () => {
    expect(html).toContain('{{ .Token }}')
  })

  it('não traz link que confirme ou troque nada ao ser aberto (D-89)', () => {
    expect(html).not.toContain('ConfirmationURL')
    expect(html).not.toContain('TokenHash')
    expect(html).not.toMatch(/<a\s/i)
    expect(html).not.toMatch(/https?:\/\//i)
  })

  it('não traz imagem nem rastreio', () => {
    expect(html).not.toMatch(/<img\s/i)
  })

  it('o assunto sugerido vem no comentário do topo', () => {
    expect(html.startsWith(`<!-- Assunto: ${assunto} -->`)).toBe(true)
  })

  it('diz o que fazer se a pessoa não pediu', () => {
    expect(html).toContain('Se não foi você, ignore este e-mail')
  })

  it('tem o nome do MetaNutri em texto', () => {
    expect(html).toMatch(/>MetaNutri</)
  })
})
