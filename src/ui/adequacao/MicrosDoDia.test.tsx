import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { sugerirParaCobrir } from '@/domain/cobrir.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import {
  gavetaDeVerdade,
  gavetaSugere,
  IOGURTE_DESNATADO,
  sugestaoQueLevaAMeta,
  sugestaoQueNaoLevaAMeta,
} from './cobrirControlado.test-utils.ts'
import { MicrosDoDia } from './MicrosDoDia.tsx'

// O cálculo de verdade, salvo nos testes que dão à gaveta uma sugestão controlada.
vi.mock('@/domain/cobrir.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/domain/cobrir.ts')>()
  return { ...real, sugerirParaCobrir: vi.fn(real.sugerirParaCobrir) }
})

afterEach(gavetaDeVerdade)

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
const OLEO_DE_GIRASSOL = 269
const QUEIJO_PRATO = 467
const SALMAO_GRELHADO = 317
const TODOS_NA_META = `Todos os ${MICRONUTRIENTES_ADEQUACAO.length} na meta.`

function Anfitriao({
  inicial,
  planoInicial,
  aoVerTodos,
  restricoes,
}: {
  readonly inicial: Partial<Caso>
  readonly planoInicial: Plano
  readonly aoVerTodos: () => void
  readonly restricoes?: readonly string[]
}) {
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
      {...(restricoes ? { restricoes } : {})}
    />
  )
}

const montar = (inicial: Partial<Caso> = adulta, planoInicial: Plano = planoCom([ARROZ, 200]), restricoes?: readonly string[]) => {
  const aoVerTodos = vi.fn()
  const { unmount } = render(<Anfitriao inicial={inicial} planoInicial={planoInicial} aoVerTodos={aoVerTodos} {...(restricoes ? { restricoes } : {})} />)
  return { usuario: userEvent.setup(), aoVerTodos, desmontar: unmount }
}

const cartao = () => within(screen.getByRole('region', { name: 'Micronutrientes' }))
const linhas = () => within(cartao().getByRole('list', { name: 'Fora da meta' })).getAllByRole('listitem')
const pctDe = (linha: HTMLElement) => Number((linha.textContent ?? '').match(/(\d+)%/)?.[1])

describe('Cartão Micronutrientes da etapa 2 (spec painel-lateral-enxuto)', () => {
  it('CA-685 e CB-203: conta os abaixo da meta e mostra os 5 mais longe, cada um com Cobrir', () => {
    montar()
    expect(cartao().getByText(/^\d+ para cobrir\.$/)).toBeInTheDocument()
    const total = Number(cartao().getByText(/para cobrir\./).textContent?.split(' ')[0])
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
    await usuario.click(within(sugestao).getByRole('button', { name: /^Adicionar em / }))

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
    expect(cartao().getByText(TODOS_NA_META)).toBeInTheDocument()
    expect(TODOS_NA_META).toBe('Todos os 21 na meta.')
    expect(cartao().queryByRole('list')).not.toBeInTheDocument()
  })

  it('CB-209: a referência do caso vale no cartão (coletivo cobra menos)', () => {
    // "4 para cobrir.", "Nada para cobrir." ou "Todos os 21 na meta.": sem número na frente, é zero.
    const contar = () => Number(cartao().getByText(/para cobrir\.$|na meta\.$/).textContent?.match(/^(\d+)/)?.[1] ?? 0)
    const plano = criarExemplo(ids, '2026-10-15').plano
    const { desmontar } = montar(adulta, plano)
    const individual = contar()
    desmontar()
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'coletivo' } } }, plano)
    expect(contar()).toBeLessThan(individual)
  })

  it('a falta de dado aparece com a marca †, como na tabela', () => {
    montar(adulta, planoCom([ARROZ, 200]))
    const marcas = cartao().getAllByTitle(/total possivelmente subestimado/)
    expect(marcas.length).toBeGreaterThan(0)
    for (const marca of marcas) expect(marca).toHaveTextContent('†')
  })
})

