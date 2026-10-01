import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }

function Anfitriao({ assinatura, inicial }: { readonly assinatura: AssinaturaDoPlano | null; readonly inicial?: Partial<Caso> }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} assinatura={assinatura} />
}

const montar = (assinatura: AssinaturaDoPlano | null, inicial?: Partial<Caso>) =>
  render(<Anfitriao assinatura={assinatura} {...(inicial ? { inicial } : {})} />)

describe('Identificação pela situação (CA-251, CB-51, CB-69)', () => {
  it('CA-251: nutricionista não vê estagiário nem preceptor, e vê quem assina', () => {
    montar(ANA)
    expect(screen.queryByLabelText('Estagiário(a)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Preceptor(a)')).not.toBeInTheDocument()
    expect(screen.getByText(/Assina este plano:/)).toBeInTheDocument()
    expect(screen.getByText('Ana Souza · CRN-6 12345')).toBeInTheDocument()
    expect(screen.getByText('Vem do seu cadastro.')).toBeInTheDocument()
  })

  it('CB-51: plano antigo com estagiário preenchido mostra os campos com o texto', () => {
    montar(ANA, { estagiario: 'Júlia Martins' })
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('Júlia Martins')
    expect(screen.getByLabelText('Preceptor(a)')).toHaveValue('')
    expect(screen.queryByText(/Assina este plano:/)).not.toBeInTheDocument()
  })

  it('CB-69: conta sem situação fica como era', () => {
    montar({ ...ANA, situacao: null, linhaNutricionista: null })
    expect(screen.getByLabelText('Estagiário(a)')).toBeInTheDocument()
    expect(screen.queryByText(/Assina este plano:/)).not.toBeInTheDocument()
  })

  it('estudante vê os dois campos e de onde eles vêm', () => {
    montar(JULIA)
    expect(screen.getByLabelText('Estagiário(a)')).toBeInTheDocument()
    expect(screen.getByText(/Em plano novo, Estagiário\(a\) vem do nome da sua conta/)).toBeInTheDocument()
  })

  it('Foco de revisão 5: nutricionista sem nome e CRN em Quem assina é mandada para lá', () => {
    montar({ ...ANA, origem: 'aparelho', linhaNutricionista: null, nome: '' })
    expect(screen.getByText('nome e CRN não informados')).toBeInTheDocument()
    expect(screen.getByText('Preencha em Configurações › Quem assina.')).toBeInTheDocument()
  })

  it('item 8: conta sem nome e CRN manda conferir em Conta e plano, não em Configurações', () => {
    montar({ ...ANA, origem: 'conta', linhaNutricionista: null })
    expect(screen.getByText('Confira nome e CRN em Conta e plano.')).toBeInTheDocument()
    expect(screen.queryByText(/Quem assina/)).not.toBeInTheDocument()
  })
})

describe('Receitas só para estudante (CA-234, CA-236, CB-50)', () => {
  it('CA-234: nutricionista vê só Orientações', () => {
    montar(ANA)
    expect(screen.getByRole('heading', { name: 'Orientações' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Receitas')).not.toBeInTheDocument()
  })

  it('CB-50: receitas já escritas continuam aparecendo', () => {
    montar(ANA, { receitas: 'Cuscuz com ovo.' })
    expect(screen.getByRole('heading', { name: 'Orientações e receitas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Receitas')).toHaveValue('Cuscuz com ovo.')
  })

  it('item 6: apagar o texto das receitas não faz o campo sumir no meio da edição', async () => {
    montar(ANA, { receitas: 'Cuscuz com ovo.' })
    await userEvent.setup().clear(screen.getByLabelText('Receitas'))
    expect(screen.getByLabelText('Receitas')).toHaveValue('')
  })

  it('item 6: apagar o estagiário de um plano antigo também mantém os campos', async () => {
    montar(ANA, { estagiario: 'Júlia Martins' })
    await userEvent.setup().clear(screen.getByLabelText('Estagiário(a)'))
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('')
    expect(screen.queryByText(/Assina este plano:/)).not.toBeInTheDocument()
  })

  it('CA-236: estudante continua com o campo Receitas', () => {
    montar(JULIA)
    expect(screen.getByRole('heading', { name: 'Orientações e receitas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Receitas')).toBeInTheDocument()
  })
})
