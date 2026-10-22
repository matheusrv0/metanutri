import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { ResumoDoDia } from '../resumo/ResumoDoDia.tsx'
import { TelaCaso } from './TelaCaso.tsx'

let n = 0
const ids = () => `id${++n}`
const plano = criarPlanoPadrao(ids)

function Anfitriao() {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 })
  const alterar = (m: Partial<Caso>) => setCaso((c) => ({ ...c, ...m }))
  return <TelaCaso caso={caso} aoAlterar={alterar} lateral={<ResumoDoDia caso={caso} plano={plano} aoAlterar={alterar} />} />
}

describe('Nível de atividade no atendimento completo (CA-225, CA-231)', () => {
  it('CA-225: aparece no cartão de medidas', () => {
    render(<Anfitriao />)
    expect(screen.getAllByRole('radiogroup', { name: 'Nível de atividade' })).toHaveLength(1)
  })

  it('CA-231 e CA-1069: escolher no cartão muda o GET; "Ajustar" não repete o nível, e o fator próprio acompanha', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    const resumo = within(screen.getByRole('region', { name: 'Resumo do dia' }))
    expect(resumo.getByText('1.596 kcal')).toBeInTheDocument() // 1330,25 × 1,2
    await usuario.click(screen.getByRole('radio', { name: 'Muito ativo (1,7)' }))
    expect(resumo.getByText('2.261 kcal')).toBeInTheDocument() // 1330,25 × 1,7 = 2261,4
    await usuario.click(resumo.getByRole('button', { name: 'Ajustar' }))
    expect(resumo.queryByRole('radiogroup', { name: 'Nível de atividade' })).not.toBeInTheDocument()
    expect(resumo.getByLabelText('Fator próprio')).toHaveValue('1,7')
    expect(screen.getAllByRole('radiogroup', { name: 'Nível de atividade' })).toHaveLength(1)
  })

  it('R11: o fator só aparece ao lado do nome na equação de adulto', () => {
    function Crianca() {
      const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c2'), sexo: 'F', idadeAnos: 6, pesoKg: 21, estaturaCm: 116 })
      return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
    }
    render(<Crianca />)
    expect(screen.getByRole('radio', { name: 'Sedentário' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Sedentário (1,2)' })).not.toBeInTheDocument()
  })
})
