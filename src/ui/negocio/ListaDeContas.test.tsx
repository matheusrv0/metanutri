import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AGORA, conta } from '@/domain/negocio.test-utils.ts'
import { dadosFalsos } from './negocioFalso.test-utils.ts'
import { ListaDeContas } from './ListaDeContas.tsx'

const contas = [...dadosFalsos().contas, conta('dono', { nome: '', email: 'dono@exemplo.com', criadaEm: '2026-08-01T12:00:00Z', situacao: null, crnRegiao: null, crnStatus: null, ultimoLoginEm: null })]
const linhas = () => screen.getAllByRole('row').slice(1)
const texto = (el: HTMLElement) => (el.textContent ?? '').replace(/\s/g, ' ')

describe('ListaDeContas (spec painel-do-dono)', () => {
  it('CA-356: uma linha por conta, a mais nova primeiro, com as cinco colunas', () => {
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Pessoa', 'Situação', 'Plano', 'Criou a conta', 'Último login'])
    const primeiras = linhas().map((l) => texto(within(l).getAllByRole('cell')[0] as HTMLElement))
    expect(primeiras).toEqual(['Ana Souzaa@exemplo.com', 'Bruno Limab@exemplo.com', 'Carla Diasc@exemplo.com', 'sem.nome@exemplo.com', 'dono@exemplo.com'])
  })

  it('CA-357 e CA-358: situação e plano com os selos, nas cores de Aprovações', () => {
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    const [ana, , carla, semNome, dono] = linhas()
    expect(within(ana as HTMLElement).getByText('CRN-6 conferido').className).toContain('bg-lightsuccess')
    expect(within(ana as HTMLElement).getByText('Pro mensal').className).toContain('bg-lightsuccess')
    expect(within(carla as HTMLElement).getByText('Estudante')).toBeInTheDocument()
    expect(within(carla as HTMLElement).getByText('Comprovante em análise').className).toContain('bg-lightinfo')
    expect(within(carla as HTMLElement).getByText('Free')).toBeInTheDocument()
    expect(within(semNome as HTMLElement).getByText('Solo mensal')).toBeInTheDocument()
    expect(within(semNome as HTMLElement).getByText('Pagamento pendente').className).toContain('bg-lightwarning')
    expect(within(dono as HTMLElement).getByText('Sem situação')).toBeInTheDocument()
  })

  it('CA-359 e CB-83: data de criação, último login e e-mail no lugar do nome vazio', () => {
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    const [ana, , , semNome, dono] = linhas()
    expect(texto(ana as HTMLElement)).toContain('30/09/2026')
    expect(texto(ana as HTMLElement)).toContain('hoje')
    expect(within(semNome as HTMLElement).getAllByText('sem.nome@exemplo.com')).toHaveLength(1)
    expect(texto(dono as HTMLElement)).toContain('nunca')
  })

  it('CA-360 e CA-362: o grupo escolhido fica marcado, filtra a lista e muda o total', async () => {
    const user = userEvent.setup()
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    expect(screen.getByText('5 de 5')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Estudantes' }))
    expect(screen.getByRole('radio', { name: 'Estudantes' })).toHaveAttribute('aria-checked', 'true')
    expect(linhas()).toHaveLength(1)
    expect(screen.getByText('1 de 1')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Assinantes' }))
    expect(linhas().map((l) => texto(within(l).getAllByRole('cell')[0] as HTMLElement))).toEqual(['Ana Souzaa@exemplo.com', 'Bruno Limab@exemplo.com'])
  })

  it('CA-361 e CA-362: a busca ignora maiúscula e acento e diz quando não acha nada', async () => {
    const user = userEvent.setup()
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    const busca = screen.getByRole('searchbox', { name: 'Buscar nome ou e-mail' })
    await user.type(busca, 'SOUZA')
    expect(linhas()).toHaveLength(1)
    expect(screen.getByText('1 de 5')).toBeInTheDocument()
    await user.clear(busca)
    await user.type(busca, 'zzz')
    expect(screen.getByText('Nenhuma conta com esse nome ou e-mail.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('CA-362: grupo vazio sem busca', async () => {
    const user = userEvent.setup()
    render(<ListaDeContas contas={[conta('x')]} agora={AGORA} />)
    await user.click(screen.getByRole('radio', { name: 'Estudantes' }))
    expect(screen.getByText('Nenhuma conta neste grupo.')).toBeInTheDocument()
  })
})
