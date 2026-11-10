// "Avisos por e-mail", "Próximo e-mail" e "Enviados" na ficha (spec lado-do-paciente, D-1227, CA-2260 a CA-2265,
// DP-LP-7, DP-LP-25 e DP-LP-30).
import { screen, waitFor, within } from '@testing-library/react'
import { emailsFalsos, linhaDeEmails } from '@/domain/emailsFalsos.test-utils.ts'
import { montarFichaComLink } from './fichaComLink.test-utils.tsx'

const cartao = (titulo: string) => within(screen.getByRole('heading', { name: titulo }).closest('[aria-labelledby]') as HTMLElement)
const aceite = (tipo: string, extra: Readonly<Record<string, unknown>> = {}) => ({ tipo, aceito_em: '2026-10-22T12:43:00Z', saiu_em: null, pausado_em: null, ...extra })

describe('CA-2260: o cartão "Avisos por e-mail"', () => {
  it('CA-2260: o endereço com a origem, os três avisos com o interruptor e o estado, e o texto do rodapé', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ aceites: [aceite('plano'), aceite('semana'), aceite('lembrete')] }) } })
    montarFichaComLink({ cliente })
    const c = cartao('Avisos por e-mail')
    expect(await c.findByText('juliana.martins@gmail.com')).toBeInTheDocument()
    expect(c.getByText('da ficha · avisos aceitos por Juliana em 22/10')).toBeInTheDocument()
    expect(c.getByText('Teto: 1 por dia, 3 por semana')).toBeInTheDocument()
    for (const aviso of ['Plano atualizado', 'Resumo da semana', 'Lembrete']) expect(c.getByRole('switch', { name: `Oferecer ${aviso}` })).toBeChecked()
    expect(c.getAllByText('Recebe')).toHaveLength(3)
    expect(c.getByText('Toda quinta, às 8h')).toBeInTheDocument()
    expect(c.getByText('O interruptor é seu: oferece ou desliga o aviso. O paciente escolhe o que recebe e sai pelo próprio e-mail.')).toBeInTheDocument()
  })

  it('CA-2260: "confirmado por Juliana em 03/11" quando o e-mail veio do link', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ origem: 'paciente', confirmado_em: '2026-11-03T12:00:00Z' }) } })
    montarFichaComLink({ cliente })
    expect(await cartao('Avisos por e-mail').findByText('confirmado por Juliana em 03/11')).toBeInTheDocument()
  })

  it('DP-LP-7: ao abrir a ficha, o e-mail dela vai para o link', async () => {
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
    montarFichaComLink({ cliente })
    await waitFor(() => expect(chamadas.find((c) => c.nome === 'definir_email_da_ficha')?.corpo).toEqual({ p_link: 'link-1', p_email: 'juliana.martins@gmail.com' }))
  })

  it('DP-LP-30: sem o 017 (ou sem internet), o cartão diz "Indisponível no momento."', async () => {
    const { cliente } = emailsFalsos({ rpcComErro: ['emails_do_link', 'definir_email_da_ficha'] })
    montarFichaComLink({ cliente })
    expect(await cartao('Avisos por e-mail').findByText('Indisponível no momento.')).toBeInTheDocument()
  })
})

describe('CA-2261: sem e-mail', () => {
  it('CA-2261: "Sem e-mail" com "Cadastrar na ficha", que leva o cursor ao campo E-mail', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ email: null, origem: null }) } })
    const { usuario } = montarFichaComLink({ cliente, paciente: { email: '' } })
    const c = cartao('Avisos por e-mail')
    expect(await c.findByText('Sem e-mail')).toBeInTheDocument()
    expect(c.getByText('Juliana não tem e-mail na ficha.')).toBeInTheDocument()
    await usuario.click(c.getByRole('button', { name: 'Cadastrar na ficha' }))
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
  })
})

describe('CA-2263: o interruptor da nutricionista', () => {
  it('CA-2263: desligar vale na hora: o estado vira "Desligado por você" e a nuvem recebe as ofertas', async () => {
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ aceites: [aceite('lembrete')] }) } })
    const { usuario } = montarFichaComLink({ cliente })
    const c = cartao('Avisos por e-mail')
    await usuario.click(await c.findByRole('switch', { name: 'Oferecer Lembrete' }))
    expect(c.getByRole('switch', { name: 'Oferecer Lembrete' })).not.toBeChecked()
    expect(c.getByText('Desligado por você')).toBeInTheDocument()
    await waitFor(() => expect(chamadas.find((x) => x.nome === 'definir_ofertas')?.corpo).toEqual({ p_link: 'link-1', p_plano: true, p_semana: true, p_lembrete: false }))
  })
})

