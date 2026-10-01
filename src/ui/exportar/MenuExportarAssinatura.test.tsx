import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { criarAconselhamento } from '@/export/aconselhamento-docx.ts'
import { MenuExportar } from './MenuExportar.tsx'

// Espia o que o menu manda para o Word, sem deixar de gerar o documento de verdade.
vi.mock('@/export/aconselhamento-docx.ts', async (original) => {
  const real = await original<typeof import('@/export/aconselhamento-docx.ts')>()
  return { ...real, criarAconselhamento: vi.fn(real.criarAconselhamento) }
})

let n = 0
const ids = () => `id${++n}`

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

describe('Word conforme a situação (CA-235, CA-252, CB-50, CB-51)', () => {
  beforeEach(() => {
    vi.mocked(criarAconselhamento).mockClear()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  const baixar = async (caso: Caso, assinatura: AssinaturaDoPlano | null) => {
    render(<MenuExportar caso={caso} plano={criarPlanoPadrao(ids)} assinatura={assinatura} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Aconselhamento em Word' }))
    await screen.findByText('Aconselhamento baixado.')
    return vi.mocked(criarAconselhamento).mock.calls[0]?.[0]
  }

  it('nutricionista: linha do cadastro e sem receitas', async () => {
    const dados = await baixar(criarCasoVazio('c1'), ANA)
    expect(dados?.nutricionista).toBe('Ana Souza · CRN-6 12345')
    expect(dados?.comReceitas).toBe(false)
  })

  it('CB-50 e CB-51: plano antigo de nutricionista sai como saía', async () => {
    const dados = await baixar({ ...criarCasoVazio('c1'), estagiario: 'Júlia', receitas: 'Cuscuz com ovo.' }, ANA)
    expect(dados?.nutricionista).toBeNull()
    expect(dados?.comReceitas).toBe(true)
  })

  it('estudante: Word de estágio de sempre', async () => {
    const dados = await baixar(criarCasoVazio('c1'), { ...ANA, situacao: 'estudante', linhaNutricionista: null })
    expect(dados?.nutricionista).toBeNull()
    expect(dados?.comReceitas).toBe(true)
  })
})
