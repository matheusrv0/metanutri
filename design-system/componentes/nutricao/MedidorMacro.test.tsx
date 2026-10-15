import { render, screen } from '@testing-library/react'
import type { ResultadoMacro } from '@/domain/macros.ts'
import { MedidorMacro } from './MedidorMacro.tsx'

const proteina: ResultadoMacro = {
  gramas: 89.14,
  pctKcal: 17.58,
  gPorKg: 1.4378,
  meta: { tipo: 'pct', min: 10, max: 35 },
  origemMeta: 'amdr',
  estado: 'dentro',
}

const gorduraAcima: ResultadoMacro = {
  gramas: 82.4,
  pctKcal: 36.6,
  gPorKg: 1.33,
  meta: { tipo: 'pct', min: 20, max: 35 },
  origemMeta: 'amdr',
  estado: 'acima',
}

describe('MedidorMacro enxuto (spec painel-lateral-enxuto)', () => {
  it('CA-682: gramas e % das kcal sem casa decimal; g/kg só quando pedido, com duas casas', () => {
    const { rerender } = render(<MedidorMacro nome="Proteína" macro={proteina} meta="10 a 35%" comGPorKg />)
    expect(screen.getByText('89 g · 18% · 1,44 g/kg')).toBeInTheDocument()

    rerender(<MedidorMacro nome="Gordura" macro={gorduraAcima} meta="20 a 35%" />)
    expect(screen.getByText('82 g · 37%')).toBeInTheDocument()
    expect(screen.queryByText(/g\/kg/)).not.toBeInTheDocument()
  })

  it('CA-682: com meta em g/kg, o g/kg aparece mesmo sem ser pedido', () => {
    const emGkg: ResultadoMacro = { ...proteina, meta: { tipo: 'g_kg', min: 1.2, max: 1.6 }, origemMeta: 'usuario' }
    render(<MedidorMacro nome="Proteína" macro={emGkg} meta="1,2 a 1,6 g/kg · sua meta" />)
    expect(screen.getByText('89 g · 18% · 1,44 g/kg')).toBeInTheDocument()
  })

  it('CA-682: a frase do estado e a meta curta ficam na mesma linha, sem "Meta:"', () => {
    render(<MedidorMacro nome="Gordura" macro={gorduraAcima} meta="20 a 35%" />)
    expect(screen.getByText('Passou de leve: 1,6 pontos acima')).toBeInTheDocument()
    expect(screen.getByText('20 a 35%')).toBeInTheDocument()
    expect(screen.queryByText(/Meta:/)).not.toBeInTheDocument()
  })

  it('CB-205: com meta e sem medidor, a meta aparece por extenso; sem meta, a frase de sempre', () => {
    const semEnergia: ResultadoMacro = { ...proteina, pctKcal: null, estado: null }
    const { rerender } = render(<MedidorMacro nome="Proteína" macro={semEnergia} meta="10 a 35%" />)
    expect(screen.getByText('Meta: 10 a 35%')).toBeInTheDocument()

    rerender(<MedidorMacro nome="Proteína" macro={{ ...semEnergia, meta: null, origemMeta: null }} meta={null} />)
    expect(screen.getByText('Sem meta: informe a idade ou defina uma meta.')).toBeInTheDocument()
  })

  it('CB-206: sem peso, nenhum g/kg', () => {
    render(<MedidorMacro nome="Proteína" macro={{ ...proteina, gPorKg: null }} meta="10 a 35%" comGPorKg />)
    expect(screen.getByText('89 g · 18%')).toBeInTheDocument()
  })
})

describe('MedidorMacro arredonda sem desmentir o estado (CA-696, CA-712)', () => {
  it('CA-712: perto do limite, acima arredonda para cima e abaixo para baixo', () => {
    const { rerender } = render(<MedidorMacro nome="Gordura" macro={{ ...gorduraAcima, pctKcal: 35.4 }} meta="20 a 35%" />)
    expect(screen.getByText('82 g · 36%')).toBeInTheDocument()
    rerender(<MedidorMacro nome="Gordura" macro={{ ...gorduraAcima, pctKcal: 19.6, estado: 'abaixo' }} meta="20 a 35%" />)
    expect(screen.getByText('82 g · 19%')).toBeInTheDocument()
  })

  it('CA-712: longe do limite, arredonda para o mais perto', () => {
    const { rerender } = render(<MedidorMacro nome="Gordura" macro={{ ...gorduraAcima, pctKcal: 40.2 }} meta="20 a 35%" />)
    expect(screen.getByText('82 g · 40%')).toBeInTheDocument()
    rerender(<MedidorMacro nome="Gordura" macro={{ ...gorduraAcima, pctKcal: 15.6, estado: 'abaixo' }} meta="20 a 35%" />)
    expect(screen.getByText('82 g · 16%')).toBeInTheDocument()
  })
})
