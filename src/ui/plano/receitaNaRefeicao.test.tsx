import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import { ID_DE_RECEITA } from '@/domain/receitaNoPlano.ts'
import { CHAVE_RECEITAS, type Receita } from '@/domain/receitas.ts'
import { itemDeReceita, PANQUECA } from '@/domain/receitas.test-utils.ts'
import type { Plano } from '@/domain/tipos.ts'
import { EntradaRapida } from './EntradaRapida.tsx'
import { TelaPlano } from './TelaPlano.tsx'

// Spec receitas-com-calculo, US-RC3: a receita na refeição.

const NA_BIBLIOTECA: Receita = {
  id: PANQUECA.origemId,
  nome: PANQUECA.nome,
  ingredientes: PANQUECA.ingredientes,
  porcoes: PANQUECA.porcoes,
  nomeDaPorcao: PANQUECA.nomeDaPorcao,
  pesoProntoG: PANQUECA.pesoProntoG,
  preparo: PANQUECA.preparo,
  criadoEm: '2026-10-19T10:00:00.000Z',
  atualizadoEm: '2026-10-19T10:00:00.000Z',
}

const guardarReceitas = (lista: readonly Receita[]) => localStorage.setItem(CHAVE_RECEITAS, JSON.stringify(lista))

let n = 0
const ids = () => `id${++n}`
let ultimoPlano: Plano | null = null

function Anfitriao({ inicial }: { readonly inicial: Plano }) {
  const [plano, setPlano] = useState<Plano>(inicial)
  return (
    <TelaPlano
      plano={plano}
      aoAlterarPlano={(novo) => {
        ultimoPlano = novo
        setPlano(novo)
      }}
      gerarId={ids}
    />
  )
}

const montarPlano = (inicial: Plano = criarPlanoPadrao(ids)) => {
  render(<Anfitriao inicial={inicial} />)
  return userEvent.setup()
}

const comPanquecaNoDesjejum = (gramas = 120): Plano => {
  const plano = criarPlanoPadrao(ids)
  return {
    refeicoes: plano.refeicoes.map((r) => (r.nome === 'Desjejum' ? { ...r, opcoes: { ...r.opcoes, principal: [itemDeReceita('i-panqueca', gramas)] } } : r)),
  }
}

beforeEach(() => {
  localStorage.clear()
  ultimoPlano = null
})

describe('a receita na busca da refeição (CA-871, CA-872)', () => {
  const adicionadas: { nome: string; gramas: number }[] = []
  const alimentos: { alimentoId: number; gramas: number }[] = []
  beforeEach(() => {
    adicionadas.length = 0
    alimentos.length = 0
  })

  const montar = (comReceitas = true) => {
    render(
      <EntradaRapida
        rotulo="Adicionar alimento"
        aoAdicionar={(alimentoId, gramas) => alimentos.push({ alimentoId, gramas })}
        {...(comReceitas ? { aoAdicionarReceita: (receita: Receita, gramas: number) => adicionadas.push({ nome: receita.nome, gramas }) } : {})}
      />,
    )
    return userEvent.setup()
  }
  const campo = () => screen.getByRole('combobox', { name: 'Adicionar alimento' })

  it('CA-871: o começo do nome traz a receita acima dos alimentos, com porção, peso e kcal; Enter põe 1 porção', async () => {
    guardarReceitas([NA_BIBLIOTECA])
    const usuario = montar()
    await usuario.type(campo(), 'panqueca')
    const [primeira] = screen.getAllByRole('option')
    expect(primeira).toHaveTextContent('Panqueca de banana')
    expect(primeira).toHaveTextContent('Receita')
    expect(primeira).toHaveTextContent('1 unidade · 120 g · 204 kcal')
    // Sem alimento com esse nome, a busca não diz que nada foi achado.
    expect(screen.queryByText(/Nenhum alimento encontrado/)).not.toBeInTheDocument()
    await usuario.keyboard('{Enter}')
    expect(adicionadas).toEqual([{ nome: 'Panqueca de banana', gramas: 120 }])
    expect(alimentos).toEqual([])
  })

  it('CA-871: o termo no meio do nome deixa a receita abaixo dos alimentos, e o Enter põe o alimento', async () => {
    guardarReceitas([NA_BIBLIOTECA])
    const usuario = montar()
    await usuario.type(campo(), '75 banana')
    const opcoes = screen.getAllByRole('option')
    expect(opcoes[0]).not.toHaveTextContent('Receita')
    expect(opcoes.at(-1)).toHaveTextContent('Panqueca de banana')
    await usuario.keyboard('{Enter}')
    expect(alimentos).toHaveLength(1)
    expect(alimentos[0]?.gramas).toBe(75)
    expect(adicionadas).toEqual([])
  })

  it('CA-872: com o nome da porção, as porções; só número, as gramas; outra medida, o aviso', async () => {
    guardarReceitas([NA_BIBLIOTECA])
    const usuario = montar()
    await usuario.type(campo(), '2 unidade panqueca{Enter}')
    await usuario.type(campo(), '150 panqueca{Enter}')
    expect(adicionadas).toEqual([
      { nome: 'Panqueca de banana', gramas: 240 },
      { nome: 'Panqueca de banana', gramas: 150 },
    ])
    await usuario.type(campo(), '2 colher de sopa panqueca')
    expect(screen.getByText('Esta receita é medida em unidade. Use "2 unidade" ou as gramas.')).toBeInTheDocument()
    await usuario.keyboard('{Enter}')
    expect(adicionadas).toHaveLength(2)
  })

  it('sem quem receba a receita (o editor de receita), a busca não mostra receita', async () => {
    guardarReceitas([NA_BIBLIOTECA])
    const usuario = montar(false)
    await usuario.type(campo(), 'panqueca')
    expect(screen.queryByText('Panqueca de banana')).not.toBeInTheDocument()
  })
})