describe('Cartão arredonda sem desmentir o estado (CA-696, CA-712)', () => {
  const ferroDoExemplo = (plano: Plano) => {
    const caso: Caso = { ...criarCasoVazio('c1'), ...adulta }
    const ferro = calcularAdequacao(totaisDoPlano(plano, buscarAlimento), caso, caso.adequacao.preset).linhas.find((l) => l.chave === 'ferro_mg')
    if (!ferro) throw new Error('sem ferro')
    // Só prova alguma coisa se arredondar para o mais perto e para baixo dessem números diferentes.
    expect(ferro.adequacaoPct % 1).toBeGreaterThanOrEqual(0.5)
    return ferro.adequacaoPct
  }
  const pctDoFerro = () => {
    const linha = linhas().find((l) => l.textContent?.startsWith('Ferro'))
    if (!linha) throw new Error('ferro fora do cartão')
    return within(linha)
  }

  it('CA-712: longe da meta, a adequação arredonda para o mais perto', () => {
    const plano = criarExemplo(ids, '2026-10-15').plano
    const pct = ferroDoExemplo(plano)
    expect(pct).toBeLessThan(89)
    montar(adulta, plano)
    expect(pctDoFerro().getByText(`${Math.round(pct)}%`)).toBeInTheDocument()
  })

  it('CA-696 e CA-712: com a meta logo acima, a adequação arredonda para baixo', () => {
    const plano = criarExemplo(ids, '2026-10-15').plano
    const pct = ferroDoExemplo(plano)
    // Meta no inteiro logo acima: o mais perto daria o número da meta, em cor de abaixo.
    const preset = { tipo: 'personalizado', referencia: 'rda', minimoPct: Math.ceil(pct) } as const
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset } }, plano)
    expect(pctDoFerro().getByText(`${Math.floor(pct)}%`)).toBeInTheDocument()
  })
})

describe('Sódio nunca é alvo do Cobrir (CA-697, CA-703)', () => {
  const exemplo = () => criarExemplo(ids, '2026-10-15').plano

  it('CA-697: o sódio abaixo da meta não aparece no cartão nem na contagem', () => {
    const plano = exemplo()
    const caso: Caso = { ...criarCasoVazio('c1'), ...adulta }
    const abaixo = calcularAdequacao(totaisDoPlano(plano, buscarAlimento), caso, caso.adequacao.preset).linhas.filter((l) => l.estado === 'abaixo')
    // No exemplo, o sódio está entre os abaixo da meta, e a contagem não o conta.
    expect(abaixo.map((l) => l.chave)).toContain('sodio_mg')
    montar(adulta, plano)
    expect(cartao().getByText(`${abaixo.length - 1} para cobrir.`)).toBeInTheDocument()
    expect(linhas().some((l) => l.textContent?.startsWith('Sódio'))).toBe(false)
    expect(cartao().queryByRole('button', { name: 'Cobrir Sódio' })).not.toBeInTheDocument()
  })

  it('CA-703 e CB-202: nada abaixo e o sódio acima do limite, o cartão diz "Nada para cobrir." e mostra o sódio', () => {
    const preset = { tipo: 'personalizado', referencia: 'rda', minimoPct: 1 } as const
    const base = exemplo()
    const almoco = base.refeicoes.find((r) => r.nome === 'Almoço')
    if (!almoco) throw new Error('sem almoço')
    const comSal = adicionarItem(base, almoco.id, 'principal', { alimentoId: SAL_GROSSO, gramas: 10 }, ids)
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset } }, comSal)
    expect(cartao().getByText('Nada para cobrir.')).toBeInTheDocument()
    expect(linhas()).toHaveLength(1)
    expect(linhas()[0]).toHaveTextContent(/^Sódio\d+% · acima do limite$/)
  })

  it('CA-703: a meta usada vai na descrição da lista, para leitor de tela', () => {
    montar(adulta, exemplo())
    const lista = cartao().getByRole('list', { name: 'Fora da meta' })
    expect(lista).toHaveAccessibleDescription('Adequação em % da referência; a meta é 90%.')
  })
})

