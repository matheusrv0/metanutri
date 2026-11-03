// A etapa 1 do plano e a avaliação completa (spec antropometria-telas, D-1437).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

const vazio = criarCasoVazio('c1')

function Anfitriao({ inicial, aoAbrirAvaliacao }: { readonly inicial: Partial<Caso>; readonly aoAbrirAvaliacao: () => void }) {
  const [caso, setCaso] = useState<Caso>({ ...vazio, ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} aoAbrirAvaliacao={aoAbrirAvaliacao} />
}

const adulta = { sexo: 'F', idadeAnos: 34, pesoKg: 71.5, estaturaCm: 164 } as const

describe('a etapa 1 leva à avaliação completa (spec antropometria-telas, CA-2406 e CA-2468)', () => {
  it('CA-2406: o cartão "Avaliação antropométrica" tem "Abrir a avaliação completa"', async () => {
    const aoAbrir = vi.fn()
    render(<Anfitriao inicial={adulta} aoAbrirAvaliacao={aoAbrir} />)
    const painel = within(screen.getByRole('region', { name: 'Avaliação antropométrica' }))
    await userEvent.setup().click(painel.getByRole('button', { name: 'Abrir a avaliação completa' }))
    expect(aoAbrir).toHaveBeenCalledTimes(1)
  })

  it('CA-2468: com Petroski, a composição diz o protocolo da avaliação completa, sem as dobras de hoje', async () => {
    const aoAbrir = vi.fn()
    const comPetroski: Partial<Caso> = { ...adulta, composicao: { ...vazio.composicao, protocolo: 'petroski', dobras: { ...vazio.composicao.dobras, tricipital: 20 } } }
    render(<Anfitriao inicial={comPetroski} aoAbrirAvaliacao={aoAbrir} />)
    const usuario = userEvent.setup()
    // A composição abre sozinha quando já tem dado.
    expect(screen.getByText('Protocolo da avaliação completa: Petroski')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tricipital')).not.toBeInTheDocument()
    expect(screen.queryByText('Resultado das dobras')).not.toBeInTheDocument()
    // A bioimpedância continua.
    expect(screen.getByLabelText('Gordura')).toBeInTheDocument()
    const composicao = screen.getByText('Protocolo da avaliação completa: Petroski').closest('div')
    if (!composicao) throw new Error('sem o bloco do protocolo')
    await usuario.click(within(composicao.parentElement ?? composicao).getByRole('button', { name: 'Abrir a avaliação completa' }))
    expect(aoAbrir).toHaveBeenCalled()

    // Escolher um dos 2 de hoje volta às 6 dobras, com o valor que já estava.
    await usuario.click(screen.getByRole('radio', { name: 'Jackson e Pollock, 3 dobras' }))
    expect(screen.queryByText(/Protocolo da avaliação completa/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tricipital')).toHaveValue('20')
  })
})
