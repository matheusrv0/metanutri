// "Receber meu link por e-mail" e "Avisos por e-mail" no link (spec lado-do-paciente, D-1221, D-1226, CA-2235 a CA-2237,
// CA-2240, CA-2242, CA-2256 e CB-1216).
import { screen, within } from '@testing-library/react'
import { abrirComFolhas, clienteDasFolhas } from './folhasDoLink.test-utils.tsx'
import { DADOS } from './linkDeTeste.test-utils.tsx'

beforeEach(() => localStorage.clear())

const abrirReceber = async (...args: Parameters<typeof abrirComFolhas>) => {
  const aberto = await abrirComFolhas(...args)
  await aberto.usuario.click(screen.getByRole('button', { name: 'Receber meu link por e-mail' }))
  return aberto
}

describe('CA-2235: o e-mail', () => {
  it('CA-2235: com e-mail na ficha, o campo mostra "j•••a@gmail.com" com "Usar outro"; enviar usa o da ficha e diz para onde foi', async () => {
    const { cliente, chamadas } = clienteDasFolhas(() => ({ status: 200, corpo: { enviadoPara: 'j•••a@gmail.com', confirmar: false } }))
    const { usuario, link } = await abrirReceber({ cliente })
    const folha = screen.getByRole('dialog', { name: 'Receber por e-mail' })
    expect(folha).toHaveTextContent('j•••a@gmail.com')
    expect(within(folha).getByRole('button', { name: 'Usar outro' })).toBeInTheDocument()
    await usuario.click(within(folha).getByRole('button', { name: 'Enviar' }))
    expect(chamadas.at(-1)).toEqual({ tipo: 'funcao', nome: 'meu-link', corpo: { acao: 'receber', token: link.token, usarDaFicha: true, avisos: [] } })
    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos o link para j•••a@gmail.com.')
    expect(screen.queryByText('Para receber os avisos, toque em Confirmar no e-mail.')).not.toBeInTheDocument()
  })

  it('CA-2291 e CA-2303: com um e-mail digitado, a folha diz que foi o pedido de confirmação, e que o link vem depois dele', async () => {
    const { cliente } = clienteDasFolhas(() => ({ status: 200, corpo: { enviadoPara: 'p•••o@gmail.com', confirmar: true, confirmarEmail: true } }))
    const { usuario } = await abrirReceber({ cliente })
    await usuario.click(screen.getByRole('button', { name: 'Usar outro' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Seu e-mail' }), 'pedro.novo@gmail.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Enviamos um e-mail para p•••o@gmail.com.')
    expect(status).toHaveTextContent('Toque em Confirmar nele para receber o link.')
    expect(status).not.toHaveTextContent('Enviamos o link')
    expect(screen.queryByText('Para receber os avisos, toque em Confirmar no e-mail.')).not.toBeInTheDocument()
  })

  it('CA-2235: sem e-mail na ficha, o campo vem vazio', async () => {
    await abrirReceber({ dados: { ...DADOS, emailMascarado: null } })
    expect(screen.getByRole('textbox', { name: 'Seu e-mail' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Usar outro' })).not.toBeInTheDocument()
  })

  it('CA-2236: "juliana@gmial.com" vira a pergunta "Você quis dizer juliana@gmail.com?", e um toque corrige', async () => {
    const { usuario } = await abrirReceber()
    await usuario.click(screen.getByRole('button', { name: 'Usar outro' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Seu e-mail' }), 'juliana@gmial.com')
    expect(screen.getByText(/Você quis dizer/)).toHaveTextContent('Você quis dizer juliana@gmail.com?')
    await usuario.click(screen.getByRole('button', { name: 'juliana@gmail.com' }))
    expect(screen.getByRole('textbox', { name: 'Seu e-mail' })).toHaveValue('juliana@gmail.com')
    expect(screen.queryByText(/Você quis dizer/)).not.toBeInTheDocument()
  })

  it('CA-2236: e-mail sem formato: "Confira o e-mail." e nada sai; domínio sem servidor de e-mail: a mesma frase, do servidor', async () => {
    const { cliente, chamadas } = clienteDasFolhas(() => ({ status: 422, corpo: { erro: 'Confira o e-mail.' } }))
    const { usuario } = await abrirReceber({ cliente })
    await usuario.click(screen.getByRole('button', { name: 'Usar outro' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Seu e-mail' }), 'juliana@')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confira o e-mail.')
    expect(chamadas.filter((c) => c.nome === 'meu-link')).toHaveLength(0)

    await usuario.clear(screen.getByRole('textbox', { name: 'Seu e-mail' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Seu e-mail' }), 'juliana@semservidor.example')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira o e-mail.')
    expect(chamadas.at(-1)?.corpo).toMatchObject({ email: 'juliana@semservidor.example' })
  })

  it('CA-2237: o quarto pedido do dia: "Você já pediu 3 vezes hoje. Tente amanhã."', async () => {
    const { cliente } = clienteDasFolhas(() => ({ status: 429, corpo: { erro: 'Você já pediu 3 vezes hoje. Tente amanhã.' } }))
    const { usuario } = await abrirReceber({ cliente })
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você já pediu 3 vezes hoje. Tente amanhã.')
  })

  it('CB-1216: Resend fora do ar: "Não foi possível enviar agora. Tente de novo em alguns minutos."', async () => {
    const { cliente } = clienteDasFolhas(() => 'sem-resposta')
    const { usuario } = await abrirReceber({ cliente })
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar agora. Tente de novo em alguns minutos.')
  })
})

describe('CA-2240 e CA-2242: os avisos na folha', () => {
  it('CA-2240: as caixas vêm desmarcadas, só as oferecidas e ainda não ligadas; com alguma marcada, a folha manda confirmar', async () => {
    const { cliente, chamadas } = clienteDasFolhas(() => ({ status: 200, corpo: { enviadoPara: 'j•••a@gmail.com', confirmar: true } }))
    const dados = { ...DADOS, avisos: { plano: 'desligado', semana: 'desligado', lembrete: 'desligado' } } as const
    const { usuario } = await abrirReceber({ cliente, dados })
    const caixas = within(screen.getByRole('group', { name: 'Avisos' })).getAllByRole('checkbox')
    expect(caixas.map((c) => c.closest('label')?.textContent)).toEqual(['Quando o plano mudar', 'Resumo da semana', 'Lembrete se eu ficar 3 dias sem marcar'])
    expect(caixas.every((c) => !(c as HTMLInputElement).checked)).toBe(true)
    await usuario.click(caixas[1] as HTMLElement)
    await usuario.click(caixas[2] as HTMLElement)
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(chamadas.at(-1)?.corpo).toMatchObject({ avisos: ['semana', 'lembrete'] })
    expect(await screen.findByRole('status')).toHaveTextContent('Para receber os avisos, toque em Confirmar no e-mail.')
  })

  it('CA-2242: o aviso que a nutricionista não oferece não aparece; o já ligado também não', async () => {
    await abrirReceber({ dados: { ...DADOS, avisos: { plano: 'ligado', semana: 'desligado', lembrete: 'nao-oferecido' } } })
    expect(within(screen.getByRole('group', { name: 'Avisos' })).getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual(['Resumo da semana'])
  })

  it('CA-2242: sem nenhum aviso para marcar, a folha só manda o link', async () => {
    await abrirReceber({ dados: { ...DADOS, avisos: { plano: 'nao-oferecido', semana: 'nao-oferecido', lembrete: 'nao-oferecido' } } })
    expect(screen.queryByRole('group', { name: 'Avisos' })).not.toBeInTheDocument()
  })
})

describe('CA-2256: a folha "Avisos por e-mail"', () => {
  const abrirAvisos = async (...args: Parameters<typeof abrirComFolhas>) => {
    const aberto = await abrirComFolhas(...args)
    await aberto.usuario.click(screen.getByRole('button', { name: /Avisos por e-mail/ }))
    return aberto
  }

  it('CA-2256: o endereço mascarado e um interruptor por aviso oferecido', async () => {
    await abrirAvisos({ dados: { ...DADOS, avisos: { plano: 'ligado', semana: 'desligado', lembrete: 'nao-oferecido' } } })
    const folha = screen.getByRole('dialog', { name: 'Avisos por e-mail' })
    expect(folha).toHaveTextContent('j•••a@gmail.com')
    expect(within(folha).getByRole('switch', { name: 'Plano atualizado' })).toBeChecked()
    expect(within(folha).getByRole('switch', { name: 'Resumo da semana' })).not.toBeChecked()
    expect(within(folha).queryByRole('switch', { name: 'Lembrete' })).not.toBeInTheDocument()
    expect(folha).toHaveTextContent('Quando Ana Lima mudar o plano')
    expect(folha).toHaveTextContent('Ligar um aviso manda um e-mail de confirmação.')
  })

  it('CA-2256: desligar vale na hora (pela função do banco); a folha "Meu plano" passa a contar um a menos', async () => {
    const { cliente, chamadas } = clienteDasFolhas()
    const { usuario, link } = await abrirAvisos({ cliente })
    await usuario.click(screen.getByRole('switch', { name: 'Plano atualizado' }))
    expect(screen.getByRole('switch', { name: 'Plano atualizado' })).not.toBeChecked()
    expect(chamadas.find((c) => c.nome === 'desligar_aviso')).toEqual({ tipo: 'rpc', nome: 'desligar_aviso', corpo: { p_token: link.token, p_tipo: 'plano' } })
  })

  it('CA-2256: ligar manda o e-mail de confirmação daquele aviso, e o aviso espera a confirmação', async () => {
    const { cliente, chamadas } = clienteDasFolhas(() => ({ status: 200, corpo: { enviadoPara: 'j•••a@gmail.com' } }))
    const { usuario, link } = await abrirAvisos({ cliente })
    await usuario.click(screen.getByRole('switch', { name: 'Lembrete' }))
    expect(chamadas.at(-1)).toEqual({ tipo: 'funcao', nome: 'meu-link', corpo: { acao: 'ligar', token: link.token, tipo: 'lembrete' } })
    expect(await screen.findByText('Confirme no e-mail para ligar.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Lembrete' })).not.toBeChecked()
  })

  it('sem e-mail no link, "Avisos por e-mail" começa por receber o link por e-mail', async () => {
    const { usuario } = await abrirComFolhas({ dados: { ...DADOS, emailMascarado: null } })
    await usuario.click(screen.getByRole('button', { name: /Avisos por e-mail/ }))
    expect(screen.getByRole('dialog', { name: 'Receber por e-mail' })).toBeInTheDocument()
  })
})
