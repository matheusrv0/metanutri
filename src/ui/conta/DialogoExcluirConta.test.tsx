import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ResultadoDaExclusao } from '../estado/usarExclusaoDaConta.ts'
import { ligarTurnstileFalso } from '../publico/conta/turnstileFalso.test-utils.ts'
import { DialogoExcluirConta } from './DialogoExcluirConta.tsx'

const NAO_TERMINOU = 'Não deu para terminar a exclusão. Sua conta continua ativa. Tente de novo em alguns minutos.'

function montar({ paga = false, resultado = { ok: true } as ResultadoDaExclusao } = {}) {
  const excluir = vi.fn(async (): Promise<ResultadoDaExclusao> => resultado)
  const aoBaixarBackup = vi.fn()
  const aoFechar = vi.fn()
  const vista = render(<DialogoExcluirConta aberto pagaNaOperadora={paga} excluir={excluir} aoBaixarBackup={aoBaixarBackup} aoFechar={aoFechar} />)
  return { excluir, aoBaixarBackup, aoFechar, vista, usuario: userEvent.setup() }
}

const campoSenha = () => screen.getByLabelText('Sua senha')
const botaoExcluir = () => screen.getByRole('button', { name: /Excluir conta/ })

describe('DialogoExcluirConta (spec exclusao-de-conta)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-802: diz o que some, que não dá para desfazer, e pede para sair dos outros aparelhos antes', () => {
    montar()
    const janela = screen.getByRole('dialog', { name: 'Excluir sua conta?' })
    expect(janela).toHaveTextContent('Tudo sai da nuvem na hora, e não dá para desfazer.')
    const itens = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(itens).toEqual(['Pacientes, planos e o resto dos dados da conta.', 'Os links dos pacientes, que deixam de abrir.', 'Situação, CRN e comprovantes de matrícula.'])
    expect(janela).toHaveTextContent('Em outro aparelho com a conta aberta, saia antes.')
  })

  it('CA-802: o foco começa em "Manter conta", a escolha que não apaga nada', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Manter conta' })).toHaveFocus()
  })

  it('CA-803: com assinatura paga, diz que ela é cancelada, sem novas cobranças; sem ela, não fala de assinatura', () => {
    const { vista } = montar({ paga: true })
    expect(screen.getAllByRole('listitem').at(-1)).toHaveTextContent('A assinatura é cancelada, sem novas cobranças.')
    vista.unmount()
    montar({ paga: false })
    expect(screen.getByRole('dialog')).not.toHaveTextContent(/assinatura/i)
  })

  it('CA-804: "Baixar backup" baixa o backup e a janela continua aberta, dizendo que salvou', async () => {
    const { aoBaixarBackup, aoFechar, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Baixar backup' }))
    expect(aoBaixarBackup).toHaveBeenCalledOnce()
    expect(aoFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Backup salvo.')
  })

  it('CA-805: o campo "Sua senha" está lá, e "Excluir conta" só libera com a senha digitada', async () => {
    const { usuario } = montar()
    expect(campoSenha()).toHaveAttribute('type', 'password')
    expect(campoSenha()).toHaveAttribute('autocomplete', 'current-password')
    expect(botaoExcluir()).toBeDisabled()
    await usuario.type(campoSenha(), 'minha-senha')
    expect(botaoExcluir()).toBeEnabled()
  })

  it('CA-807: confirma com a senha (sem a verificação, quando ela está desligada) e, enquanto exclui, nada mais sai', async () => {
    let soltar: (r: ResultadoDaExclusao) => void = () => undefined
    const { excluir, aoFechar, usuario } = montar()
    excluir.mockImplementation(() => new Promise<ResultadoDaExclusao>((resolver) => (soltar = resolver)))
    await usuario.type(campoSenha(), 'minha-senha')
    await usuario.click(botaoExcluir())
    expect(excluir).toHaveBeenCalledWith('minha-senha', [])
    expect(botaoExcluir()).toBeDisabled()
    expect(botaoExcluir()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Manter conta' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(aoFechar).not.toHaveBeenCalled()
    fireEvent.submit(campoSenha())
    expect(excluir).toHaveBeenCalledOnce()
    await act(async () => soltar({ ok: true }))
    // Deu certo: a página vai para o início e recarrega; a janela não volta a aceitar clique.
    expect(botaoExcluir()).toBeDisabled()
  })

  it('Enter no campo de senha confirma', async () => {
    const { excluir, usuario } = montar()
    await usuario.type(campoSenha(), 'minha-senha{Enter}')
    expect(excluir).toHaveBeenCalledWith('minha-senha', [])
  })

  it('CA-806: senha errada: "Senha incorreta." no aviso, o campo marcado, e a janela continua', async () => {
    const { usuario } = montar({ resultado: { ok: false, erro: 'Senha incorreta.', naSenha: true } })
    await usuario.type(campoSenha(), 'errada')
    await usuario.click(botaoExcluir())
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta.')
    expect(campoSenha()).toHaveAttribute('aria-invalid', 'true')
    expect(botaoExcluir()).toBeEnabled()
  })

  it('CA-809: o servidor não termina: a frase do CA-809, e dá para tentar de novo', async () => {
    const { excluir, usuario } = montar({ resultado: { ok: false, erro: NAO_TERMINOU, naSenha: false } })
    await usuario.type(campoSenha(), 'minha-senha')
    await usuario.click(botaoExcluir())
    expect(await screen.findByRole('alert')).toHaveTextContent(NAO_TERMINOU)
    expect(campoSenha()).toHaveAttribute('aria-invalid', 'false')
    await usuario.click(botaoExcluir())
    expect(excluir).toHaveBeenCalledTimes(2)
  })

  it('"Manter conta" fecha sem excluir', async () => {
    const { excluir, aoFechar, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Manter conta' }))
    expect(aoFechar).toHaveBeenCalledOnce()
    expect(excluir).not.toHaveBeenCalled()
  })

  it('CA-811: a verificação contra robôs vai junto; ainda conferindo, nada sai', async () => {
    const falso = ligarTurnstileFalso()
    const { excluir, usuario } = montar()
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('login')
    await usuario.type(campoSenha(), 'minha-senha')
    await usuario.click(botaoExcluir())
    expect(await screen.findByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(excluir).not.toHaveBeenCalled()
    falso.aprovar('tok-excluir')
    await usuario.click(botaoExcluir())
    await waitFor(() => expect(excluir).toHaveBeenCalledWith('minha-senha', ['tok-excluir']))
  })

  it('CA-829: os botões têm 44 px de altura no celular, inclusive o de mostrar a senha', () => {
    montar()
    for (const nome of ['Baixar backup', 'Manter conta', 'Excluir conta', 'Mostrar a senha']) {
      expect(screen.getByRole('button', { name: nome }).className).toMatch(/\b(h-11|size-11)\b/)
    }
  })
})