describe('a receita no plano (CA-870, CA-873, CA-874)', () => {
  it('CA-871: pela busca do Desjejum, a receita entra como cópia', async () => {
    guardarReceitas([NA_BIBLIOTECA])
    const usuario = montarPlano()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento em Principal de Desjejum' }), 'panqueca{Enter}')
    const item = ultimoPlano?.refeicoes.find((r) => r.nome === 'Desjejum')?.opcoes.principal[0]
    expect(item).toMatchObject({ alimentoId: ID_DE_RECEITA, gramas: 120, receita: PANQUECA })
  })

  it('CA-873: a linha mostra o nome, "Receita · 1 unidade", as gramas e as kcal, sem "Substituir"', () => {
    montarPlano(comPanquecaNoDesjejum())
    const desjejum = within(screen.getByRole('tabpanel', { name: 'Principal de Desjejum' }))
    const linha = desjejum.getByText('Panqueca de banana').closest('li')
    expect(linha).not.toBeNull()
    const naLinha = within(linha as HTMLElement)
    expect(naLinha.getByText('Receita · 1 unidade')).toBeInTheDocument()
    expect(naLinha.getByLabelText('Gramas de Panqueca de banana')).toHaveValue('120')
    expect(naLinha.getByText('204 kcal')).toBeInTheDocument()
    expect(naLinha.queryByRole('button', { name: 'Substituir Panqueca de banana' })).not.toBeInTheDocument()
    expect(naLinha.getByRole('button', { name: 'Remover Panqueca de banana' })).toBeInTheDocument()
  })

  it('CB-279: sem meia porção que feche, a linha diz só "Receita"', () => {
    montarPlano(comPanquecaNoDesjejum(150))
    const desjejum = within(screen.getByRole('tabpanel', { name: 'Principal de Desjejum' }))
    expect(desjejum.getByText('Receita')).toBeInTheDocument()
  })

  it('CA-874: o kcal do cartão da refeição soma a receita', () => {
    montarPlano(comPanquecaNoDesjejum(240))
    const cartao = screen.getByRole('tablist', { name: 'Opções de Desjejum' }).closest('[data-slot="card"]')
    expect(cartao).toHaveTextContent('409 kcal')
  })

  it('CA-870: a receita mudada na biblioteca não muda o plano, que mostra a cópia', () => {
    guardarReceitas([{ ...NA_BIBLIOTECA, nome: 'Panqueca nova', porcoes: 4 }])
    montarPlano(comPanquecaNoDesjejum())
    const desjejum = within(screen.getByRole('tabpanel', { name: 'Principal de Desjejum' }))
    expect(desjejum.getByText('Panqueca de banana')).toBeInTheDocument()
    expect(desjejum.getByText('Receita · 1 unidade')).toBeInTheDocument()
  })

  it('CB-273: cópia estragada aparece como "Receita sem dados", com travessão nas kcal, sem quebrar', () => {
    const plano = criarPlanoPadrao(ids)
    const estragado = { id: 'x', alimentoId: ID_DE_RECEITA, gramas: 100, receita: { nome: 'X' } } as unknown as Plano['refeicoes'][number]['opcoes']['principal'][number]
    montarPlano({ refeicoes: plano.refeicoes.map((r) => (r.nome === 'Desjejum' ? { ...r, opcoes: { ...r.opcoes, principal: [estragado] } } : r)) })
    const desjejum = within(screen.getByRole('tabpanel', { name: 'Principal de Desjejum' }))
    expect(desjejum.getByText('Receita sem dados')).toBeInTheDocument()
    expect(desjejum.getByText('— kcal')).toBeInTheDocument()
  })
})
