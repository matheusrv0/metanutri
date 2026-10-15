import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarCasoVazio } from '@/domain/caso.ts'
import { sugerirParaCobrir } from '@/domain/cobrir.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaAdequacao } from './TelaAdequacao.tsx'

// Espia o cálculo de verdade, para contar quantas vezes a gaveta recalcula as sugestões.
vi.mock('@/domain/cobrir.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/domain/cobrir.ts')>()
  return { ...real, sugerirParaCobrir: vi.fn(real.sugerirParaCobrir) }
})

let n = 0
const ids = () => `g${++n}`
const caso: Caso = { ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }
const vazio = criarPlanoPadrao(ids)
const almoco = vazio.refeicoes[2]
if (!almoco) throw new Error('sem almoço')
const plano = adicionarItem(vazio, almoco.id, 'principal', { alimentoId: 3, gramas: 200 }, ids)
const nada = () => undefined

const tela = (restricoes: readonly string[]) => (
  <TelaAdequacao
    caso={caso}
    plano={plano}
    gastoEnergetico={1800}
    restricoes={restricoes}
    aoAlterarCaso={nada}
    aoAlterarPlano={nada}
    gerarId={ids}
    aoAbrirFontes={nada}
  />
)

describe('GavetaCobrir', () => {
  it('revisão N7: a mesma restrição, num array novo, não refaz o cálculo das sugestões', async () => {
    const { rerender } = render(tela(['abacaxi']))
    const linhaFerro = screen.getByText('Ferro').closest('tr')
    if (!linhaFerro) throw new Error('sem a linha do ferro')
    await userEvent.setup().click(within(linhaFerro).getByRole('button', { name: 'Cobrir Ferro' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const calculos = vi.mocked(sugerirParaCobrir).mock.calls.length
    rerender(tela(['abacaxi']))
    rerender(tela(['abacaxi']))
    expect(vi.mocked(sugerirParaCobrir).mock.calls.length).toBe(calculos)

    // Restrição diferente recalcula.
    rerender(tela(['banana']))
    expect(vi.mocked(sugerirParaCobrir).mock.calls.length).toBeGreaterThan(calculos)
  })
})
