// Spec receitas-com-calculo, D-274b e CA-888a: a tela que quebra ao desenhar mostra a tela de erro com "Recarregar".
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LimiteDeErro } from './LimiteDeErro.tsx'
import { recarregarComVersaoNova } from './recarregarComVersaoNova.ts'

function Quebra(): never {
  throw new Error('Alimento 0 não existe na tabela.')
}

beforeEach(() => {
  localStorage.clear()
  // O React escreve o erro no console; aqui ele é esperado.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())

describe('tela de erro na raiz (CA-888a)', () => {
  it('sem erro, mostra a tela de sempre', () => {
    render(
      <LimiteDeErro recarregar={vi.fn()}>
        <p>Painel</p>
      </LimiteDeErro>,
    )
    expect(screen.getByText('Painel')).toBeInTheDocument()
  })

  it('a tela que quebra vira a tela de erro, e "Recarregar" chama a recarga; nenhum dado do aparelho é apagado', async () => {
    localStorage.setItem('metanutri:conta:a:nuvem', '{"mudancas":3,"salvas":1}')
    localStorage.setItem('metanutri:conta:a:caso:x', '{"plano":1}')
    const antes = { ...localStorage }
    const recarregar = vi.fn(() => Promise.resolve())
    render(
      <LimiteDeErro recarregar={recarregar}>
        <Quebra />
      </LimiteDeErro>,
    )
    expect(screen.getByRole('heading', { name: 'Não foi possível abrir esta tela.' })).toBeInTheDocument()
    expect(screen.getByText('Seus dados continuam salvos. Recarregue a página para abrir a versão mais nova.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recarregar' }))
    expect(recarregar).toHaveBeenCalledTimes(1)
    expect({ ...localStorage }).toEqual(antes)
  })
})

describe('recarregar com a versão nova (D-274b)', () => {
  it('pede ao service worker a versão nova e só depois recarrega', async () => {
    const ordem: string[] = []
    const update = vi.fn(() => {
      ordem.push('update')
      return Promise.resolve()
    })
    await recarregarComVersaoNova({
      serviceWorker: { getRegistration: () => Promise.resolve({ update }) },
      recarregar: () => ordem.push('reload'),
    })
    expect(ordem).toEqual(['update', 'reload'])
  })

  it('sem internet (o update falha) ou sem service worker, recarrega assim mesmo', async () => {
    const recarregar = vi.fn()
    await recarregarComVersaoNova({ serviceWorker: { getRegistration: () => Promise.resolve({ update: () => Promise.reject(new Error('offline')) }) }, recarregar })
    await recarregarComVersaoNova({ serviceWorker: { getRegistration: () => Promise.resolve(undefined) }, recarregar })
    await recarregarComVersaoNova({ serviceWorker: undefined, recarregar })
    expect(recarregar).toHaveBeenCalledTimes(3)
  })

  it('o update que não responde não prende a pessoa: depois do prazo, recarrega', async () => {
    vi.useFakeTimers()
    const recarregar = vi.fn()
    const pendente = recarregarComVersaoNova({
      serviceWorker: { getRegistration: () => Promise.resolve({ update: () => new Promise(() => undefined) }) },
      recarregar,
      prazoMs: 5000,
    })
    await vi.advanceTimersByTimeAsync(4999)
    expect(recarregar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await pendente
    expect(recarregar).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
