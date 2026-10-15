import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarRepositorioPacientes } from '@/domain/pacientes.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { criarAconselhamento } from '@/export/aconselhamento-docx.ts'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
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

describe('Suplementos da ficha na dieta e no Word (spec anamnese-e-prescricoes, CA-577, CA-584, CB-166)', () => {
  const vitD = { id: 's1', nome: 'Vitamina D3', dose: '1 cápsula', horario: '', duracao: '', observacao: '' }

  beforeEach(() => {
    vi.mocked(criarAconselhamento).mockClear()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  function comPaciente(caso: Caso, assinatura: AssinaturaDoPlano | null) {
    const pacientes = criarRepositorioPacientes(null, { gerarId: () => 'p1' })
    pacientes.salvar({ ...pacientes.criar('Maria'), suplementos: [vitD] })
    render(
      <ProvedorPacientes repositorio={pacientes}>
        <MenuExportar caso={caso} plano={criarPlanoPadrao(ids)} assinatura={assinatura} />
      </ProvedorPacientes>,
    )
    return userEvent.setup()
  }

  it('CA-577: o plano ligado ao paciente leva os suplementos da ficha para a dieta e para o Word', async () => {
    const usuario = comPaciente({ ...criarCasoVazio('c1'), pacienteId: 'p1' }, ANA)
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Dieta para imprimir (PDF)' }))
    const dieta = within(screen.getByRole('dialog', { name: 'Dieta para imprimir' }))
    expect(within(dieta.getByRole('region', { name: 'Suplementos' })).getByText(/Vitamina D3/)).toBeInTheDocument()
    await usuario.keyboard('{Escape}')

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Aconselhamento em Word' }))
    await screen.findByText('Aconselhamento baixado.')
    const dados = vi.mocked(criarAconselhamento).mock.calls[0]?.[0]
    expect(dados?.suplementos).toEqual([vitD])
    expect(dados?.propostaDeEstagio).toBe(false)
  })

  it('CA-584: plano de estudante manda a frase de proposta ao Word', async () => {
    const usuario = comPaciente({ ...criarCasoVazio('c1'), pacienteId: 'p1' }, { ...ANA, situacao: 'estudante', linhaNutricionista: null })
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Aconselhamento em Word' }))
    await screen.findByText('Aconselhamento baixado.')
    expect(vi.mocked(criarAconselhamento).mock.calls[0]?.[0]?.propostaDeEstagio).toBe(true)
  })

  it('CB-166: plano sem paciente não leva suplemento', async () => {
    const usuario = comPaciente(criarCasoVazio('c1'), ANA)
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Aconselhamento em Word' }))
    await screen.findByText('Aconselhamento baixado.')
    expect(vi.mocked(criarAconselhamento).mock.calls[0]?.[0]?.suplementos).toEqual([])
  })
})
