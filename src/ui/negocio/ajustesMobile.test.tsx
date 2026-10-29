// Spec ajustes-mobile (auditoria de 29/10/2026): Negócio no celular. O jsdom não aplica largura; aqui se confere a
// estrutura, e o e2e `servidor-falso/ajustes-mobile-admin.spec.ts` mede no navegador.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AGORA, conta } from '@/domain/negocio.test-utils.ts'
import { AssinaturasPorPlano } from './AssinaturasPorPlano.tsx'
import { ListaDeContas } from './ListaDeContas.tsx'
import { NumerosDoNegocio } from './NumerosDoNegocio.tsx'

const classes = (el: Element) => el.className.split(/\s+/)

describe('Negócio no celular (spec ajustes-mobile)', () => {
  it('M-014: a grade dos cartões tem uma coluna que encolhe no celular (minmax(0,1fr)), não auto', () => {
    render(<NumerosDoNegocio resumo={{ receitaCentavos: 2_469_335_380, diferenca30DiasCentavos: 0, assinaturasAtivas: 60, parteQuePaga: 0.15, contas: 400, contasNovas30Dias: 40 }} />)
    expect(classes(screen.getByRole('region', { name: 'Resumo do negócio' }))).toContain('grid-cols-[minmax(0,1fr)]')
  })

  it('M-015: o cabeçalho e as linhas da tabela por plano dividem as mesmas colunas, que crescem com o valor', () => {
    render(
      <AssinaturasPorPlano
        linhas={[{ chave: 'clinica-mensal', plano: 'clinica', ciclo: 'mensal', quantidade: 20, centavosPorMes: 2_469_135_780, parte: 1 }]}
        situacoes={{ pendentes: 0, pausadas: 0, canceladas30Dias: 0 }}
      />,
    )
    const linha = screen.getByRole('listitem')
    expect(classes(linha)).toContain('grid-cols-subgrid')
    expect(classes(linha.parentElement as HTMLElement)).toContain('grid-cols-subgrid')
    const grade = linha.parentElement?.parentElement as HTMLElement
    expect(classes(grade)).toContain('grid-cols-[minmax(0,1fr)_minmax(3rem,auto)_minmax(6rem,auto)]')
  })

  describe('M-016: a lista de contas', () => {
    const muitas = Array.from({ length: 120 }, (_, k) => conta(`c${k}`, { nome: `Conta ${k}`, criadaEm: new Date(Date.UTC(2026, 0, 1) + k * 3_600_000).toISOString() }))
    /** A tela do celular: abaixo de 768 px. */
    const noCelular = () =>
      vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta === '(max-width: 767px)', media: consulta, addEventListener: () => undefined, removeEventListener: () => undefined }))
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('M-016: abaixo de md, cada conta vira um cartão com nome, e-mail, situação e plano, sem a tabela', () => {
      noCelular()
      render(<ListaDeContas contas={[conta('a', { nome: 'Ana Souza', email: 'ana@exemplo.com' })]} agora={AGORA} />)
      expect(screen.queryByRole('table')).toBeNull()
      const cartao = within(screen.getByRole('list', { name: 'Contas' })).getByRole('listitem')
      for (const texto of ['Ana Souza', 'ana@exemplo.com', 'Nutricionista', 'CRN-6 conferido', 'Free', 'Situação', 'Plano', 'Criou a conta', 'Último acesso']) {
        expect(within(cartao).getByText(texto)).toBeInTheDocument()
      }
    })

    it('M-016: a partir de md, a tabela de cinco colunas, sem os cartões', () => {
      render(<ListaDeContas contas={[conta('a', { nome: 'Ana Souza' })]} agora={AGORA} />)
      expect(screen.getAllByRole('columnheader')).toHaveLength(5)
      expect(screen.queryByRole('list', { name: 'Contas' })).toBeNull()
    })

    it('M-016: mostra 50 por vez na tabela, e o botão traz mais 50', async () => {
      const user = userEvent.setup()
      render(<ListaDeContas contas={muitas} agora={AGORA} />)
      expect(screen.getAllByRole('row').slice(1)).toHaveLength(50)
      expect(screen.getByText('Mostrando 50 de 120')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
      expect(screen.getAllByRole('row').slice(1)).toHaveLength(100)
    })

    it('M-016: mostra 50 cartões por vez no celular, e o botão traz mais 50', async () => {
      noCelular()
      const user = userEvent.setup()
      render(<ListaDeContas contas={muitas} agora={AGORA} />)
      const cartoes = screen.getByRole('list', { name: 'Contas' })
      expect(within(cartoes).getAllByRole('listitem')).toHaveLength(50)
      expect(screen.getByText('Mostrando 50 de 120')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
      expect(within(cartoes).getAllByRole('listitem')).toHaveLength(100)
      await user.click(screen.getByRole('button', { name: 'Mostrar mais 20' }))
      expect(within(cartoes).getAllByRole('listitem')).toHaveLength(120)
      expect(screen.queryByRole('button', { name: /^Mostrar mais/ })).toBeNull()
    })

    it('M-016: trocar de grupo ou buscar volta aos 50 primeiros', async () => {
      noCelular()
      const user = userEvent.setup()
      render(<ListaDeContas contas={muitas} agora={AGORA} />)
      await user.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
      await user.click(screen.getByRole('radio', { name: 'Nutricionistas' }))
      expect(within(screen.getByRole('list', { name: 'Contas' })).getAllByRole('listitem')).toHaveLength(50)
      await user.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
      await user.type(screen.getByRole('searchbox', { name: 'Buscar nome ou e-mail' }), 'conta')
      expect(within(screen.getByRole('list', { name: 'Contas' })).getAllByRole('listitem')).toHaveLength(50)
    })
  })
})
