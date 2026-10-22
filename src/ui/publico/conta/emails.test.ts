// Os modelos de e-mail que o dono cola no painel do Supabase (spec confirmacao-por-codigo, D-91).
import confirmarAcao from '../../../../supabase/emails/confirmar-acao.html?raw'
import confirmarConta from '../../../../supabase/emails/confirmar-conta.html?raw'
import trocarEmail from '../../../../supabase/emails/trocar-email.html?raw'
import trocarSenha from '../../../../supabase/emails/trocar-senha.html?raw'

// CA-1188 (spec textos-e-promessas, D-414): o que fazer se a pessoa não pediu, dito com clareza em cada e-mail.
describe.each([
  ['confirmar-conta.html', confirmarConta, 'Digite este código no site para confirmar seu e-mail.', 'Se você não pediu este código, ignore este e-mail.'],
  ['trocar-senha.html', trocarSenha, 'Digite este código no site para criar uma senha nova.', 'Se você não pediu este código, ignore este e-mail. Sua senha continua a mesma.'],
  [
    'trocar-email.html',
    trocarEmail,
    'Recebemos um pedido para trocar o e-mail da sua conta de {{ .Email }} para {{ .NewEmail }}. Use este código para confirmar.',
    'Se não foi você, não use este código e troque sua senha agora.',
  ],
  ['confirmar-acao.html', confirmarAcao, 'Digite este código no site para continuar.', 'Se você não pediu este código, ignore este e-mail.'],
])('CA-1188: o texto de supabase/emails/%s', (_arquivo, html, abertura, fecho) => {
  it('abre dizendo o que fazer com o código e fecha dizendo o que fazer se a pessoa não pediu', () => {
    expect(html).toContain(`>${abertura}</td>`)
    expect(html).toContain(`>${fecho}</td>`)
    expect(html).not.toMatch(/Pediram para/)
  })
})

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
    expect(html).toMatch(/ignore este e-mail|não use este código/)
  })

  it('tem o nome do MetaNutri em texto', () => {
    expect(html).toMatch(/>MetaNutri</)
  })
})
