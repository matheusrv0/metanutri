import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MARCA_DO_ICONE } from '@/site/limpeza.ts'
import { AvisoIconeAntigo, MARCA } from './AvisoIconeAntigo.tsx'

describe('o aviso do ícone antigo (spec separacao-site-app, D-524 e D-526)', () => {
  afterEach(() => {
    globalThis.history.replaceState(null, '', '/')
  })

  it('a marca é a mesma que o site põe no endereço', () => {
    expect(MARCA).toBe(MARCA_DO_ICONE)
  })

  it('CA-1426: com a marca no endereço, mostra uma vez os textos do D-526 e tira a marca, sem mexer no resto', async () => {
    globalThis.history.replaceState(null, '', '/?volta=pagamento&icone-antigo#/painel')
    const { unmount } = render(<AvisoIconeAntigo />)
    const aviso = screen.getByRole('dialog')
    expect(aviso).toHaveTextContent('Novo endereço: app.metanutri.com.br.')
    expect(aviso).toHaveTextContent('Instale o MetaNutri de novo para o ícone abrir direto aqui.')
    expect(`${globalThis.location.search}${globalThis.location.hash}`).toBe('?volta=pagamento#/painel')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()
    // Recarregar (ou outra tela da área de trabalho) não traz de volta: a marca saiu do endereço.
    render(<AvisoIconeAntigo />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('só com a marca: o endereço fica sem consulta', () => {
    globalThis.history.replaceState(null, '', '/?icone-antigo#/pacientes')
    render(<AvisoIconeAntigo />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(globalThis.location.search).toBe('')
    expect(globalThis.location.hash).toBe('#/pacientes')
  })

  it('sem a marca, nada aparece', () => {
    render(<AvisoIconeAntigo />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
