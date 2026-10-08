import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MENSAGEM_ERRO } from '@/domain/conta.ts'
import { CHAVE_TEMA, useTema } from '../../tema/contextoTema.ts'
import { ProvedorTema } from '../../tema/ProvedorTema.tsx'
import { URL_DO_TURNSTILE, type AcaoDaVerificacao } from './turnstile.ts'
import { CHAVE_DE_TESTE, ligarTurnstileFalso, type TurnstileFalso } from './turnstileFalso.test-utils.ts'
import { useVerificacao, type PedidoDaVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'

/** Uma tela mínima: a verificação logo acima de um botão que entrega o que o clique levaria. */
function Anfitriao({ acao = 'login', aoPedir }: { readonly acao?: AcaoDaVerificacao; readonly aoPedir: (pedido: PedidoDaVerificacao) => void }) {
  const verificacao = useVerificacao(acao)
  return (
    <VerificacaoContraRobos verificacao={verificacao}>
      <button type="button" onClick={() => aoPedir(verificacao.tomar())}>
        Enviar
      </button>
    </VerificacaoContraRobos>
  )
}

/** O botão de tema do site, para trocar o tema com a tela aberta. */
function TrocarTema() {
  const { alternar } = useTema()
  return (
    <button type="button" onClick={alternar}>
      Trocar tema
    </button>
  )
}

const enviar = () => screen.getByRole('button', { name: 'Enviar' })
const espiao = () => vi.fn<(pedido: PedidoDaVerificacao) => void>()
const ativos = (falso: TurnstileFalso) => falso.widgets.filter((widget) => !widget.removido)

/**
 * D-119, com o relógio de mentira: o script já está na página, então o widget é desenhado numa promessa,
 * sem relógio nenhum, e o prazo de 30 s começa a contar dali.
 */
async function montarNoRelogio() {
  vi.useFakeTimers()
  const falso = ligarTurnstileFalso()
  const aoPedir = espiao()
  const tela = render(<Anfitriao aoPedir={aoPedir} />)
  await act(async () => {})
  expect(falso.api.render).toHaveBeenCalledTimes(1)
  return { falso, aoPedir, tela }
}
const passar = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}
const clicar = () => {
  fireEvent.click(enviar())
}

