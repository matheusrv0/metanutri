// A vista Histórico (spec antropometria-telas, D-1425 a D-1428, D-1480 a D-1488; T16).
import { fireEvent, screen, within } from '@testing-library/react'
import type { Caso } from '@/domain/tipos.ts'
import { AGORA, montarComDados, moldura, planoDe, RENATA } from './apoioDosTestes.test-utils.tsx'
import { casoDe } from './apoioDaVista.test-utils.tsx'
import { TelaAntropometria } from './TelaAntropometria.tsx'

type Dobras7 = readonly [tri: number, sub: number, peit: number, axil: number, supraAnt: number, abd: number, coxa: number]

interface Medidas {
  readonly id: string
  readonly data: string
  readonly peso: number | null
  readonly dobras: Dobras7
  readonly cintura: number
  readonly quadril: number
  readonly braco: number
}

/** As quatro avaliações do protótipo (paciente inventada, 34 anos, 164,0 cm): somas de 182,0, 171,5, 162,0 e 158,0 mm. */
const PROTOTIPO: readonly Medidas[] = [
  {
    id: 'mai',
    data: '2026-05-12',
    peso: 75.8,
    dobras: [27, 23.5, 14, 18.5, 25, 35, 39],
    cintura: 89.5,
    quadril: 107.0,
    braco: 32.0,
  },
  {
    id: 'jul',
    data: '2026-07-07',
    peso: 74.1,
    dobras: [26, 22.5, 13.5, 17.5, 23, 32.5, 36.5],
    cintura: 87.0,
    quadril: 105.8,
    braco: 31.6,
  },
  {
    id: 'set',
    data: '2026-09-08',
    peso: 72.6,
    dobras: [24.5, 21, 12.5, 16.5, 21.5, 30.5, 35.5],
    cintura: 85.2,
    quadril: 104.6,
    braco: 31.2,
  },
  {
    id: 'nov',
    data: '2026-11-03',
    peso: 71.5,
    dobras: [24, 20.5, 12, 16, 21, 30, 34.5],
    cintura: 84.0,
    quadril: 104.0,
    braco: 31.0,
  },
]

function planoDoPrototipo(m: Medidas, mais: Partial<Caso> = {}) {
  const [tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa] = m.dobras
  return planoDe(m.id, {
    ...casoDe({
      pacienteId: 'renata',
      dataConsulta: m.data,
      pesoKg: m.peso,
      estaturaCm: 164.0,
      circunferenciaCinturaCm: m.cintura,
      medidasCorporais: {
        pontoDaCintura: 'ponto-medio',
        quadrilCm: m.quadril,
        bracoRelaxadoDireitoCm: m.braco,
      },
      composicao: { protocolo: 'jackson-pollock-7' },
      dobras: {
        tricipital,
        subescapular,
        peitoral,
        axilarMedia,
        suprailiacaAnt,
        abdominal,
        coxa,
      },
    }),
    ...mais,
  })
}

function abrirHistorico(planos = PROTOTIPO.map((m) => planoDoPrototipo(m))) {
  return montarComDados({ pacientes: [RENATA], planos }, () => (
    <TelaAntropometria
      rota={{ tela: 'antropometria', casoId: 'nov', vista: 'historico' }}
      navegar={() => undefined}
      moldura={moldura}
      aoNovaAvaliacao={() => undefined}
      agora={AGORA}
    />
  ))
}

const tabela = () => screen.getByRole('table', { name: 'Avaliações' })

/** A linha da tabela pelo nome da medida: as células, na ordem. */
function linha(nome: string): string[] {
  const cabeca = within(tabela()).getByRole('rowheader', {
    name: new RegExp(`^${nome}(?!/)`),
  })
  const row = cabeca.closest('tr')
  if (!(row instanceof HTMLElement)) throw new Error(`sem a linha ${nome}`)
  return within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent ?? '')
}