describe('Legenda do † no cartão (CA-699)', () => {
  const BANANA_NANICA = 179

  it('CA-699: com alguma linha marcada, o pé do cartão explica o †, à vista', () => {
    montar(adulta, criarExemplo(ids, '2026-10-15').plano)
    expect(cartao().getAllByTitle(/total possivelmente subestimado/).length).toBeGreaterThan(0)
    expect(cartao().getByText('Total possivelmente subestimado: falta o dado em algum alimento.')).toBeInTheDocument()
  })

  it('CA-699: sem linha marcada, não há pé', () => {
    // A banana-nanica tem as 21 linhas da adequação na base (as cinco do USDA também): nenhuma linha leva †.
    montar(adulta, planoCom([BANANA_NANICA, 200]))
    expect(linhas().length).toBeGreaterThan(0)
    expect(cartao().queryAllByTitle(/total possivelmente subestimado/)).toHaveLength(0)
    expect(cartao().queryByText(/Total possivelmente subestimado/)).not.toBeInTheDocument()
  })
})

describe('Testes mais firmes do cartão (revisão de 15/10)', () => {
  it('CB-204: o nutriente que chega à meta depois do Cobrir sai do cartão', async () => {
    const plano = criarExemplo(ids, '2026-10-15').plano
    const caso: Caso = { ...criarCasoVazio('c1'), ...adulta }
    await gavetaSugere(sugestaoQueLevaAMeta(plano, caso, 'calcio_mg', IOGURTE_DESNATADO, ids))
    const { usuario } = montar(adulta, plano)
    const antes = Number(cartao().getByText(/para cobrir\.$/).textContent?.match(/^(\d+)/)?.[1])
    const calcio = linhas().find((l) => l.textContent?.startsWith('Cálcio'))
    if (!calcio) throw new Error('cálcio fora do cartão')
    await usuario.click(within(calcio).getByRole('button', { name: 'Cobrir Cálcio' }))

    const gaveta = within(screen.getByRole('dialog'))
    const sugestao = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getByRole('listitem')
    expect(sugestao).toHaveTextContent('Iogurte, natural, desnatado')
    await usuario.click(within(sugestao).getByRole('button', { name: /^Adicionar em / }))

    expect(linhas().some((l) => l.textContent?.startsWith('Cálcio'))).toBe(false)
    expect(cartao().getByText(`${antes - 1} para cobrir.`)).toBeInTheDocument()
  })
})

