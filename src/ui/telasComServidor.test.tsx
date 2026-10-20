// Spec revisao-geral-trabalho, CA-798: as telas da área de trabalho que pedem o servidor de conta abrem, com dados
// falsos, com o título e a ação principal. O e2e roda sem servidor (CA-150); estas ficam aqui.
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CrnParaConferir, PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { AvisoVersaoNova } from './aplicativo/AvisoVersaoNova.tsx'
import { avisarVersaoNova } from './aplicativo/versaoNova.ts'
import { TelaAprovacoes } from './aprovacoes/TelaAprovacoes.tsx'
import { ContextoNuvem, type ValorNuvem } from './estado/contextoNuvem.ts'
import type { ValorAprovacoes } from './estado/usarAprovacoes.ts'
import { negocioFalso } from './negocio/negocioFalso.test-utils.ts'
import { TelaNegocio } from './negocio/TelaNegocio.tsx'
import { PortaoDaNuvem } from './nuvem/PortaoDaNuvem.tsx'

const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }

function comNuvem(estado: Partial<EstadoDaNuvem>) {
  const nuvem: ValorNuvem = { estado: { ...PRONTA, ...estado }, salvarAgora: vi.fn(async () => false), reduzir: vi.fn(), parar: vi.fn() }
  const conta = { sair: vi.fn(async () => undefined) }
  render(
    <ContextoNuvem.Provider value={nuvem}>
      <PortaoDaNuvem areaDoNutricionista conta={conta} aoSaiu={vi.fn()}>
        <h1>Painel</h1>
      </PortaoDaNuvem>
    </ContextoNuvem.Provider>,
  )
  return { nuvem, conta, usuario: userEvent.setup() }
}

const pedido = (id: string, nome: string, enviadoEm: string): PedidoParaAprovar => ({
  id,
  usuario: `u-${id}`,
  nome,
  email: `${id}@ufrn.edu.br`,
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  enviadoEm,
  arquivo: `u-${id}/a.pdf`,
})

const crn: CrnParaConferir = {
  usuario: 'u2',
  nome: 'Ana Souza',
  email: 'ana@gmail.com',
  crn: { regiao: 6, numero: '12345' },
  contaCriadaEm: '2026-09-30T12:00:00Z',
  status: 'em_conferencia',
  decididoEm: null,
}

describe('Telas com servidor, com dados falsos (CA-798)', () => {
  it('Negócio: abre com o resumo e a lista de contas, e a busca filtra', async () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    expect(screen.getByRole('region', { name: 'Resumo do negócio' })).toBeInTheDocument()
    const busca = screen.getByRole('searchbox', { name: 'Buscar nome ou e-mail' })
    await userEvent.setup().type(busca, 'Bruno')
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument()
  })

  it('Aprovações: abre o pedido mais antigo e "Aprovar" decide por ele', async () => {
    const decidirPedido = vi.fn(async () => null)
    const aprovacoes: ValorAprovacoes = {
      pedidos: [pedido('p1', 'Carla Dias', '2026-09-28T10:00:00Z'), pedido('p2', 'Júlia Martins', '2026-09-30T13:42:00Z')],
      crns: [crn],
      pendentes: { estudantes: 2, crn: 1, total: 3 },
      carregado: true,
      erro: null,
      decidirPedido,
      decidirCrn: vi.fn(async () => null),
      abrirComprovante: vi.fn(async () => 'https://assinado/x'),
      recarregar: vi.fn(),
    }
    render(<TelaAprovacoes aprovacoes={aprovacoes} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Carla Dias' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(decidirPedido).toHaveBeenCalledWith('p1', true, null)
  })

  it.each([
    ['sem-internet', 'Sem internet.'],
    ['sem-espaco', 'O navegador está sem espaço para seus dados.'],
    ['grande-demais', 'A cópia passou de 5 MB, o máximo da nuvem.'],
  ] as const)('a trava %s cobre a área com o título dela e "Sair"', (trava, titulo) => {
    comNuvem({ trava })
    const capa = screen.getByRole('dialog')
    expect(within(capa).getByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(within(capa).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('"Carregando seus dados…" no lugar da área enquanto a nuvem não chega', () => {
    comNuvem({ fase: 'abrindo' })
    expect(screen.getByRole('status')).toHaveTextContent('Carregando seus dados…')
    expect(screen.queryByRole('heading', { name: 'Painel' })).not.toBeInTheDocument()
  })

  it('"Sair" com mudança não salva pergunta, e "Ficar" vem com o foco', async () => {
    const { usuario, conta } = comNuvem({ trava: 'sem-internet', pendente: true })
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    const pergunta = await screen.findByRole('dialog', { name: 'Há mudanças que ainda não foram salvas na nuvem.' })
    expect(within(pergunta).getByRole('button', { name: 'Ficar' })).toHaveFocus()
    expect(within(pergunta).getByRole('button', { name: 'Sair mesmo assim' })).toBeInTheDocument()
    expect(conta.sair).not.toHaveBeenCalled()
  })

  it('a barra de versão nova aparece e "Atualizar" recarrega', async () => {
    const recarregar = vi.fn()
    render(<AvisoVersaoNova recarregar={recarregar} />)
    act(() => avisarVersaoNova())
    expect(screen.getByText('Há uma versão nova do MetaNutri.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(recarregar).toHaveBeenCalledOnce()
  })
})