describe('a vista Histórico (T16)', () => {
  it('CA-2449: o resumo na barra, os dois gráficos com o último valor e a tabela com as 4 datas e as duas colunas "Desde"', () => {
    abrirHistorico()
    expect(screen.getByText('4 avaliações · de 12/05/2026 a 03/11/2026')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Avaliação' })).not.toBeInTheDocument()
    const peso = screen.getByRole('group', { name: 'Peso, kg' })
    expect(within(peso).getAllByRole('button')).toHaveLength(4)
    expect(within(peso).getByText('71,5 kg')).toBeInTheDocument()
    const gordura = screen.getByRole('group', { name: /^Gordura corporal/ })
    expect(within(gordura).getAllByRole('button')).toHaveLength(4)
    const cabecas = within(tabela())
      .getAllByRole('columnheader')
      .map((c) => c.textContent)
    expect(cabecas).toEqual([
      'Medida',
      '12/05/2026primeira',
      '07/07/2026',
      '08/09/2026',
      '03/11/2026atual',
      'Desde 08/09última consulta',
      'Desde 12/05primeira consulta',
    ])
  })

  it('CA-2450: a soma das 7 dobras, −4,0 dentro do erro desde 08/09 e −24,0 mudança real desde 12/05', () => {
    abrirHistorico()
    expect(linha('Soma das 7 dobras')).toEqual(['182,0', '171,5', '162,0', '158,0', '−4,0dentro do erro', '−24,0mudança real'])
  })

  it('CA-2451: a cintura no mesmo ponto, −1,2 dentro do erro; com pontos diferentes, "ponto diferente" sem número', () => {
    abrirHistorico()
    expect(linha('Cintura')).toEqual(['89,5', '87,0', '85,2', '84,0', '−1,2dentro do erro', '−5,5mudança real'])
  })

  it('CA-2451: pontos de cintura diferentes nas duas comparadas', () => {
    const planos = PROTOTIPO.map((m) => planoDoPrototipo(m))
    const ultima = planos[3]
    if (!ultima) throw new Error('sem a última')
    planos[3] = {
      ...ultima,
      caso: {
        ...ultima.caso,
        medidasCorporais: {
          ...ultima.caso.medidasCorporais,
          pontoDaCintura: 'crista-iliaca',
        },
      },
    }
    abrirHistorico(planos)
    expect(linha('Cintura').slice(4)).toEqual(['—ponto diferente', '—ponto diferente'])
  })

  it('CA-2452: as notas: "balança", "calculado" e "veja a soma"', () => {
    abrirHistorico()
    expect(linha('Peso').slice(4)).toEqual(['−1,1balança', '−4,3balança'])
    expect(linha('IMC').at(-1)).toMatch(/calculado$/)
    expect(linha('Cintura/quadril').at(-1)).toMatch(/calculado$/)
    expect(linha('Gordura corporal').at(-1)).toMatch(/veja a soma$/)
  })

  it('CA-2453: avaliação sem peso: "—" na tabela, sem ponto no gráfico e "—" na variação que depende dela', () => {
    const planos = PROTOTIPO.map((m) => planoDoPrototipo(m.id === 'set' ? { ...m, peso: null } : m))
    abrirHistorico(planos)
    expect(linha('Peso')).toEqual(['75,8', '74,1', '—', '71,5', '—', '−4,3balança'])
    expect(within(screen.getByRole('group', { name: 'Peso, kg' })).getAllByRole('button')).toHaveLength(3)
  })

  it('CA-2454: o painel da mudança mínima detectável, com as marcas e a nota da ISAK', () => {
    abrirHistorico()
    const painel = within(screen.getByRole('region', { name: 'Mudança mínima detectável' }))
    expect(painel.getByText('Soma das 7 dobras')).toBeInTheDocument()
    expect(painel.getByText('Cintura')).toBeInTheDocument()
    expect(painel.getByText('Quadril')).toBeInTheDocument()
    expect(painel.getByText('Mesmo protocolo: Jackson & Pollock, 7 dobras')).toBeInTheDocument()
    expect(painel.getByText('Mesmo ponto de cintura: ponto médio (OMS)')).toBeInTheDocument()
    expect(
      painel.getByText('MMD = 2,77 × ETM (Weir 2005). Sem ETM próprio, o app usa os limites da ISAK nível 1: 7,5% nas dobras e 1,5% nas outras medidas.'),
    ).toBeInTheDocument()
    expect(painel.getByText(/erro técnico de medida \(ETM\)/)).toBeInTheDocument()
  })

  it('CA-2449: a leitura em frase embaixo dos gráficos', () => {
    abrirHistorico()
    expect(screen.getByText(/^Desde 12\/05, a soma das dobras caiu 24,0 mm e a cintura caiu 5,5 cm: mudança real\./)).toBeInTheDocument()
  })

  it('CA-2455 e CB-1412: com 1 avaliação, "O histórico começa na segunda avaliação.", sem gráfico, com a tabela', () => {
    const uma = PROTOTIPO.at(-1)
    if (!uma) throw new Error('sem a avaliação')
    abrirHistorico([planoDoPrototipo(uma)])
    expect(screen.getByText('O histórico começa na segunda avaliação.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Peso, kg' })).not.toBeInTheDocument()
    expect(linha('Peso')).toEqual(['71,5'])
  })

  it('CA-2456: o foco numa data mostra a dica com a variação desde a anterior', () => {
    abrirHistorico()
    const botoes = within(screen.getByRole('group', { name: 'Peso, kg' })).getAllByRole('button')
    expect(botoes[2]).toHaveAccessibleName('08/09/2026 · 72,6 kg · −1,5 kg desde 07/07')
    fireEvent.focus(botoes[2] as HTMLElement)
    expect(screen.getByText('−1,5 kg desde 07/07')).toBeInTheDocument()
  })

  it('CB-1451: nenhuma data AAAA-MM-DD na tela', () => {
    abrirHistorico()
    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('a concordância das avaliações no cabeçalho da tabela', () => {
    abrirHistorico()
    expect(screen.getByText('Mesmo protocolo e mesmo ponto de cintura nas quatro')).toBeInTheDocument()
  })
})
