import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { MicrosDoDia } from './MicrosDoDia.tsx'

let n = 0
const ids = () => `id${++n}`

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }

/** Almoço com os alimentos dados (id e gramas) no Principal. */
function planoCom(...itens: readonly (readonly [number, number])[]): Plano {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  for (const [alimentoId, gramas] of itens) plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId, gramas }, ids)
  return plano
}

const ARROZ = 3
const SAL_GROSSO = 517

function Anfitriao({ inicial, planoInicial, aoVerTodos }: { readonly inicial: Partial<Caso>; readonly planoInicial: Plano; readonly aoVerTodos: () => void }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  const [plano, setPlano] = useState<Plano>(planoInicial)
  return (
    <MicrosDoDia
      caso={caso}
      plano={plano}
      gastoEnergetico={1800}
      aoAlterarCaso={(m) => setCaso((c) => ({ ...c, ...m }))}
      aoAlterarPlano={setPlano}
      aoVerTodos={aoVerTodos}
      gerarId={ids}
    />
  )
}

const montar = (inicial: Partial<Caso> = adulta, planoInicial: Plano = planoCom([ARROZ, 200])) => {
  const aoVerTodos = vi.fn()
  const { unmount } = render(<Anfitriao inicial={inicial} planoInicial={planoInicial} aoVerTodos={aoVerTodos} />)
  return { usuario: userEvent.setup(), aoVerTodos, desmontar: unmount }
}

const cartao = () => within(screen.getByRole('region', { name: 'Micronutrientes' }))
const linhas = () => within(cartao().getByRole('list', { name: 'Fora da meta' })).getAllByRole('listitem')
const pctDe = (linha: HTMLElement) => Number((linha.textContent ?? '').match(/(\d+)%/)?.[1])

describe('Cartão Micronutrientes da etapa 2 (spec painel-lateral-enxuto)', () => {
  it('CA-685 e CB-203: conta os abaixo da meta e mostra os 5 mais longe, cada um com Cobrir', () => {
    montar()
    expect(cartao().getByText(/^\d+ de 16 abaixo da meta$/)).toBeInTheDocument()
    const total = Number(cartao().getByText(/de 16 abaixo da meta/).textContent?.split(' ')[0])
    expect(total).toBeGreaterThan(5)

    const itens = linhas()
    expect(itens).toHaveLength(5)
    const pcts = itens.map(pctDe)
    expect([...pcts].sort((a, b) => a - b)).toEqual(pcts)
    for (const item of itens) {
      expect(within(item).getByRole('button', { name: /^Cobrir / })).toBeInTheDocument()
      expect(within(item).getByText(/^\d+%$/)).toHaveClass('text-warningtext')
    }
  })

  it('CA-691: o Cobrir do cartão tem fundo teal claro', () => {
    montar()
    expect(linhas()[0]?.querySelector('button')?.className).toContain('bg-lightprimary')
  })

  it('CA-686 e CB-204: Cobrir abre a gaveta de sempre, e Adicionar põe o alimento e refaz o cartão', async () => {
    const { usuario } = montar()
    const antes = linhas().map((l) => l.textContent)
    const primeira = linhas()[0]
    if (!primeira) throw new Error('sem linha')
    const nome = within(primeira).getByRole('button').getAttribute('aria-label')?.replace('Cobrir ', '') ?? ''
    await usuario.click(within(primeira).getByRole('button'))

    const gaveta = within(screen.getByRole('dialog'))
    expect(gaveta.getByRole('heading', { name: `Cobrir ${nome}` })).toBeInTheDocument()
    expect(gaveta.getByText(/para a meta/)).toBeInTheDocument()
    await usuario.selectOptions(gaveta.getByLabelText('Adicionar em'), gaveta.getByRole('option', { name: /Jantar/ }))
    const sugestao = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')[0]
    if (!sugestao) throw new Error('sem sugestão')
    await usuario.click(within(sugestao).getByRole('button', { name: 'Adicionar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(linhas().map((l) => l.textContent)).not.toEqual(antes)
  })

  it('CA-687: acima do limite aparece com o estado, sem Cobrir', () => {
    montar(adulta, planoCom([ARROZ, 200], [SAL_GROSSO, 10]))
    const sodio = linhas().find((l) => l.textContent?.startsWith('Sódio'))
    if (!sodio) throw new Error('sódio não está no cartão')
    expect(within(sodio).getByText(/^\d+% · acima do limite$/)).toHaveClass('text-errortext')
    expect(within(sodio).queryByRole('button')).not.toBeInTheDocument()
  })

  it('CA-688: "Ver todos" leva à etapa 3', async () => {
    const { usuario, aoVerTodos } = montar()
    await usuario.click(cartao().getByRole('button', { name: 'Ver todos' }))
    expect(aoVerTodos).toHaveBeenCalledOnce()
  })

  it('CB-200: plano sem alimentos não lista nada', () => {
    montar(adulta, criarPlanoPadrao(ids))
    expect(cartao().getByText('O plano ainda não tem alimentos.')).toBeInTheDocument()
    expect(cartao().queryByRole('list')).not.toBeInTheDocument()
    expect(cartao().queryByRole('button', { name: /^Cobrir/ })).not.toBeInTheDocument()
  })

  it('CB-201: sem sexo e idade, mostra o motivo e não lista nada', () => {
    montar({}, planoCom([ARROZ, 200]))
    expect(cartao().getByText(/Informe sexo e idade/)).toBeInTheDocument()
    expect(cartao().queryByRole('list')).not.toBeInTheDocument()
  })

  it('CB-202: nada abaixo da meta nem acima do limite, o cartão diz que está tudo na meta', () => {
    const preset = { tipo: 'personalizado', referencia: 'ear', minimoPct: 1 } as const
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset } }, criarExemplo(ids, '2026-10-15').plano)
    expect(cartao().getByText('Todos os 16 na meta.')).toBeInTheDocument()
    expect(cartao().queryByRole('list')).not.toBeInTheDocument()
  })

  it('CB-209: a referência do caso vale no cartão (coletivo cobra menos)', () => {
    const { desmontar } = montar()
    const individual = Number(cartao().getByText(/de 16 abaixo da meta/).textContent?.split(' ')[0])
    desmontar()
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'coletivo' } } })
    const coletivo = Number(cartao().getByText(/de 16 abaixo da meta/).textContent?.split(' ')[0])
    expect(coletivo).toBeLessThanOrEqual(individual)
  })

  it('a falta de dado aparece com a marca †, como na tabela', () => {
    montar(adulta, planoCom([ARROZ, 200]))
    const marcas = cartao().getAllByTitle(/total possivelmente subestimado/)
    expect(marcas.length).toBeGreaterThan(0)
    for (const marca of marcas) expect(marca).toHaveTextContent('†')
  })
})
