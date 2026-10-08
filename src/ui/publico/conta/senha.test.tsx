import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Resultado, ValorConta } from '../../estado/usarConta.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaCodigoSenha } from './TelaCodigoSenha.tsx'
import { TelaConfirmarEmail } from './TelaConfirmarEmail.tsx'
import { TelaEsqueciSenha } from './TelaEsqueciSenha.tsx'
import { TelaNovaSenha } from './TelaNovaSenha.tsx'
import { ligarTurnstileFalso } from './turnstileFalso.test-utils.ts'

const campoCodigo = () => screen.getByLabelText('Código de 8 dígitos')

/** Um pedido que só termina quando o teste manda: serve para o clique duplo. */
function pedidoPendurado() {
  let resolver: (valor: Resultado) => void = () => {}
  const promessa = new Promise<Resultado>((resolve) => {
    resolver = resolve
  })
  return { promessa, resolver: (valor: Resultado) => resolver(valor) }
}

function montarConfirmar(sobre: { conta?: ValorConta; email?: string | null; vencido?: boolean } = {}) {
  const props = {
    conta: sobre.conta ?? contaFalsa(),
    email: sobre.email === undefined ? 'maria@exemplo.com' : sobre.email,
    vencido: sobre.vencido ?? false,
    aoIrParaInicio: vi.fn(),
    aoConfirmado: vi.fn(),
  }
  render(<TelaConfirmarEmail {...props} />)
  return props
}

describe('TelaConfirmarEmail (spec confirmacao-por-codigo)', () => {
  afterEach(() => vi.useRealTimers())

  it('CA-406: pede o código de 8 dígitos, só números, com o teclado numérico, e não oferece entrar sem confirmar', () => {
    montarConfirmar()
    expect(screen.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()
    expect(campoCodigo()).toHaveAttribute('inputmode', 'numeric')
    expect(campoCodigo()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Já confirmei, quero entrar' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('CA-406: letra não entra no campo do código', async () => {
    montarConfirmar()
    await userEvent.setup().type(campoCodigo(), '12a3b4')
    expect(campoCodigo()).toHaveValue('1234')
  })

  it('CA-407: o código certo confirma e segue', async () => {
    const confirmado = { ok: true, erro: null, situacao: 'estudante', planoDesejado: 'estudante' } as const
    const conta = contaFalsa({ confirmarCodigo: vi.fn(async () => confirmado) })
    const { aoConfirmado } = montarConfirmar({ conta })
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '12345678')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(conta.confirmarCodigo).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(aoConfirmado).toHaveBeenCalledWith(confirmado)
  })

  it('CA-408: código errado ou vencido avisa e nada mais muda', async () => {
    const conta = contaFalsa({ confirmarCodigo: vi.fn(async () => ({ ok: false, erro: 'codigo-invalido' as const })) })
    const { aoConfirmado } = montarConfirmar({ conta })
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '00000000')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Código errado ou vencido. Confira o último e-mail ou peça outro.')
    expect(campoCodigo()).toHaveValue('00000000')
    expect(campoCodigo()).toHaveAttribute('aria-invalid', 'true')
    expect(aoConfirmado).not.toHaveBeenCalled()
    expect(conta.reenviarConfirmacao).not.toHaveBeenCalled()
  })

  it('código incompleto não vai ao servidor', async () => {
    const conta = contaFalsa()
    montarConfirmar({ conta })
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '1234567')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite os 8 dígitos do código.')
    expect(conta.confirmarCodigo).not.toHaveBeenCalled()
  })

  it('CA-409: "Reenviar o código" manda um código novo e espera 60 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const conta = contaFalsa()
    montarConfirmar({ conta })

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('status')).toHaveTextContent('Mandamos um código novo para maria@exemplo.com.')
    expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeDisabled()

    for (let i = 0; i < 60; i++) act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Reenviar o código' })).toBeEnabled()
  })

  it('CA-409: clique duplo em "Reenviar o código" só manda um pedido', async () => {
    const { promessa, resolver } = pedidoPendurado()
    const conta = contaFalsa({ reenviarConfirmacao: vi.fn(() => promessa) })
    montarConfirmar({ conta })
    const usuario = userEvent.setup()

    await usuario.dblClick(screen.getByRole('button', { name: 'Reenviar o código' }))
    resolver({ ok: true, erro: null })
    await waitFor(() => expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeInTheDocument())

    expect(conta.reenviarConfirmacao).toHaveBeenCalledTimes(1)
  })

  it('CA-410: aberta depois, sem o e-mail na memória, pede o e-mail e o código', async () => {
    const conta = contaFalsa()
    const { aoConfirmado } = montarConfirmar({ conta, email: null })
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria')
    await usuario.type(campoCodigo(), '12345678')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite um e-mail válido')
    expect(conta.confirmarCodigo).not.toHaveBeenCalled()

    await usuario.type(screen.getByLabelText('E-mail'), '@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(conta.confirmarCodigo).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(aoConfirmado).toHaveBeenCalledOnce()
  })

  it.each(['1234 5678', '1234-5678'])('CB-100: o código colado como "%s" conta só os dígitos', async (colado) => {
    const conta = contaFalsa()
    montarConfirmar({ conta })
    const usuario = userEvent.setup()
    await usuario.click(campoCodigo())
    await usuario.paste(colado)
    expect(campoCodigo()).toHaveValue('12345678')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(conta.confirmarCodigo).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
  })

  it('CB-101: clique duplo em "Confirmar" faz um pedido só', async () => {
    const { promessa, resolver } = pedidoPendurado()
    const conta = contaFalsa({ confirmarCodigo: vi.fn(() => promessa) })
    const { aoConfirmado } = montarConfirmar({ conta })
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '12345678')

    await usuario.dblClick(screen.getByRole('button', { name: 'Confirmar' }))
    resolver({ ok: true, erro: null })
    await waitFor(() => expect(aoConfirmado).toHaveBeenCalledOnce())

    expect(conta.confirmarCodigo).toHaveBeenCalledTimes(1)
  })

  it('CB-102: sem internet, a mensagem de falha de rede de sempre e o código continua no campo', async () => {
    const conta = contaFalsa({ confirmarCodigo: vi.fn(async () => ({ ok: false, erro: 'falha-rede' as const })) })
    montarConfirmar({ conta })
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '12345678')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para falar com o servidor. Confira a internet e tente de novo.')
    expect(campoCodigo()).toHaveValue('12345678')
  })

  it('CA-143 e CA-414: link antigo vencido continua com a tela própria e pede um código', async () => {
    const conta = contaFalsa()
    montarConfirmar({ conta, email: null, vencido: true })
    expect(screen.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(campoCodigo()).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Pedir um código' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
  })
})

