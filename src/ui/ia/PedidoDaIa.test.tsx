import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { perguntasQueFaltam } from '@/domain/iaGaveta.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPacienteVazio } from '@/domain/pacientes.ts'
import { MAXIMO_DO_ALGO_MAIS, PedidoDaIa, type RespostasDaGaveta } from './PedidoDaIa.tsx'

const REFEICOES = [
  { nome: 'Café da manhã', horario: '06:30' },
  { nome: 'Almoço', horario: '12:00' },
]

function Pedido({ aoGravar = vi.fn() }: { readonly aoGravar?: (id: string, respostas: RespostasDaGaveta) => void }) {
  const [respostas, setRespostas] = useState<RespostasDaGaveta>({})
  const [tiradas, setTiradas] = useState<ReadonlySet<number>>(new Set())
  const [algoMais, setAlgoMais] = useState('')
  return (
    <PedidoDaIa
      ficha={[{ rotulo: 'Fase da vida', valor: 'Gestante, 24 semanas' }]}
      aoEditarNaFicha={vi.fn()}
      meta="2100"
      aoMudarMeta={vi.fn()}
      textoDaMeta="Calculada pela ficha. A sugestão segue esta meta."
      perguntas={perguntasQueFaltam(criarPacienteVazio('p', '2026-11-03T00:00:00Z'), criarCasoVazio('c'))}
      respostas={respostas}
      aoMudarResposta={(id, v) => setRespostas((r) => ({ ...r, [id]: v }))}
      aoGravarResposta={(id) => aoGravar(id, respostas)}
      refeicoes={REFEICOES}
      tiradas={tiradas}
      aoTirar={(i) => setTiradas((t) => new Set([...t, i]))}
      aoRecolocar={() => setTiradas(new Set())}
      algoMais={algoMais}
      aoMudarAlgoMais={setAlgoMais}
      autorizacao={<p>autorização</p>}
    />
  )
}

describe('PedidoDaIa (spec assistente-ia, D-1303)', () => {
  it('na ordem: a ficha, a meta, o que falta, as refeições, algo mais e a autorização', () => {
    render(<Pedido />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['A ficha tem', 'Falta na ficha', 'Refeições e horários', 'Algo mais'])
    expect(screen.getByLabelText('Meta de energia do dia')).toHaveValue('2100')
    expect(screen.getByText('As respostas ficam salvas na ficha.')).toBeInTheDocument()
    expect(screen.getByText('autorização')).toBeInTheDocument()
  })

  it('CA-2362: a resposta grava ao sair do campo; o sono tem os dois horários e o orçamento, as três escolhas', async () => {
    const aoGravar = vi.fn()
    const usuario = userEvent.setup()
    render(<Pedido aoGravar={aoGravar} />)
    await usuario.type(screen.getByLabelText('Alimentos de que gosta'), 'cuscuz')
    await usuario.tab()
    expect(aoGravar).toHaveBeenCalledWith('gosta', expect.objectContaining({ gosta: 'cuscuz' }))
    expect(screen.getByRole('group', { name: 'Horário de acordar e de dormir' })).toBeInTheDocument()
    expect(within(screen.getByRole('radiogroup', { name: 'Orçamento' })).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Econômico', 'Intermediário', 'Sem restrição'])
  })

  it('CA-2364: tirar a refeição a manda para "Fora da sugestão", e "Recolocar" volta', async () => {
    const usuario = userEvent.setup()
    render(<Pedido />)
    await usuario.click(screen.getByRole('button', { name: 'Tirar Almoço da sugestão' }))
    expect(screen.getByText(/Fora da sugestão: Almoço/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tirar Almoço da sugestão' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Recolocar' }))
    expect(screen.queryByText(/Fora da sugestão/)).not.toBeInTheDocument()
  })

  it('D-1303 (5): "Algo mais" conta até 300', async () => {
    render(<Pedido />)
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Algo mais' }), 'jantar leve')
    expect(screen.getByText(`Opcional · 11/${MAXIMO_DO_ALGO_MAIS}`)).toBeInTheDocument()
  })
})
