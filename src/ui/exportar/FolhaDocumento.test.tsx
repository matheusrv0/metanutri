// Spec anamnese-e-prescricoes, CA-576, CA-580 e CA-587: como as folhas curtas do paciente saem no papel.
import { render, screen, within } from '@testing-library/react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { FolhaExames } from './FolhaExames.tsx'
import { FolhaSuplementos } from './FolhaSuplementos.tsx'

const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }
const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

beforeEach(() => localStorage.clear())

describe('Folhas curtas no papel', () => {
  it('CA-576 e CA-580: as linhas de assinatura não se separam do último item', () => {
    render(<FolhaExames paciente="Maria Silva" nascimento={null} pedido={{ marcados: ['tsh'], outros: '' }} assinatura={ANA} data="2026-10-15" />)
    const assinaturas = screen.getByRole('group', { name: 'Assinaturas' })
    expect(assinaturas.parentElement).toHaveClass('break-before-avoid', 'break-inside-avoid')
  })

  it('CA-576: da segunda página em diante, o topo traz o título, o paciente e quem assina', () => {
    const { container } = render(
      <FolhaSuplementos paciente="Maria Silva" suplementos={[{ id: 's1', nome: 'Ferro', dose: '', horario: '', duracao: '', observacao: '' }]} assinatura={JULIA} data="2026-10-15" />,
    )
    const regra = container.querySelector('style')?.textContent ?? ''
    expect(regra).toContain('@top-left { content: "Proposta de suplementação · Maria Silva"')
    expect(regra).toContain('@top-right { content: "Júlia Martins · Carla Mendes"')
    expect(regra).toContain('@page :first')
  })

  it('CA-587: quem assina fica à esquerda quando cai embaixo do título, e à direita a partir da tela média', () => {
    render(<FolhaExames paciente="Maria Silva" nascimento={null} pedido={{ marcados: ['tsh'], outros: '' }} assinatura={JULIA} data="2026-10-15" />)
    const topo = within(screen.getByRole('article')).getByText('Estagiário(a):').closest('div')
    expect(topo).toHaveClass('text-left', 'sm:text-right')
  })
})