describe('D-1227: o convite', () => {
  it('D-1227: "Enviar convite" manda o S2 com o pedido de aceite', async () => {
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
    const { usuario } = montarFichaComLink({ cliente })
    const c = cartao('Avisos por e-mail')
    expect(await c.findAllByText('Sem aceite')).toHaveLength(3)
    await usuario.click(c.getByRole('button', { name: 'Enviar convite' }))
    await waitFor(() => expect(chamadas.find((x) => x.nome === 'enviar-link')?.corpo).toEqual({ acao: 'convite', link: 'link-1' }))
    expect(await c.findByText('Convite enviado. O próximo, só daqui a um mês.')).toBeInTheDocument()
  })

  it('D-1227: um convite por mês: com o último em 01/11, o botão espera', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ convite_em: '2026-11-01T19:20:00Z' }) } })
    montarFichaComLink({ cliente })
    const c = cartao('Avisos por e-mail')
    expect(await c.findByText('Último convite em 01/11. Um por mês.')).toBeInTheDocument()
    expect(c.getByRole('button', { name: 'Enviar convite' })).toBeDisabled()
    expect(c.getAllByText('Esperando o aceite')).toHaveLength(3)
  })
})

describe('CA-2265: o e-mail devolvido', () => {
  it('CA-2265: o cartão avisa, os avisos dizem "E-mail devolvido", os interruptores travam e o E-mail do link fica desativado', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ email: 'pedro.alves@gmial.com', supressao: 'devolvido' }) } })
    montarFichaComLink({ cliente, paciente: { email: 'pedro.alves@gmial.com' } })
    const c = cartao('Avisos por e-mail')
    expect(await c.findByText('O e-mail voltou: o endereço não existe. Confira na ficha. Nenhum aviso vai até corrigir.')).toBeInTheDocument()
    expect(c.getAllByText('E-mail devolvido')).toHaveLength(3)
    expect(c.getByRole('switch', { name: 'Oferecer Plano atualizado' })).toBeDisabled()
    expect(c.getByRole('button', { name: 'Corrigir na ficha' })).toBeInTheDocument()
    expect(c.queryByRole('button', { name: 'Enviar convite' })).not.toBeInTheDocument()
    expect(cartao('Link do paciente').getByRole('button', { name: 'E-mail' })).toBeDisabled()
  })
})

describe('CA-2264: "Enviados" e o próximo e-mail', () => {
  it('CA-2264: cada linha com o dia e a hora, o tipo, o assunto e o estado; e a linha do próximo', async () => {
    const { cliente } = emailsFalsos({
      rpc: {
        emails_do_link: linhaDeEmails({
          aceites: [aceite('semana')],
          envios: [
            { criado_em: '2026-11-03T13:15:00Z', tipo: 'S2', assunto: 'Ana Lima enviou seu plano', estado: 'entregue' },
            { criado_em: '2026-10-29T11:00:00Z', tipo: 'A2', assunto: 'Sua semana: 2 de 7 dias', estado: 'adiado' },
            { criado_em: '2026-10-22T12:42:00Z', tipo: 'S1', assunto: 'Seu link do plano', estado: 'devolvido' },
          ],
        }),
      },
    })
    montarFichaComLink({ cliente })
    const c = cartao('Enviados')
    const linhas = within(await c.findByRole('list', { name: 'E-mails enviados' })).getAllByRole('listitem')
    expect(linhas).toHaveLength(3)
    expect(linhas[0]).toHaveTextContent('03/11 10:15')
    expect(linhas[0]).toHaveTextContent('Ana Lima enviou seu plano')
    expect(linhas[0]).toHaveTextContent('Serviço')
    expect(linhas[0]).toHaveTextContent('Entregue')
    expect(linhas[1]).toHaveTextContent('Aviso')
    expect(linhas[1]).toHaveTextContent('Adiado pelo teto')
    expect(linhas[2]).toHaveTextContent('Devolvido')
    expect(c.getByText('Próximo: Resumo da semana, quinta, 5/11, 8h')).toBeInTheDocument()
    expect(c.getByText('Últimos 30 dias')).toBeInTheDocument()
  })

  it('CA-2264: sem envio, "Nenhum e-mail enviado."; sem aceite, o próximo diz por quê', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
    montarFichaComLink({ cliente })
    expect(await cartao('Enviados').findByText('Nenhum e-mail enviado.')).toBeInTheDocument()
    expect(await cartao('Próximo e-mail').findByText('Nenhum: Juliana ainda não aceitou os avisos.')).toBeInTheDocument()
  })

  it('DP-LP-25: com o resumo aceito, o "Próximo e-mail" mostra a prévia, com os 7 dias', async () => {
    const { cliente } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ aceites: [aceite('semana')] }) } })
    montarFichaComLink({ cliente, link: { marcacoes: [{ dia: '2026-11-02', feitas: ['agua'] }] } })
    const c = cartao('Próximo e-mail')
    expect(await c.findByText('Sua semana: 1 de 7 dias')).toBeInTheDocument()
    expect(c.getByText('Resumo da semana · quinta, 5/11, 8h · com os dias até agora')).toBeInTheDocument()
    expect(within(c.getByRole('list', { name: 'Os 7 dias do resumo' })).getAllByRole('listitem')).toHaveLength(7)
  })
})
