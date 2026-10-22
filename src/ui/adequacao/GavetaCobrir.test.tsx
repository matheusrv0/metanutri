import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { calcularAdequacao } from '@/domain/adequacao.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { SODIO_NAO_SE_COBRE, sugerirParaCobrir } from '@/domain/cobrir.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso } from '@/domain/tipos.ts'
import { GavetaCobrir } from './GavetaCobrir.tsx'
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

describe('Refeição de cada alimento (spec sugestoes-com-criterio, correção A, D-441)', () => {
  const montar = (aoAdicionar = vi.fn()) => {
    const totais = totaisDoPlano(plano, buscarAlimento)
    const adequacao = calcularAdequacao(totais, caso, caso.adequacao.preset)
    render(
      <GavetaCobrir
        chave="ferro_mg"
        rotulo="Ferro"
        caso={caso}
        plano={plano}
        totais={totais}
        adequacao={adequacao}
        gastoEnergetico={1800}
        aoAlterarCaso={nada}
        aoAdicionar={aoAdicionar}
        aoFechar={nada}
      />,
    )
    return { aoAdicionar, gaveta: within(screen.getByRole('dialog')) }
  }

  it('CA-1249: "Adicionar em" começa em "Refeição de cada alimento", e cada botão diz para onde vai', async () => {
    const { aoAdicionar, gaveta } = montar()
    expect(gaveta.getByLabelText('Adicionar em')).toHaveDisplayValue('Refeição de cada alimento')
    const itens = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    expect(itens.length).toBeGreaterThan(0)
    for (const item of itens) expect(within(item).getByRole('button', { name: /^Adicionar em / })).toBeInTheDocument()
    const primeiro = itens[0]
    if (!primeiro) throw new Error('sem sugestão')
    const botao = within(primeiro).getByRole('button', { name: /^Adicionar em / })
    const destino = plano.refeicoes.find((r) => botao.textContent === `Adicionar em ${r.nome}`)
    expect(destino).toBeDefined()
    await userEvent.setup().click(botao)
    expect(aoAdicionar.mock.calls[0]?.slice(0, 2)).toEqual([destino?.id, 'principal'])
  })

  it('CA-1249: escolhida uma refeição na lista, todas vão para ela', async () => {
    const { aoAdicionar, gaveta } = montar()
    const usuario = userEvent.setup()
    const jantar = plano.refeicoes.find((r) => r.nome === 'Jantar')
    if (!jantar) throw new Error('sem jantar')
    await usuario.selectOptions(gaveta.getByLabelText('Adicionar em'), gaveta.getByRole('option', { name: /Jantar/ }))
    const itens = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    for (const item of itens) expect(within(item).getByRole('button', { name: 'Adicionar em Jantar' })).toBeInTheDocument()
    const primeiro = itens[0]
    if (!primeiro) throw new Error('sem sugestão')
    await usuario.click(within(primeiro).getByRole('button', { name: 'Adicionar em Jantar' }))
    expect(aoAdicionar.mock.calls[0]?.slice(0, 2)).toEqual([jantar.id, 'principal'])
  })
})

describe('Gaveta aberta para o sódio (CA-714)', () => {
  it('CA-714: se a gaveta chegar a abrir para o sódio, não lista sugestão e mostra a mensagem do domínio', () => {
    const totais = totaisDoPlano(plano, buscarAlimento)
    const adequacao = calcularAdequacao(totais, caso, caso.adequacao.preset)
    expect(adequacao.linhas.find((l) => l.chave === 'sodio_mg')?.estado).toBe('abaixo')

    render(
      <GavetaCobrir
        chave="sodio_mg"
        rotulo="Sódio"
        caso={caso}
        plano={plano}
        totais={totais}
        adequacao={adequacao}
        gastoEnergetico={1800}
        aoAlterarCaso={nada}
        aoAdicionar={nada}
        aoFechar={nada}
      />,
    )
    const gaveta = within(screen.getByRole('dialog'))
    expect(gaveta.getByText(SODIO_NAO_SE_COBRE)).toBeInTheDocument()
    expect(within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).queryAllByRole('listitem')).toHaveLength(0)
    expect(gaveta.queryByRole('button', { name: /^Adicionar/ })).not.toBeInTheDocument()
  })
})
