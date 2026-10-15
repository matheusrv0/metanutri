// O aviso de versão nova do aplicativo (spec dados-na-nuvem, D-172, CA-602 e CA-603).
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

/** O registro do plugin, de mentira: guarda as opções que recebeu. */
const registro = vi.hoisted(() => ({ chamadas: [] as RegisterSWOptions[] }))

vi.mock('virtual:pwa-register', () => ({
  registerSW: (opcoes: RegisterSWOptions = {}) => {
    registro.chamadas.push(opcoes)
    return () => Promise.resolve()
  },
}))

beforeEach(() => {
  registro.chamadas = []
  // O estado do aviso vive no módulo: cada teste começa com um módulo novo.
  vi.resetModules()
})

describe('aviso de versão nova (D-172)', () => {
  it('CA-602: o registro liga o service worker pelo módulo do plugin e, quando a versão nova assume, só avisa', async () => {
    const { registrarAplicativo } = await import('./registrarAplicativo.ts')
    const aviso = vi.fn()
    registrarAplicativo(aviso)
    expect(registro.chamadas).toHaveLength(1)
    const opcoes = registro.chamadas[0]
    // Com onNeedReload, o plugin não recarrega a página sozinho: quem decide é a pessoa.
    expect(opcoes?.onNeedReload).toBeTypeOf('function')
    // O registro espera a página carregar, como o script de antes.
    expect(opcoes?.immediate).not.toBe(true)
    expect(aviso).not.toHaveBeenCalled()
    opcoes?.onNeedReload?.()
    expect(aviso).toHaveBeenCalledTimes(1)
  })

  it('CA-602: a barra só aparece quando a versão nova chega; "Atualizar" recarrega, e nada recarrega sozinho', async () => {
    const { avisarVersaoNova } = await import('./versaoNova.ts')
    const { AvisoVersaoNova } = await import('./AvisoVersaoNova.tsx')
    const recarregar = vi.fn()
    const usuario = userEvent.setup()
    render(<AvisoVersaoNova recarregar={recarregar} />)
    expect(screen.queryByText('Há uma versão nova do MetaNutri.')).not.toBeInTheDocument()

    act(() => avisarVersaoNova())
    const barra = screen.getByText('Há uma versão nova do MetaNutri.').closest('[role="status"]')
    expect(barra).not.toBeNull()
    expect(recarregar).not.toHaveBeenCalled()
    // No fluxo da página: nada fixo nem flutuando por cima do conteúdo.
    expect(barra?.className).not.toMatch(/\b(fixed|absolute|sticky)\b/)

    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('CA-602: o aviso vale para toda a área de trabalho: duas barras montadas mostram o mesmo estado', async () => {
    const { avisarVersaoNova } = await import('./versaoNova.ts')
    const { AvisoVersaoNova } = await import('./AvisoVersaoNova.tsx')
    act(() => avisarVersaoNova())
    render(
      <>
        <AvisoVersaoNova />
        <AvisoVersaoNova />
      </>,
    )
    expect(screen.getAllByText('Há uma versão nova do MetaNutri.')).toHaveLength(2)
  })
})
