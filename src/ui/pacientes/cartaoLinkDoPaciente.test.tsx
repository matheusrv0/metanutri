// O cartão "Link do paciente" na ficha (spec lado-do-paciente, D-1208, D-1214, D-1215, CA-2212 a CA-2214, CA-2239,
// CA-2254, CA-2260 e CA-2262).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { emailsFalsos, linhaDeEmails } from '@/domain/emailsFalsos.test-utils.ts'
import { montarFichaComLink } from './fichaComLink.test-utils.tsx'

const cartao = () => within(screen.getByRole('heading', { name: 'Link do paciente' }).closest('[aria-labelledby]') as HTMLElement)

describe('CA-2260: o cartão "Link do paciente" na ficha', () => {
  it('CA-2260: endereço, Copiar, WhatsApp, E-mail, o plano que está no link, a dieta, a mensagem e "Trocar o endereço"', () => {
    const { link } = montarFichaComLink()
    const c = cartao()
    expect((c.getByRole('textbox', { name: 'Endereço do link' }) as HTMLInputElement).value).toContain(`/p/${link?.token ?? ''}`)
    expect(c.getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    expect(c.getByRole('button', { name: /WhatsApp/ })).toBeInTheDocument()
    expect(c.getByRole('button', { name: 'E-mail' })).toBeInTheDocument()
    expect(c.getByText('No link: Plano de 03/11/2026')).toBeInTheDocument()
    expect(c.getByText('Atualizado')).toBeInTheDocument()
    expect(c.getByRole('checkbox', { name: 'Mostrar a dieta no link' })).toBeInTheDocument()
    expect(c.getByRole('textbox', { name: 'Mensagem para Juliana' })).toBeInTheDocument()
    expect(c.getByText('A mensagem aparece em Hoje, no link. Não vai por e-mail.')).toBeInTheDocument()
    expect(c.getByRole('button', { name: 'Trocar o endereço' })).toBeInTheDocument()
  })

  it('D-359: o cartão do link vem depois da próxima consulta', () => {
    montarFichaComLink()
    const consulta = screen.getByRole('heading', { name: 'Próxima consulta' })
    const link = screen.getByRole('heading', { name: 'Link do paciente' })
    expect(consulta.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem link, a ficha não mostra o cartão', () => {
    montarFichaComLink({ link: null })
    expect(screen.queryByRole('heading', { name: 'Link do paciente' })).not.toBeInTheDocument()
  })

  it('CA-2239: o canto do cartão diz o último acesso e a última marcação', () => {
    montarFichaComLink({ link: { ultimoAcesso: '2026-11-03', marcacoes: [{ dia: '2026-10-29', feitas: ['agua'] }] } })
    expect(cartao().getByText('Abriu hoje · marcou há 5 dias')).toBeInTheDocument()
  })
})

describe('CA-2212 e CA-2213: a mensagem para o paciente', () => {
  it('CA-2212: salvar grava a mensagem no link, com a data, e o cartão diz "No link desde 3/11"', async () => {
    const { usuario, links } = montarFichaComLink()
    const campo = cartao().getByRole('textbox', { name: 'Mensagem para Juliana' })
    await usuario.type(campo, 'Foco no café da manhã.')
    expect(cartao().getByText('22 de 400')).toBeInTheDocument()
    await usuario.click(cartao().getByRole('button', { name: 'Salvar mensagem' }))
    await waitFor(() => expect(links.porId('link-1')?.mensagem).toBe('Foco no café da manhã.'))
    expect(links.porId('link-1')?.mensagemEm).toMatch(/^2026-|^\d{4}-/)
    expect(await cartao().findByText(/^No link desde \d{1,2}\/\d{2}$/)).toBeInTheDocument()
    expect(links.listar()).toHaveLength(1)
  })

  it('CA-2212: apagar o texto e salvar tira a mensagem do link', async () => {
    const { usuario, links } = montarFichaComLink({ link: { mensagem: 'Antiga', mensagemEm: '2026-11-01T12:00:00.000Z' } })
    expect(cartao().getByText('No link desde 1/11')).toBeInTheDocument()
    await usuario.clear(cartao().getByRole('textbox', { name: 'Mensagem para Juliana' }))
    await usuario.click(cartao().getByRole('button', { name: 'Salvar mensagem' }))
    await waitFor(() => expect(links.porId('link-1')?.mensagem ?? null).toBeNull())
  })

  it('CA-2213: com 401 caracteres, o cartão não salva e diz "Até 400 caracteres."', () => {
    const { links } = montarFichaComLink()
    const campo = cartao().getByRole('textbox', { name: 'Mensagem para Juliana' })
    fireEvent.change(campo, { target: { value: 'a'.repeat(401) } })
    expect(cartao().getByText('Até 400 caracteres.')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(cartao().getByRole('button', { name: 'Salvar mensagem' })).toBeDisabled()
    fireEvent.change(campo, { target: { value: 'a'.repeat(400) } })
    expect(cartao().getByText('400 de 400')).toBeInTheDocument()
    expect(links.porId('link-1')?.mensagem ?? null).toBeNull()
  })
})

describe('CA-2214: a próxima consulta da ficha sobe para o link', () => {
  it('CA-2214: a consulta da ficha vai para o link, e mudar a ficha muda o link sem link novo', async () => {
    const { links, link } = montarFichaComLink({ paciente: { proximaConsulta: '2026-11-17T14:30' } })
    await waitFor(() => expect(links.porId('link-1')?.proximaConsulta).toBe('2026-11-17T14:30'))
    const grupo = within(screen.getByRole('group', { name: 'Próxima consulta' }))
    fireEvent.change(grupo.getByLabelText('Horário'), { target: { value: '15:00' } })
    await waitFor(() => expect(links.porId('link-1')?.proximaConsulta).toBe('2026-11-17T15:00'))
    expect(links.porId('link-1')?.token).toBe(link?.token)
  })
})

describe('CA-2262 e CA-2254: o link por e-mail', () => {
  it('CA-2262: "E-mail" pergunta "Enviar o link para juliana.martins@gmail.com?" e manda o S2 pelo servidor', async () => {
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() }, funcao: { 'enviar-link': { status: 200, corpo: { enviadoPara: 'juliana.martins@gmail.com' } } } })
    const { usuario } = montarFichaComLink({ cliente })
    await waitFor(() => expect(cartao().getByRole('button', { name: 'E-mail' })).toBeEnabled())
    await usuario.click(cartao().getByRole('button', { name: 'E-mail' }))
    const dialogo = screen.getByRole('dialog', { name: 'Enviar o link por e-mail' })
    expect(within(dialogo).getByText('Enviar o link para juliana.martins@gmail.com?')).toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(chamadas.find((c) => c.nome === 'enviar-link')?.corpo).toEqual({ acao: 'enviar', link: 'link-1' }))
    expect(await screen.findByText('Link enviado para j•••s@gmail.com.')).toBeInTheDocument()
  })

  it('CA-2262: no trigésimo primeiro envio do dia, o diálogo diz "Você chegou a 30 e-mails hoje. Amanhã volta."', async () => {
    const { cliente } = emailsFalsos({
      rpc: { emails_do_link: linhaDeEmails() },
      funcao: { 'enviar-link': { status: 429, corpo: { erro: 'Você chegou a 30 e-mails hoje. Amanhã volta.' } } },
    })
    const { usuario } = montarFichaComLink({ cliente })
    await waitFor(() => expect(cartao().getByRole('button', { name: 'E-mail' })).toBeEnabled())
    await usuario.click(cartao().getByRole('button', { name: 'E-mail' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enviar' }))
    expect(await within(screen.getByRole('dialog')).findByText('Você chegou a 30 e-mails hoje. Amanhã volta.')).toBeInTheDocument()
  })

  it('CA-2254: depois de "Parar todos os e-mails deste plano", o botão diz que Juliana pediu para não receber', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ parou_tudo_em: '2026-11-02T12:00:00Z' }) } })
    montarFichaComLink({ cliente })
    expect(await cartao().findByText('Juliana pediu para não receber e-mails.')).toBeInTheDocument()
    expect(cartao().getByRole('button', { name: 'E-mail' })).toBeDisabled()
  })

  it('sem servidor de e-mail, o botão E-mail fica desativado', () => {
    montarFichaComLink({ cliente: null })
    expect(cartao().getByRole('button', { name: 'E-mail' })).toBeDisabled()
  })
})