describe('a verificação contra robôs na tela (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('CA-463: sem a chave, só o botão aparece, nenhum script é pedido e o clique segue sem verificação', async () => {
    const falso = ligarTurnstileFalso({ chave: '' })
    const aoPedir = espiao()
    const { container } = render(<Anfitriao aoPedir={aoPedir} />)
    expect(container.firstElementChild).toBe(enviar())
    await userEvent.setup().click(enviar())
    expect(aoPedir).toHaveBeenCalledWith({ ok: true, extra: [] })
    expect(falso.api.render).not.toHaveBeenCalled()
    expect(document.querySelector(`script[src="${URL_DO_TURNSTILE}"]`)).toBeNull()
  })

  it.each([
    ['claro', 'light'],
    ['escuro', 'dark'],
  ] as const)('CA-462: escondida logo acima do botão até o Cloudflare pedir um clique, em português, no tema %s do site', async (tema, doWidget) => {
    localStorage.setItem(CHAVE_TEMA, tema)
    const falso = ligarTurnstileFalso()
    render(
      <ProvedorTema>
        <Anfitriao aoPedir={espiao()} />
      </ProvedorTema>,
    )
    await falso.pronto()
    const widget = falso.ativo()
    expect(widget.opcoes).toMatchObject({
      sitekey: CHAVE_DE_TESTE,
      action: 'login',
      appearance: 'interaction-only',
      language: 'pt-br',
      theme: doWidget,
      'refresh-expired': 'auto',
      'response-field': false,
    })
    expect(widget.alvo.nextElementSibling).toBe(enviar())
    expect(widget.alvo).toHaveAttribute('aria-hidden', 'true')
    expect(widget.alvo).toHaveClass('h-0')
    falso.pedirClique()
    expect(widget.alvo).not.toHaveAttribute('aria-hidden')
    expect(widget.alvo).not.toHaveClass('h-0')
    falso.aprovar('tok-1')
    expect(widget.alvo).toHaveAttribute('aria-hidden', 'true')
  })

  it('CA-458: antes de o script chegar ou de o Cloudflare terminar, o clique volta com o aviso de esperar', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    await falso.chegarScript()
    await falso.pronto()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    expect(MENSAGEM_ERRO['verificacao-pendente']).toBe('Espere a verificação de segurança terminar.')
  })

  it('CA-459: cada verificação sai uma vez só; ao sair, o widget se renova e a tentativa seguinte espera a nova', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    const usuario = userEvent.setup()
    falso.aprovar('tok-1')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-1'] })
    expect(falso.api.reset).toHaveBeenCalledTimes(1)
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    falso.aprovar('tok-2')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-2'] })
    expect(falso.api.reset).toHaveBeenCalledTimes(2)
  })

  it('D-119: o Cloudflare não confirma (erro no widget): o clique segue sem a verificação, e o widget se renova para a próxima', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    falso.aprovar('tok-1')
    falso.falhar()
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    falso.aprovar('tok-2')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-2'] })
  })

  it.each(['timeout-callback', 'unsupported-callback'] as const)(
    'D-119: o Turnstile avisa %s (desafio sem resposta a tempo, navegador sem suporte): conta como falha do widget, e o clique segue sem a verificação',
    async (aviso) => {
      const falso = ligarTurnstileFalso()
      const aoPedir = espiao()
      render(<Anfitriao aoPedir={aoPedir} />)
      await falso.pronto()
      falso.pedirClique()
      act(() => {
        falso.ativo().opcoes[aviso]()
      })
      await userEvent.setup().click(enviar())
      expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
      expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    },
  )

  it('D-119: 29,9 s depois de desenhado, sem o token, o clique ainda pede para esperar', async () => {
    const { aoPedir } = await montarNoRelogio()
    passar(29_900)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    expect(MENSAGEM_ERRO['verificacao-pendente']).toBe('Espere a verificação de segurança terminar.')
  })

  it('D-119: 30 s sem o token, sem erro e sem desafio aberto, o widget conta como falha: o clique segue sem a verificação, e o widget renovado ganha outros 30 s', async () => {
    const { falso, aoPedir } = await montarNoRelogio()
    passar(30_000)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    passar(29_900)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    passar(100)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
  })

  it('D-119: o token que chega antes dos 30 s para o prazo e sai no clique, mesmo bem depois', async () => {
    const { falso, aoPedir } = await montarNoRelogio()
    passar(10_000)
    falso.aprovar('tok-1')
    passar(60_000)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-1'] })
  })

  it('D-119: com o desafio aberto (o Cloudflare pediu um clique), o prazo não corre', async () => {
    const { falso, aoPedir } = await montarNoRelogio()
    passar(20_000)
    falso.pedirClique()
    passar(120_000)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
  })

  it('D-119: o desafio fecha sem o token: o prazo volta a contar 30 s', async () => {
    const { falso, aoPedir } = await montarNoRelogio()
    falso.pedirClique()
    passar(60_000)
    act(() => {
      falso.ativo().opcoes['after-interactive-callback']()
    })
    passar(29_900)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    passar(100)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
  })

  it('D-119: a verificação vencida que não se renova em 30 s também conta como falha', async () => {
    const { falso, aoPedir } = await montarNoRelogio()
    falso.aprovar('tok-1')
    passar(300_000)
    falso.vencer()
    passar(29_900)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    passar(100)
    clicar()
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
  })

  it('D-119: sair da tela para o prazo', async () => {
    const { tela } = await montarNoRelogio()
    expect(vi.getTimerCount()).toBe(1)
    tela.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('CA-461: o script não carrega: a caixa sai, nenhum aviso aparece antes da resposta, e o clique segue sem a verificação', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const aoPedir = espiao()
    const { container } = render(<Anfitriao aoPedir={aoPedir} />)
    await falso.falharScript()
    await waitFor(() => expect(container.firstElementChild).toBe(enviar()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    expect(falso.api.render).not.toHaveBeenCalled()
  })

  it('CB-116: a verificação vencida volta a "espere" até a nova chegar, sem a tela renovar por conta própria', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    expect(falso.ativo().opcoes['refresh-expired']).toBe('auto')
    falso.aprovar('tok-1')
    falso.vencer()
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    expect(falso.api.reset).not.toHaveBeenCalled()
    falso.aprovar('tok-2')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-2'] })
  })

  it.each([
    [280, 'compact'],
    [432, 'flexible'],
  ] as const)('CB-118: com %i px para o widget, o tamanho é %s (no celular de 360 px sobram 280)', async (largura, tamanho) => {
    // O jsdom não mede nada: a largura da caixa vem daqui, como o navegador mediria na moldura da conta.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(largura)
    const falso = ligarTurnstileFalso()
    render(<Anfitriao aoPedir={espiao()} />)
    await falso.pronto()
    expect(falso.ativo().opcoes.size).toBe(tamanho)
    expect(falso.ativo().alvo).toHaveClass('w-full')
  })

  it('CB-119: sair da tela tira o widget; voltar desenha um só, sem erro', async () => {
    const falso = ligarTurnstileFalso()
    const primeira = render(<Anfitriao aoPedir={espiao()} />)
    await falso.pronto()
    primeira.unmount()
    expect(falso.api.remove).toHaveBeenCalledWith('widget-1')
    render(<Anfitriao aoPedir={espiao()} />)
    await falso.pronto()
    expect(falso.api.render).toHaveBeenCalledTimes(2)
    expect(ativos(falso)).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CB-119: no modo estrito do React (monta, desmonta e monta de novo), fica um widget só', async () => {
    const falso = ligarTurnstileFalso()
    render(
      <StrictMode>
        <Anfitriao aoPedir={espiao()} />
      </StrictMode>,
    )
    await falso.pronto()
    expect(ativos(falso)).toHaveLength(1)
  })

  it('CB-119: sair antes de o script chegar não desenha nada depois', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const { unmount } = render(<Anfitriao aoPedir={espiao()} />)
    expect(document.querySelectorAll(`script[src="${URL_DO_TURNSTILE}"]`)).toHaveLength(1)
    unmount()
    await falso.chegarScript()
    expect(falso.api.render).not.toHaveBeenCalled()
  })

  it('Foco: o Turnstile que recusa desenhar o widget não quebra a tela nem trava o botão: o clique segue sem a verificação', async () => {
    const falso = ligarTurnstileFalso()
    falso.api.render.mockImplementation(() => {
      throw new Error('chave com formato errado')
    })
    const aoPedir = espiao()
    const { container } = render(<Anfitriao aoPedir={aoPedir} />)
    await waitFor(() => expect(container.firstElementChild).toBe(enviar()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.setup().click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
  })

  it('Foco: a resposta atrasada de um widget que já saiu não vale para a tela nova', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    const primeira = render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    const velho = falso.ativo()
    primeira.unmount()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    act(() => {
      velho.opcoes.callback('token-velho')
    })
    await userEvent.setup().click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
  })

  it('Foco: o tema do site muda com a tela aberta: o widget é desenhado de novo, no tema novo, um só', async () => {
    localStorage.setItem(CHAVE_TEMA, 'claro')
    const falso = ligarTurnstileFalso()
    render(
      <ProvedorTema>
        <Anfitriao aoPedir={espiao()} />
        <TrocarTema />
      </ProvedorTema>,
    )
    await falso.pronto()
    expect(falso.ativo().opcoes.theme).toBe('light')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trocar tema' }))
    await waitFor(() => expect(falso.ativo().opcoes.theme).toBe('dark'))
    expect(falso.api.remove).toHaveBeenCalledWith('widget-1')
    expect(ativos(falso)).toHaveLength(1)
  })
})