describe('Foco depois do Cobrir (D-212, CA-713, CB-211)', () => {
  const exemplo = () => criarExemplo(ids, '2026-10-15').plano
  const casoDe = (inicial: Partial<Caso>): Caso => ({ ...criarCasoVazio('c1'), ...inicial })
  const cobrirDoCartao = () => cartao().getAllByRole('button', { name: /^Cobrir / }).map((b) => b.getAttribute('aria-label') ?? '')
  const titulo = () => cartao().getByRole('heading', { name: 'Micronutrientes' })
  /** Os que se cobrem, na ordem do cartão: do mais longe para o mais perto da meta. */
  const abaixoDaMetaEmOrdem = (plano: Plano, caso: Caso) =>
    calcularAdequacao(totaisDoPlano(plano, buscarAlimento), caso, caso.adequacao.preset)
      .linhas.filter((l) => l.estado === 'abaixo' && l.chave !== 'sodio_mg')
      .sort((a, b) => a.adequacaoPct - b.adequacaoPct)

  /** Abre o Cobrir do nutriente no cartão e clica em "Adicionar" na sugestão (única) da gaveta. */
  const cobrirEAdicionar = async (usuario: ReturnType<typeof userEvent.setup>, rotulo: string) => {
    await usuario.click(cartao().getByRole('button', { name: `Cobrir ${rotulo}` }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Adicionar em / }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }

  it('CA-713: o nutriente chega à meta e sai do cartão; o foco vai para o Cobrir do próximo', async () => {
    const plano = exemplo()
    // Controlada: o óleo leva só a vitamina E à meta (o Cobrir nunca sugere óleo; aqui a gaveta é de teste).
    await gavetaSugere(sugestaoQueLevaAMeta(plano, casoDe(adulta), 'vitamina_e_mg', OLEO_DE_GIRASSOL, ids))
    const { usuario } = montar(adulta, plano)
    const ordem = cobrirDoCartao()
    const proximo = ordem[ordem.indexOf('Cobrir Vitamina E') + 1]
    if (!proximo) throw new Error('a vitamina E é a última do cartão')

    await cobrirEAdicionar(usuario, 'Vitamina E')
    expect(cartao().queryByRole('button', { name: 'Cobrir Vitamina E' })).not.toBeInTheDocument()
    await waitFor(() => expect(cartao().getByRole('button', { name: proximo })).toHaveFocus())
  })

  it('CA-713: sem próximo, o foco vai para o título do cartão', async () => {
    // Com a meta em 80%, os que se cobrem no exemplo cabem nos 5 do cartão, e o último deles fica sem próximo.
    const inicial: Partial<Caso> = { ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'personalizado', referencia: 'rda', minimoPct: 80 } } }
    const plano = exemplo()
    const ordem = abaixoDaMetaEmOrdem(plano, casoDe(inicial))
    const ultimo = ordem.at(-1)
    if (!ultimo) throw new Error('fixture: nada para cobrir')
    expect(ordem.length).toBeLessThanOrEqual(5)
    expect(ultimo.chave).toBe('calcio_mg')
    await gavetaSugere(sugestaoQueLevaAMeta(plano, casoDe(inicial), 'calcio_mg', IOGURTE_DESNATADO, ids))
    const { usuario } = montar(inicial, plano)
    expect(cobrirDoCartao().at(-1)).toBe('Cobrir Cálcio')

    await cobrirEAdicionar(usuario, 'Cálcio')
    expect(cartao().getAllByRole('button', { name: /^Cobrir / }).length).toBeGreaterThan(0)
    await waitFor(() => expect(titulo()).toHaveFocus())
  })

  it('CA-713: o nutriente continua abaixo da meta, e o foco volta ao Cobrir dele', async () => {
    const plano = exemplo()
    await gavetaSugere(sugestaoQueNaoLevaAMeta(plano, casoDe(adulta), 'calcio_mg', IOGURTE_DESNATADO, 50, ids))
    const { usuario } = montar(adulta, plano)

    await cobrirEAdicionar(usuario, 'Cálcio')
    await waitFor(() => expect(cartao().getByRole('button', { name: 'Cobrir Cálcio' })).toHaveFocus())
  })

  it('CA-713: fechar a gaveta sem adicionar devolve o foco ao Cobrir', async () => {
    const { usuario } = montar(adulta, exemplo())
    await usuario.click(cartao().getByRole('button', { name: 'Cobrir Cálcio' }))
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(cartao().getByRole('button', { name: 'Cobrir Cálcio' })).toHaveFocus())
  })

  it('CA-713: com mais de 5 para cobrir, o 6º que entra à vista recebe o foco quando o 5º chega à meta', async () => {
    // Com a meta em 140%, no exemplo ficam mais de 5 abaixo (fora o sódio): o cartão mostra 5, e o 5º é o cálcio.
    const inicial: Partial<Caso> = { ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'personalizado', referencia: 'rda', minimoPct: 140 } } }
    const plano = exemplo()
    const caso = casoDe(inicial)
    const ordem = abaixoDaMetaEmOrdem(plano, caso)
    const [quinto, sexto] = [ordem[4], ordem[5]]
    if (!quinto || !sexto) throw new Error('fixture: menos de 6 para cobrir')
    expect(quinto.chave).toBe('calcio_mg')
    // O queijo prato leva só o cálcio a 140%.
    await gavetaSugere(sugestaoQueLevaAMeta(plano, caso, 'calcio_mg', QUEIJO_PRATO, ids))
    const { usuario } = montar(inicial, plano)
    expect(cobrirDoCartao()).toHaveLength(5)
    expect(cobrirDoCartao()).not.toContain(`Cobrir ${sexto.rotulo}`)

    await cobrirEAdicionar(usuario, quinto.rotulo)
    expect(cobrirDoCartao()).toContain(`Cobrir ${sexto.rotulo}`)
    await waitFor(() => expect(cartao().getByRole('button', { name: `Cobrir ${sexto.rotulo}` })).toHaveFocus())
  })

  it('CB-211: o único do cartão chega à meta; o cartão diz "Nada para cobrir." e o foco vai para o título', async () => {
    // Com a meta em 30%, no exemplo só a vitamina D fica abaixo (fora o sódio).
    const inicial: Partial<Caso> = { ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'personalizado', referencia: 'rda', minimoPct: 30 } } }
    const plano = exemplo()
    await gavetaSugere(sugestaoQueLevaAMeta(plano, casoDe(inicial), 'vitamina_d_mcg', SALMAO_GRELHADO, ids))
    const { usuario } = montar(inicial, plano)
    expect(cobrirDoCartao()).toEqual(['Cobrir Vitamina D'])

    await cobrirEAdicionar(usuario, 'Vitamina D')
    expect(cartao().getByText(/^(Nada para cobrir|Todos os \d+ na meta)\.$/)).toBeInTheDocument()
    await waitFor(() => expect(titulo()).toHaveFocus())
  })
})