describe('TelaEsqueciSenha', () => {
  it('CA-412 e CA-144: manda o código e segue para a tela do código, exista a conta ou não', async () => {
    const conta = contaFalsa()
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com')
    expect(aoEnviado).toHaveBeenCalledWith('maria@exemplo.com')
  })

  it('e-mail inválido não vai ao servidor', async () => {
    const conta = contaFalsa()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={vi.fn()} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(conta.pedirTrocaDeSenha).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('sem internet, avisa e fica na mesma tela', async () => {
    const conta = contaFalsa({ pedirTrocaDeSenha: vi.fn(async () => ({ ok: false, erro: 'falha-rede' as const })) })
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para falar com o servidor.')
    expect(aoEnviado).not.toHaveBeenCalled()
  })

  it('clique duplo em "Mandar o código" faz um pedido só', async () => {
    const { promessa, resolver } = pedidoPendurado()
    const conta = contaFalsa({ pedirTrocaDeSenha: vi.fn(() => promessa) })
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.dblClick(screen.getByRole('button', { name: 'Mandar o código' }))
    resolver({ ok: true, erro: null })
    await waitFor(() => expect(aoEnviado).toHaveBeenCalledOnce())
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledTimes(1)
  })
})

function montarCodigoSenha(sobre: { conta?: ValorConta; email?: string | null } = {}) {
  const props = {
    conta: sobre.conta ?? contaFalsa(),
    email: sobre.email === undefined ? 'maria@exemplo.com' : sobre.email,
    aoSenhaTrocada: vi.fn(),
    aoIrParaInicio: vi.fn(),
  }
  render(<TelaCodigoSenha {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function preencherSenha(usuario: ReturnType<typeof userEvent.setup>, codigo: string, senha: string, repetida = senha) {
  await usuario.type(campoCodigo(), codigo)
  await usuario.type(screen.getByLabelText('Senha nova'), senha)
  await usuario.type(screen.getByLabelText('Repita a senha'), repetida)
  await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
}

describe('TelaCodigoSenha (spec confirmacao-por-codigo)', () => {
  it('CA-412: pede o código e a senha nova duas vezes; código certo troca a senha e segue', async () => {
    const { usuario, conta, aoSenhaTrocada } = montarCodigoSenha()
    expect(screen.getByRole('heading', { level: 1, name: 'Crie uma senha nova' })).toBeInTheDocument()
    expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()
    expect(campoCodigo()).toHaveAttribute('inputmode', 'numeric')
    await preencherSenha(usuario, '1234 5678', 'novasenha1')
    expect(conta.conferirCodigoDeSenha).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(conta.trocarSenha).toHaveBeenCalledWith('novasenha1')
    expect(aoSenhaTrocada).toHaveBeenCalledOnce()
  })

  it('CA-412: as mesmas regras de senha do cadastro, antes de gastar o código', async () => {
    const { usuario, conta } = montarCodigoSenha()
    await preencherSenha(usuario, '12345678', 'curta')
    expect(screen.getByRole('alert')).toHaveTextContent('A senha precisa de pelo menos 8 caracteres.')
    await usuario.clear(screen.getByLabelText('Senha nova'))
    await usuario.type(screen.getByLabelText('Senha nova'), 'novasenha1')
    await usuario.clear(screen.getByLabelText('Repita a senha'))
    await usuario.type(screen.getByLabelText('Repita a senha'), 'outrasenha')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(screen.getByRole('alert')).toHaveTextContent('As duas senhas não são iguais.')
    expect(conta.conferirCodigoDeSenha).not.toHaveBeenCalled()
  })

  it('CA-412 e CA-408: código errado mostra a mesma mensagem e a senha não muda', async () => {
    const conta = contaFalsa({ conferirCodigoDeSenha: vi.fn(async () => ({ ok: false, erro: 'codigo-invalido' as const })) })
    const { usuario, aoSenhaTrocada } = montarCodigoSenha({ conta })
    await preencherSenha(usuario, '00000000', 'novasenha1')
    expect(screen.getByRole('alert')).toHaveTextContent('Código errado ou vencido. Confira o último e-mail ou peça outro.')
    expect(conta.trocarSenha).not.toHaveBeenCalled()
    expect(aoSenhaTrocada).not.toHaveBeenCalled()
  })

  it('código aceito e senha recusada: a nova tentativa não confere o código de novo (ele já foi gasto)', async () => {
    const trocarSenha = vi.fn<ValorConta['trocarSenha']>().mockResolvedValueOnce({ ok: false, erro: 'falha-rede' }).mockResolvedValueOnce({ ok: true, erro: null })
    const conta = contaFalsa({ trocarSenha })
    const { usuario, aoSenhaTrocada } = montarCodigoSenha({ conta })
    await preencherSenha(usuario, '12345678', 'novasenha1')
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para falar com o servidor.')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(conta.conferirCodigoDeSenha).toHaveBeenCalledTimes(1)
    expect(trocarSenha).toHaveBeenCalledTimes(2)
    expect(aoSenhaTrocada).toHaveBeenCalledOnce()
  })

  it('CB-101: clique duplo em "Salvar a senha" faz um pedido só', async () => {
    const { promessa, resolver } = pedidoPendurado()
    const conta = contaFalsa({ conferirCodigoDeSenha: vi.fn(() => promessa) })
    const { usuario, aoSenhaTrocada } = montarCodigoSenha({ conta })
    await usuario.type(campoCodigo(), '12345678')
    await usuario.type(screen.getByLabelText('Senha nova'), 'novasenha1')
    await usuario.type(screen.getByLabelText('Repita a senha'), 'novasenha1')
    await usuario.dblClick(screen.getByRole('button', { name: 'Salvar a senha' }))
    resolver({ ok: true, erro: null })
    await waitFor(() => expect(aoSenhaTrocada).toHaveBeenCalledOnce())
    expect(conta.conferirCodigoDeSenha).toHaveBeenCalledTimes(1)
  })

  it('CB-102: sem internet, a falha de rede de sempre e o código continua no campo', async () => {
    const conta = contaFalsa({ conferirCodigoDeSenha: vi.fn(async () => ({ ok: false, erro: 'falha-rede' as const })) })
    const { usuario } = montarCodigoSenha({ conta })
    await preencherSenha(usuario, '12345678', 'novasenha1')
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para falar com o servidor.')
    expect(campoCodigo()).toHaveValue('12345678')
  })

  it('aberta depois, sem o e-mail na memória, pede o e-mail', async () => {
    const { usuario, conta } = montarCodigoSenha({ email: null })
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await preencherSenha(usuario, '12345678', 'novasenha1')
    expect(conta.conferirCodigoDeSenha).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
  })

  it('"Reenviar o código" pede outro e espera 60 segundos', async () => {
    const { usuario, conta } = montarCodigoSenha()
    await usuario.click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('status')).toHaveTextContent('Mandamos um código novo para maria@exemplo.com.')
    expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeDisabled()
  })
})

describe('TelaNovaSenha (link antigo)', () => {
  it('CA-147 e CA-414: sem a troca liberada pelo link, a tela de link vencido continua', async () => {
    const aoPedirOutro = vi.fn()
    render(<TelaNovaSenha conta={contaFalsa()} vencido={false} aoSenhaTrocada={vi.fn()} aoPedirOutro={aoPedirOutro} aoIrParaInicio={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pedir um código' }))
    expect(aoPedirOutro).toHaveBeenCalledOnce()
  })

  it('CA-145, CA-146 e CA-414: com o link antigo, troca a senha e segue', async () => {
    const conta = contaFalsa({ emRecuperacao: true })
    const aoSenhaTrocada = vi.fn()
    render(<TelaNovaSenha conta={conta} vencido={false} aoSenhaTrocada={aoSenhaTrocada} aoPedirOutro={vi.fn()} aoIrParaInicio={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Senha nova'), 'novasenha1')
    await usuario.type(screen.getByLabelText('Repita a senha'), 'outrasenha')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(screen.getByRole('alert')).toHaveTextContent('As duas senhas não são iguais.')
    expect(conta.trocarSenha).not.toHaveBeenCalled()

    await usuario.clear(screen.getByLabelText('Repita a senha'))
    await usuario.type(screen.getByLabelText('Repita a senha'), 'novasenha1')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(conta.trocarSenha).toHaveBeenCalledWith('novasenha1')
    expect(aoSenhaTrocada).toHaveBeenCalledOnce()
  })
})

describe('TelaEsqueciSenha com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-456: "Mandar o código" leva a verificação, com a ação de recuperar, logo acima do botão', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa()
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('recuperar')
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Mandar o código' }))
    falso.aprovar('tok-senha')
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com', 'tok-senha')
    expect(aoEnviado).toHaveBeenCalledWith('maria@exemplo.com')
  })

  it('CA-460: o servidor recusa a verificação: a tela pede para tentar de novo e fica onde está', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa({ pedirTrocaDeSenha: vi.fn(async () => ({ ok: false, erro: 'verificacao-recusada' as const })) })
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    await falso.pronto()
    falso.aprovar('tok-senha')
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para confirmar que é você. Tente de novo.')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    expect(aoEnviado).not.toHaveBeenCalled()
  })

  it('CA-461: sem o script, "Mandar o código" segue sem a verificação; se o servidor exigir, a tela diz que a verificação não carregou', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const conta = contaFalsa({ pedirTrocaDeSenha: vi.fn(async () => ({ ok: false, erro: 'verificacao-nao-carregou' as const })) })
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    await falso.falharScript()
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
    expect(aoEnviado).not.toHaveBeenCalled()
  })
})

describe('TelaConfirmarEmail com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-457: "Reenviar o código" leva a verificação; "Confirmar" não usa nem gasta a verificação', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa()
    montarConfirmar({ conta })
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('reenviar')
    falso.aprovar('tok-1')
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '12345678')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(conta.confirmarCodigo).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(falso.api.reset).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com', 'tok-1')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
  })

  it('CA-458: reenviar antes de a verificação terminar pede para esperar, e o botão não entra na espera de 60 s', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa()
    montarConfirmar({ conta })
    await falso.pronto()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.reenviarConfirmacao).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Reenviar o código' })).toBeEnabled()
  })

  it('CA-461: sem o script, "Reenviar o código" segue sem a verificação; se o servidor exigir, a tela diz que a verificação não carregou', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const conta = contaFalsa({ reenviarConfirmacao: vi.fn(async () => ({ ok: false, erro: 'verificacao-nao-carregou' as const })) })
    montarConfirmar({ conta })
    await falso.falharScript()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
  })

  it('CA-462: a verificação fica logo acima de "Reenviar o código"', async () => {
    const falso = ligarTurnstileFalso()
    montarConfirmar()
    await falso.pronto()
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Reenviar o código' }))
  })

  it('CB-117: clique duplo em "Reenviar o código" manda um pedido só e gasta uma verificação só', async () => {
    const falso = ligarTurnstileFalso()
    const { promessa, resolver } = pedidoPendurado()
    const conta = contaFalsa({ reenviarConfirmacao: vi.fn(() => promessa) })
    montarConfirmar({ conta })
    await falso.pronto()
    falso.aprovar('tok-1')
    await userEvent.setup().dblClick(screen.getByRole('button', { name: 'Reenviar o código' }))
    resolver({ ok: true, erro: null })
    await waitFor(() => expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeInTheDocument())
    expect(conta.reenviarConfirmacao).toHaveBeenCalledTimes(1)
    expect(falso.api.reset).toHaveBeenCalledTimes(1)
  })
})

describe('TelaCodigoSenha com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-457: "Reenviar o código" pede outro código com a verificação; "Salvar a senha" não usa', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta } = montarCodigoSenha()
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('reenviar')
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Reenviar o código' }))
    falso.aprovar('tok-2')
    await preencherSenha(usuario, '12345678', 'novasenha1')
    expect(conta.conferirCodigoDeSenha).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(falso.api.reset).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com', 'tok-2')
  })
})
