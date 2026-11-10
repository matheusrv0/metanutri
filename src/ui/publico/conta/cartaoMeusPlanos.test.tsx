// "Abrir meu plano" na tela de entrar (spec lado-do-paciente, D-1218, D-1220, CA-2227, CA-2233, CB-1201, CB-1203 e CB-1226).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { lembrarPlano } from '@/domain/meusPlanos.ts'
import { CartaoMeusPlanos } from './CartaoMeusPlanos.tsx'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaEntrar } from './TelaEntrar.tsx'

const token = (n: number): string => `token${String(n).padStart(7, '0')}`
const lembrar = (n: number, primeiroNome = 'Juliana', nutricionista = 'Ana Lima') =>
  lembrarPlano(localStorage, { token: token(n), primeiroNome, nutricionista, ultimoAcesso: '2026-11-03' })

const telaEntrar = (aoSouPaciente?: () => void) =>
  render(
    <TelaEntrar
      conta={contaFalsa()}
      aoEntrou={() => undefined}
      aoCriarConta={() => undefined}
      aoEsqueci={() => undefined}
      aoConfirmarEmail={() => undefined}
      aoIrParaInicio={() => undefined}
      aoAbrirSistema={() => undefined}
      aoSouPaciente={aoSouPaciente}
    />,
  )

beforeEach(() => localStorage.clear())

describe('CA-2227: o plano lembrado acima do login', () => {
  it('CA-2227: um link aberto uma vez: "Abrir meu plano" com "Juliana · Ana Lima", acima do login, com "Nutricionista" antes dele', () => {
    lembrar(1)
    telaEntrar()
    const cartao = screen.getByRole('button', { name: 'Abrir meu plano: Juliana · Ana Lima' })
    expect(cartao).toHaveTextContent('Abrir meu plano')
    expect(cartao).toHaveTextContent('Juliana · Ana Lima')
    const divisor = screen.getByText('Nutricionista')
    const titulo = screen.getByRole('heading', { level: 1, name: 'Entrar' })
    expect(cartao.compareDocumentPosition(divisor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(divisor.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-2227: "Abrir" leva ao endereço do link', async () => {
    lembrar(1)
    const abrir = vi.fn()
    render(<CartaoMeusPlanos aoAbrir={abrir} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Abrir meu plano/ }))
    expect(abrir).toHaveBeenCalledWith(token(1))
  })

  it('CA-2227 e CB-1201: com 2 links lembrados, os dois; com 6, só os 5 mais recentes', () => {
    lembrar(1, 'Mariana')
    lembrar(2, 'Pedro')
    const { unmount } = render(<CartaoMeusPlanos />)
    expect(within(screen.getByRole('list', { name: 'Seus planos neste aparelho' })).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Abrir meu plano: Pedro · Ana Lima',
      'Abrir meu plano: Mariana · Ana Lima',
    ])
    unmount()
    for (let n = 3; n <= 6; n++) lembrar(n, `P${n}`)
    render(<CartaoMeusPlanos />)
    expect(screen.getAllByRole('button', { name: /Abrir meu plano/ })).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /Mariana/ })).not.toBeInTheDocument()
  })

  it('CB-1203 e CB-1226: sem link lembrado (o Safari apagou, aba anônima), nada aparece', () => {
    telaEntrar()
    expect(screen.queryByRole('button', { name: /Abrir meu plano/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Nutricionista')).not.toBeInTheDocument()
  })
})

describe('CA-2233: "Sou paciente"', () => {
  it('CA-2233: a tela de entrar tem "Sou paciente", que abre "Recuperar meu link"', async () => {
    const aoSouPaciente = vi.fn()
    telaEntrar(aoSouPaciente)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sou paciente' }))
    expect(aoSouPaciente).toHaveBeenCalled()
  })
})