describe('Restrições do paciente no Cobrir do cartão (sugestoes-com-criterio, CA-675)', () => {
  const nomesSugeridos = () =>
    within(within(screen.getByRole('dialog')).getByRole('list', { name: 'Sugestões para cobrir' }))
      .getAllByRole('listitem')
      .map((li) => li.querySelector('p')?.textContent ?? '')

  it('o cartão leva as restrições do paciente ao cálculo das sugestões, que tira o alimento restrito', async () => {
    const plano = criarExemplo(ids, '2026-10-15').plano
    // Sem restrição: a primeira sugestão de verdade do ferro.
    const sem = montar(adulta, plano)
    await sem.usuario.click(cartao().getByRole('button', { name: 'Cobrir Ferro' }))
    const [primeira] = nomesSugeridos()
    if (!primeira) throw new Error('sem sugestão para o ferro')
    sem.desmontar()

    // Com a primeira restrita pelo nome, ela some, e a restrição chega inteira ao domínio.
    const termo = primeira.split(',')[0]?.trim().toLowerCase() ?? ''
    const com = montar(adulta, plano, [termo])
    await com.usuario.click(cartao().getByRole('button', { name: 'Cobrir Ferro' }))
    expect(vi.mocked(sugerirParaCobrir)).toHaveBeenLastCalledWith('ferro_mg', expect.anything(), expect.anything(), expect.objectContaining({ restricoes: { grupos: [], textos: [termo], naoGosta: [] } }))
    expect(nomesSugeridos()).not.toContain(primeira)
  })
})

describe('As cinco do USDA no cartão (spec vitaminas-usda, CA-958)', () => {
  it('entram no cartão como as outras, com † quando falta o dado', () => {
    // 533 Cuscuz: sem equivalente no USDA, as cinco ficam em 0%, sem dado.
    montar(adulta, planoCom([533, 200]))
    const novas = linhas().filter((l) => /^(Selênio|Vitamina D|Vitamina E|Folato \(DFE\)|Vitamina B12)/.test(l.textContent ?? ''))
    expect(novas.length).toBeGreaterThan(0)
    for (const linha of novas) expect(within(linha).getByTitle(/total possivelmente subestimado/)).toHaveTextContent('†')
  })
})
