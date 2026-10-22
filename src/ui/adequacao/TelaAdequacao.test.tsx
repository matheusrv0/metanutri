import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { produtoComoAlimento } from '@/domain/produtos.ts'
import { buscarAlimento, registrarProdutos } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { gavetaDeVerdade, gavetaSugere, IOGURTE_DESNATADO, sugestaoQueLevaAMeta } from './cobrirControlado.test-utils.ts'
import { TelaAdequacao } from './TelaAdequacao.tsx'

// O cálculo de verdade, salvo nos testes que dão à gaveta uma sugestão controlada.
vi.mock('@/domain/cobrir.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/domain/cobrir.ts')>()
  return { ...real, sugerirParaCobrir: vi.fn(real.sugerirParaCobrir) }
})

afterEach(gavetaDeVerdade)

let n = 0
const ids = () => `id${++n}`

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }

function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 200 }, ids)
}

function Anfitriao({
  inicial,
  planoInicial,
  restricoes = [],
  gasto = 1800,
}: {
  readonly inicial?: Partial<Caso>
  readonly planoInicial?: Plano
  readonly restricoes?: readonly string[]
  readonly gasto?: number | null
}) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  const [plano, setPlano] = useState<Plano>(planoInicial ?? criarPlanoPadrao(ids))
  return (
    <TelaAdequacao
      caso={caso}
      plano={plano}
      gastoEnergetico={gasto}
      restricoes={restricoes}
      aoAlterarCaso={(m) => setCaso((c) => ({ ...c, ...m }))}
      aoAlterarPlano={setPlano}
      gerarId={ids}
      aoAbrirFontes={() => undefined}
    />
  )
}

const montar = (inicial: Partial<Caso> = adulta, planoInicial?: Plano) => {
  render(<Anfitriao inicial={inicial} {...(planoInicial ? { planoInicial } : {})} />)
  return userEvent.setup()
}

const linhaDe = (nutriente: string) => {
  const celula = screen.getByText(nutriente)
  const linha = celula.closest('tr')
  if (!linha) throw new Error(`linha de ${nutriente} não encontrada`)
  return within(linha)
}

const primeiraSugestao = (gaveta: ReturnType<typeof within>) => {
  const item = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')[0]
  if (!item) throw new Error('sem sugestões')
  return item
}

const abrirCobrir = async (usuario: ReturnType<typeof userEvent.setup>, nutriente: string) => {
  await usuario.click(linhaDe(nutriente).getByRole('button', { name: `Cobrir ${nutriente}` }))
  return within(screen.getByRole('dialog'))
}

describe('Etapa 3: adequação', () => {
  it('a gaveta do Cobrir tem margem interna e o título não fica embaixo do fechar', async () => {
    montar(adulta, planoComArroz())
    await abrirCobrir(userEvent.setup(), 'Cálcio')
    const gaveta = screen.getByRole('dialog')
    expect(gaveta.className).toContain('p-6')
    expect(within(gaveta).getByRole('heading', { name: 'Cobrir Cálcio' }).className).toContain('pr-10')
  })

  it('CA-25 e CA-33: lista os micronutrientes com total, referência, adequação, estado e fontes', () => {
    montar(adulta, planoComArroz())
    expect(screen.getByRole('columnheader', { name: 'Nutriente' })).toBeInTheDocument()
    const ferro = linhaDe('Ferro')
    expect(ferro.getAllByText(/mg$/).length).toBeGreaterThan(0)
    expect(ferro.getByText(/^\d+% da referência( · abaixo da meta| · acima do limite)?$/)).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Estado' })).not.toBeInTheDocument()
    expect(screen.getByText(/^Composição: Base MetaNutri/)).toBeInTheDocument()
    expect(screen.queryByText(/TACO/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fontes da base' }).className).toContain('min-h-11')
    expect(screen.getByText(/^Referências de ingestão: /)).toBeInTheDocument()
  })

  it('CA-26 e CA-27: preset individual usa RDA e coletivo usa EAR', async () => {
    const usuario = montar(adulta, planoComArroz())
    expect(linhaDe('Ferro').getByText('rda')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Individual (RDA, 90%)' })).toHaveAttribute('aria-checked', 'true')

    await usuario.click(screen.getByRole('radio', { name: 'Coletivo (EAR, 50%)' }))
    expect(linhaDe('Ferro').getByText('ear')).toBeInTheDocument()
    expect(screen.getByText(/meta de 50% da referência/)).toBeInTheDocument()
  })

  it('CA-28: preset personalizado aceita referência e mínimo próprios', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    await usuario.click(screen.getByRole('radio', { name: 'EAR' }))
    const minimo = screen.getByLabelText('Mínimo da meta')
    await usuario.clear(minimo)
    await usuario.type(minimo, '70')
    expect(screen.getByText(/meta de 70% da referência/)).toBeInTheDocument()
  })

  it('CA-29: nutriente sem RDA nem EAR mostra referência AI', () => {
    montar(adulta, planoComArroz())
    expect(screen.getAllByText('ai').length).toBeGreaterThan(0)
  })

  it('CA-32: nutriente com alimentos sem dado avisa que o total é subestimado', () => {
    montar(adulta, planoComArroz())
    const marcas = screen.getAllByTitle(/total possivelmente subestimado/)
    expect(marcas.length).toBeGreaterThan(0)
    expect(marcas[0]).toHaveTextContent("†")
    expect(screen.getByText(/dado que falta não conta como zero/i)).toBeInTheDocument()
  })

  it('CB-05: plano vazio mostra 0% e o cobrir continua funcionando', async () => {
    const usuario = montar()
    expect(linhaDe('Ferro').getByText('0% da referência · abaixo da meta')).toBeInTheDocument()
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    expect(gaveta.getByText(/^O plano tem 0% da referência\. Faltam .* mg para a meta/)).toBeInTheDocument()
  })

  it('CA-791 (spec revisao-geral-trabalho): a falta com a precisão da tabela, sem duas casas', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Cálcio')
    expect(gaveta.getByText(/^O plano tem \d+% da referência\. Faltam \d[\d.]* mg para a meta\./)).toBeInTheDocument()
  })

  it('CA-34 a CA-36: sugestões trazem porção, cobertura e kcal', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    const sugestoes = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    expect(sugestoes.length).toBeGreaterThan(0)
    expect(sugestoes.length).toBeLessThanOrEqual(5)
    expect(sugestoes[0]?.textContent).toMatch(/cobre \d+% da falta/)
    expect(sugestoes[0]?.textContent).toMatch(/kcal/)
  })

  it('CA-38: escolher a refeição e confirmar adiciona o alimento e recalcula', async () => {
    const usuario = montar(adulta, planoComArroz())
    const antes = linhaDe('Ferro').getByText(/^\d+% da referência( · abaixo da meta| · acima do limite)?$/).textContent
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    await usuario.selectOptions(gaveta.getByLabelText('Adicionar em'), gaveta.getByRole('option', { name: /Jantar/ }))
    await usuario.click(within(primeiraSugestao(gaveta)).getByRole('button', { name: 'Adicionar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(linhaDe('Ferro').getByText(/^\d+% da referência( · abaixo da meta| · acima do limite)?$/).textContent).not.toBe(antes)
  })

  it('sugestão escondida não volta a aparecer, em nenhum plano', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    const lista = () => within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    const primeiro = lista()[0]?.textContent ?? ''

    await usuario.click(within(primeiraSugestao(gaveta)).getByRole('button', { name: /^Nunca sugerir/ }))
    expect(lista()[0]?.textContent).not.toBe(primeiro)
  })

  it('CA-675: a restrição do paciente não tira vaga das 5 sugestões', async () => {
    // Primeiro, sem restrição: o nome-base da primeira sugestão vira a restrição do paciente.
    const sem = render(<Anfitriao inicial={adulta} planoInicial={planoComArroz()} />)
    const primeira = primeiraSugestao(await abrirCobrir(userEvent.setup(), 'Ferro')).querySelector('p')?.textContent ?? ''
    const termo = (primeira.split(',')[0] ?? '').trim().toLowerCase()
    expect(termo.length).toBeGreaterThanOrEqual(3)
    sem.unmount()

    render(<Anfitriao inicial={adulta} planoInicial={planoComArroz()} restricoes={[termo]} />)
    const gaveta = await abrirCobrir(userEvent.setup(), 'Ferro')
    const sugestoes = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    expect(sugestoes).toHaveLength(5)
    for (const s of sugestoes) expect(s.textContent?.toLowerCase()).not.toContain(termo)
  })

  it('CA-36a: incluir ingredientes muda a lista de sugestões', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    const antes = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)

    await usuario.click(gaveta.getByRole('switch', { name: 'Incluir ingredientes e alimentos crus' }))
    const depois = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(depois).not.toEqual(antes)
  })

  it('CA-337: a referência fica no topo da tabela e a meta aparece uma vez, no subtítulo', () => {
    montar(adulta, planoComArroz())
    const cartao = screen.getByRole('table').closest('[data-slot="card"]') as HTMLElement
    expect(within(cartao).getByRole('radiogroup', { name: 'Tipo de referência' })).toBeInTheDocument()
    expect(within(cartao).getByText('mulheres de 19 a 30 anos · meta de 90% da referência')).toBeInTheDocument()
    expect(screen.queryByText(/\(meta \d+%\)/)).not.toBeInTheDocument()
    expect(screen.queryByText('Referência da adequação')).not.toBeInTheDocument()
  })

  it('CA-338 e CA-339: colunas novas, referência como publicada e o tipo ao lado', () => {
    montar(adulta, planoComArroz())
    const cabecalhos = screen.getAllByRole('columnheader').map((c) => c.textContent)
    expect(cabecalhos).toEqual(['Nutriente', 'No plano', 'Referência', 'Adequação', 'Ações'])
    expect(linhaDe('Ferro').getByText('18 mg')).toBeInTheDocument()
    expect(linhaDe('Cálcio').getByText('1.000 mg')).toBeInTheDocument()
    expect(linhaDe('Ferro').getAllByText(/^\d+(,\d)? mg$|^< 0,1 mg$/)).toHaveLength(2)
  })

  it('CB-75: em Personalizado, os campos aparecem logo abaixo do seletor', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const seletor = screen.getByRole('radiogroup', { name: 'Tipo de referência' })
    const minimo = screen.getByLabelText('Mínimo da meta')
    expect(seletor.compareDocumentPosition(minimo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(minimo.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

/** O dia do plano de exemplo: alguns abaixo da meta e o resto na meta. */
const exemplo = () => criarExemplo(ids, '2026-10-15').plano

const TOTAL_DE_LINHAS = MICRONUTRIENTES_ADEQUACAO.length

/** Linhas de dado que o leitor de tela enxerga (fora do grupo recolhido). */
const linhasVisiveis = () =>
  screen
    .getAllByRole('row')
    .filter((r) => within(r).queryAllByRole('cell').length === 5)
    .map((r) => r.textContent ?? '')

describe('Etapa 3 abre no que pede ação (spec painel-lateral-enxuto)', () => {
  it('CA-690: à vista só abaixo da meta e acima do limite; os na meta abrem num botão', async () => {
    const usuario = montar(adulta, exemplo())
    const visiveis = linhasVisiveis()
    expect(visiveis.length).toBeGreaterThan(0)
    for (const texto of visiveis) expect(texto).toMatch(/abaixo|acima do limite/)

    const botao = screen.getByRole('button', { name: /^Ver os \d+ nutrientes na meta$/ })
    const n = Number(botao.textContent?.match(/\d+/)?.[0])
    expect(visiveis.length + n).toBe(TOTAL_DE_LINHAS)
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(botao.getAttribute('aria-controls') ?? '')).toHaveAttribute('hidden')

    await usuario.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao).toHaveTextContent(`Esconder os ${n} nutrientes na meta`)
    expect(linhasVisiveis()).toHaveLength(TOTAL_DE_LINHAS)
    // A ordem de sempre dentro de cada grupo: Cálcio vem antes de Ferro.
    const ordem = linhasVisiveis()
    expect(ordem.findIndex((t) => t.startsWith('Cálcio'))).toBeLessThan(ordem.findIndex((t) => t.startsWith('Ferro')))
  })

  it('CA-691: Cobrir com fundo teal claro, só em linha abaixo da meta', async () => {
    const usuario = montar(adulta, exemplo())
    await usuario.click(screen.getByRole('button', { name: /^Ver os \d+ nutrientes na meta$/ }))
    const cobrir = screen.getAllByRole('button', { name: /^Cobrir / })
    expect(cobrir.length).toBe(linhasVisiveis().filter((t) => t.includes('abaixo') && !t.startsWith('Sódio')).length)
    for (const b of cobrir) expect(b.className).toContain('bg-lightprimary')
  })

  it('CA-693: notas em uma frase cada, sem repetir o seletor', () => {
    montar(adulta, exemplo())
    expect(screen.getByText('Pode estar subestimado: algum alimento não tem esse dado, e dado que falta não conta como zero.')).toBeInTheDocument()
    expect(screen.getByText('O limite superior da tabela não vale para a forma do nutriente presente nos alimentos.')).toBeInTheDocument()
    expect(screen.getByText('AI: usada quando o nutriente não tem RDA nem EAR.')).toBeInTheDocument()
    expect(screen.queryByText(/RDA no preset individual/)).not.toBeInTheDocument()
    expect(screen.queryByText(/passar o cursor/)).not.toBeInTheDocument()
  })

  it('CB-202: nada abaixo da meta, a tabela diz isso e oferece todas as linhas', () => {
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'personalizado', referencia: 'ear', minimoPct: 1 } } }, exemplo())
    expect(screen.getByText('Nenhum nutriente abaixo da meta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Ver os ${TOTAL_DE_LINHAS} nutrientes na meta` })).toBeInTheDocument()
    expect(TOTAL_DE_LINHAS).toBe(21)
  })

  it('CB-204: o nutriente que chega à meta passa para o grupo aberto, que continua aberto', async () => {
    // Sugestão controlada: a porção de iogurte que leva só o cálcio à meta (não depende do que o Cobrir sugere hoje).
    const plano = exemplo()
    await gavetaSugere(sugestaoQueLevaAMeta(plano, { ...criarCasoVazio('c1'), ...adulta }, 'calcio_mg', IOGURTE_DESNATADO, ids))
    const usuario = montar(adulta, plano)
    const ver = screen.getByRole('button', { name: /^Ver os \d+ nutrientes na meta$/ })
    const antes = Number(ver.textContent?.match(/(\d+)/)?.[1])
    await usuario.click(ver)
    const gaveta = await abrirCobrir(usuario, 'Cálcio')
    await usuario.click(within(primeiraSugestao(gaveta)).getByRole('button', { name: 'Adicionar' }))

    const esconder = screen.getByRole('button', { name: `Esconder os ${antes + 1} nutrientes na meta` })
    expect(esconder).toHaveAttribute('aria-expanded', 'true')
    const grupo = document.getElementById(esconder.getAttribute('aria-controls') ?? '')
    if (!grupo) throw new Error('sem o grupo na meta')
    const calcio = within(grupo).getByText('Cálcio').closest('tr')
    if (!calcio) throw new Error('o cálcio não foi para o grupo na meta')
    expect(within(calcio).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Etapa 3 no celular (CA-692)', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta === '(max-width: 639px)',
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const itemDe = (nome: string) => {
    const item = within(screen.getByRole('list', { name: 'Fora da meta' }))
      .getAllByRole('listitem')
      .find((i) => i.textContent?.startsWith(nome))
    if (!item) throw new Error(`${nome} não está na lista`)
    return within(item)
  }

  it('CA-692: lista sem tabela, com o estado, a barra, quanto tem de quanto precisa e o Cobrir', () => {
    montar(adulta, exemplo())
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const ferro = itemDe('Ferro')
    expect(ferro.getByText(/^\d+% da referência · abaixo da meta$/)).toHaveClass('text-warningtext')
    expect(ferro.getByRole('progressbar')).toBeInTheDocument()
    expect(ferro.getByText(/^[\d.,]+ mg de 18 mg$/)).toHaveTextContent(/^[\d.,]+ mg†? de 18 mg rda$/)
    // O nome diz o nutriente: a lista do celular não tem cabeçalho de coluna (CA-700).
    const cobrir = ferro.getByRole('button', { name: 'Cobrir Ferro' })
    expect(cobrir.className).toContain('h-11')
    expect(cobrir.className).toContain('bg-lightprimary')
  })

  it('CA-692: o recolhimento vale igual, e Cobrir abre a gaveta', async () => {
    const usuario = montar(adulta, exemplo())
    const botao = screen.getByRole('button', { name: /^Ver os \d+ nutrientes na meta$/ })
    const naMeta = document.getElementById(botao.getAttribute('aria-controls') ?? '')
    expect(naMeta).toHaveAttribute('hidden')
    await usuario.click(botao)
    expect(naMeta).not.toHaveAttribute('hidden')
    expect(within(naMeta as HTMLElement).queryAllByRole('button', { name: /^Cobrir/ })).toHaveLength(0)

    await usuario.click(itemDe('Cálcio').getByRole('button', { name: 'Cobrir Cálcio' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Cobrir Cálcio' })).toBeInTheDocument()
  })
})

describe('Gaveta do Cobrir: o que passou do gasto (CA-694)', () => {
  it('CA-694: plano acima do gasto diz quanto passou, sem número negativo', async () => {
    // O dia do exemplo tem cerca de 1.675 kcal; com gasto de 1.600, passou.
    render(<Anfitriao inicial={adulta} planoInicial={exemplo()} gasto={1600} />)
    const gaveta = await abrirCobrir(userEvent.setup(), 'Ferro')
    expect(gaveta.getByText(/O plano já ultrapassa o gasto energético em \d+ kcal\./)).toBeInTheDocument()
    expect(gaveta.queryByText(/Cabem -/)).not.toBeInTheDocument()
  })

  it('CA-694: plano abaixo do gasto continua dizendo quanto cabe', async () => {
    render(<Anfitriao inicial={adulta} planoInicial={exemplo()} gasto={2000} />)
    const gaveta = await abrirCobrir(userEvent.setup(), 'Ferro')
    expect(gaveta.getByText(/Ainda cabem \d+ kcal até o gasto energético\./)).toBeInTheDocument()
  })
})

describe('Tabela e lista arredondam sem desmentir o estado (CA-696, CA-712)', () => {
  const ferroDoExemplo = (plano: Plano) => {
    const caso: Caso = { ...criarCasoVazio('c1'), ...adulta }
    const linha = calcularAdequacao(totaisDoPlano(plano, buscarAlimento), caso, caso.adequacao.preset).linhas.find((l) => l.chave === 'ferro_mg')
    if (!linha) throw new Error('sem ferro')
    // Só prova alguma coisa se arredondar para o mais perto e para baixo dessem números diferentes.
    expect(linha.adequacaoPct % 1).toBeGreaterThanOrEqual(0.5)
    expect(linha.adequacaoPct).toBeLessThan(89)
    return linha.adequacaoPct
  }
  // Meta no inteiro logo acima do ferro (com a castanha de 4 g, o cálcio do exemplo ficou em 64,03%): o mais perto daria o número da meta, em cor de abaixo.
  const comMetaLogoAcima = (pct: number): Partial<Caso> => ({
    ...adulta,
    adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'personalizado', referencia: 'rda', minimoPct: Math.ceil(pct) } },
  })
  const itemDoFerro = () => {
    const item = within(screen.getByRole('list', { name: 'Fora da meta' }))
      .getAllByRole('listitem')
      .find((i) => i.textContent?.startsWith('Ferro'))
    if (!item) throw new Error('ferro fora da lista')
    return within(item)
  }
  const celular = () =>
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta === '(max-width: 639px)',
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA-712: na tabela, longe da meta arredonda para o mais perto', () => {
    const plano = exemplo()
    const pct = ferroDoExemplo(plano)
    montar(adulta, plano)
    expect(linhaDe('Ferro').getByText(`${Math.round(pct)}% da referência · abaixo da meta`)).toBeInTheDocument()
  })

  it('CA-696 e CA-712: na tabela, com a meta logo acima, arredonda para baixo', () => {
    const plano = exemplo()
    const pct = ferroDoExemplo(plano)
    montar(comMetaLogoAcima(pct), plano)
    expect(linhaDe('Ferro').getByText(`${Math.floor(pct)}% da referência · abaixo da meta`)).toBeInTheDocument()
  })

  it('CA-696 e CA-712: na lista do celular, também', () => {
    celular()
    const plano = exemplo()
    const pct = ferroDoExemplo(plano)
    const { unmount } = render(<Anfitriao inicial={adulta} planoInicial={plano} />)
    expect(itemDoFerro().getByText(`${Math.round(pct)}% da referência · abaixo da meta`)).toBeInTheDocument()
    unmount()

    render(<Anfitriao inicial={comMetaLogoAcima(pct)} planoInicial={plano} />)
    expect(itemDoFerro().getByText(`${Math.floor(pct)}% da referência · abaixo da meta`)).toBeInTheDocument()
  })
})

describe('Produto do rótulo na etapa 3 (spec revisao-geral-trabalho, CA-793)', () => {
  afterEach(() => {
    registrarProdutos([])
  })

  it('o nutriente que o rótulo não traz leva a † na linha; o que o rótulo traz, não', () => {
    registrarProdutos([
      produtoComoAlimento({
        id: 900_001,
        codigoBarras: '',
        nome: 'Granola',
        marca: '',
        porcaoG: 40,
        medidaCaseira: '',
        porPorcao: { energia_kcal: 160, ferro_mg: 2, calcio_mg: 40 },
        criadoEm: '2026-10-20T12:00:00.000Z',
      }),
    ])
    const plano = criarPlanoPadrao(ids)
    const almoco = plano.refeicoes[2]
    if (!almoco) throw new Error('sem almoço')
    montar(adulta, adicionarItem(plano, almoco.id, 'principal', { alimentoId: 900_001, gramas: 40 }, ids))
    expect(linhaDe('Vitamina A (RAE)').getAllByText('†').length).toBeGreaterThan(0)
    expect(linhaDe('Ferro').queryByText('†')).not.toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })
})

describe('Mínimo da meta só com número inteiro (spec revisao-geral-trabalho, D-243)', () => {
  it('CA-782: "90,4" avisa e não muda a meta; "85" muda e o aviso some', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const minimo = screen.getByLabelText('Mínimo da meta')
    await usuario.clear(minimo)
    await usuario.type(minimo, '90,4')
    expect(screen.getByText('Use um número inteiro, como 90.')).toBeInTheDocument()
    expect(screen.getByText(/meta de 90% da referência/)).toBeInTheDocument()
    await usuario.clear(minimo)
    await usuario.type(minimo, '85')
    expect(screen.queryByText('Use um número inteiro, como 90.')).not.toBeInTheDocument()
    expect(screen.getByText(/meta de 85% da referência/)).toBeInTheDocument()
  })

  it('CA-782 (revisão de 20/10/2026): trocar de tipo e voltar a "Personalizado" mostra o campo sem o aviso', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const minimo = screen.getByLabelText('Mínimo da meta')
    await usuario.clear(minimo)
    await usuario.type(minimo, '90,4')
    expect(screen.getByText('Use um número inteiro, como 90.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: 'Individual (RDA, 90%)' }))
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    expect(screen.getByLabelText('Mínimo da meta')).toHaveValue('90')
    expect(screen.queryByText('Use um número inteiro, como 90.')).not.toBeInTheDocument()
  })

  it('CB-242: campo vazio não mostra o aviso e não muda a meta', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    await usuario.clear(screen.getByLabelText('Mínimo da meta'))
    expect(screen.queryByText('Use um número inteiro, como 90.')).not.toBeInTheDocument()
    expect(screen.getByText(/meta de 90% da referência/)).toBeInTheDocument()
  })

  it('CA-783: um mínimo de 90,4% guardado aparece como 90 no campo e no subtítulo', () => {
    montar({ ...adulta, adequacao: { ...criarCasoVazio('x').adequacao, preset: { tipo: 'personalizado', referencia: 'rda', minimoPct: 90.4 } } }, planoComArroz())
    expect(screen.getByLabelText('Mínimo da meta')).toHaveValue('90')
    expect(screen.getByText(/meta de 90% da referência/)).toBeInTheDocument()
  })
})

describe('Mínimo da meta dentro do que o cálculo aceita (CA-698)', () => {
  it('CA-698: acima de 1000% o número não vale, e a tela não cai', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const minimo = screen.getByLabelText('Mínimo da meta')
    await usuario.clear(minimo)
    await usuario.type(minimo, '10000')
    expect(screen.getByText(/meta de 1\.000% da referência/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('Sódio sem Cobrir na etapa 3 (CA-697)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA-697: na tabela, o sódio abaixo da meta fica à vista, com o estado e sem Cobrir', () => {
    montar(adulta, exemplo())
    const sodio = linhaDe('Sódio')
    expect(sodio.getByText(/^\d+% da referência · abaixo da meta$/)).toBeInTheDocument()
    expect(sodio.getByText('1.500 mg')).toBeInTheDocument()
    expect(sodio.queryByRole('button')).not.toBeInTheDocument()
  })

  it('CA-697: na lista do celular, também', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta === '(max-width: 639px)',
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    montar(adulta, exemplo())
    const sodio = within(screen.getByRole('list', { name: 'Fora da meta' }))
      .getAllByRole('listitem')
      .find((i) => i.textContent?.startsWith('Sódio'))
    if (!sodio) throw new Error('sódio fora da lista')
    expect(within(sodio).getByText(/^\d+% da referência · abaixo da meta$/)).toBeInTheDocument()
    expect(within(sodio).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Notas lidas com o símbolo (CA-700)', () => {
  it('CA-700: o † e o ‡ das notas não ficam escondidos do leitor de tela', () => {
    montar(adulta, exemplo())
    const adaga = screen.getByText(/^Pode estar subestimado:/).previousElementSibling
    const duplaAdaga = screen.getByText(/^O limite superior da tabela/).previousElementSibling
    expect(adaga).toHaveTextContent('†')
    expect(adaga).not.toHaveAttribute('aria-hidden')
    expect(duplaAdaga).toHaveTextContent('‡')
    expect(duplaAdaga).not.toHaveAttribute('aria-hidden')
  })
})

describe('Chegar pelo "Ver todos" (CA-701)', () => {
  it('CA-701: com focarTitulo, a tela abre com o foco no título "Micronutrientes" e avisa que focou', () => {
    const aoFocarTitulo = vi.fn()
    render(
      <TelaAdequacao
        caso={{ ...criarCasoVazio('c1'), ...adulta }}
        plano={exemplo()}
        gastoEnergetico={1800}
        aoAlterarCaso={() => undefined}
        aoAlterarPlano={() => undefined}
        focarTitulo
        aoFocarTitulo={aoFocarTitulo}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Micronutrientes' })).toHaveFocus()
    expect(aoFocarTitulo).toHaveBeenCalledOnce()
  })

  it('CA-701: sem focarTitulo, o foco não muda', () => {
    montar(adulta, exemplo())
    expect(screen.getByRole('heading', { name: 'Micronutrientes' })).not.toHaveFocus()
  })
})

describe('Testes mais firmes da etapa 3 (revisão de 15/10)', () => {
  it('CA-694: sem gasto calculado, a gaveta não fala de kcal', async () => {
    render(<Anfitriao inicial={adulta} planoInicial={exemplo()} gasto={null} />)
    const gaveta = await abrirCobrir(userEvent.setup(), 'Ferro')
    const descricao = gaveta.getByText(/para a meta\.$/)
    expect(descricao.textContent).not.toMatch(/kcal/)
  })

  it('CA-694: passar 0,4 kcal do gasto sai "Cabem 0 kcal", nunca "-0"', async () => {
    const plano = exemplo()
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total
    render(<Anfitriao inicial={adulta} planoInicial={plano} gasto={kcal - 0.4} />)
    const gaveta = await abrirCobrir(userEvent.setup(), 'Ferro')
    expect(gaveta.getByText(/Ainda cabem 0 kcal até o gasto energético\./)).toBeInTheDocument()
    expect(gaveta.queryByText(/-0/)).not.toBeInTheDocument()
  })

  it('CA-690: o recolhido fecha quando a tela abre de novo', async () => {
    const plano = exemplo()
    const { unmount } = render(<Anfitriao inicial={adulta} planoInicial={plano} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /^Ver os \d+ nutrientes na meta$/ }))
    expect(screen.getByRole('button', { name: /^Esconder os \d+ nutrientes na meta$/ })).toHaveAttribute('aria-expanded', 'true')
    unmount()

    render(<Anfitriao inicial={adulta} planoInicial={plano} />)
    expect(screen.getByRole('button', { name: /^Ver os \d+ nutrientes na meta$/ })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Foco depois do Cobrir na etapa 3 (D-212, CA-713)', () => {
  const cobrirDaTela = () => screen.getAllByRole('button', { name: /^Cobrir / }).map((b) => b.getAttribute('aria-label') ?? '')

  it('CA-713: a linha chega à meta e perde o Cobrir; o foco vai para o Cobrir do próximo', async () => {
    const plano = exemplo()
    await gavetaSugere(sugestaoQueLevaAMeta(plano, { ...criarCasoVazio('c1'), ...adulta }, 'calcio_mg', IOGURTE_DESNATADO, ids))
    const usuario = montar(adulta, plano)
    const ordem = cobrirDaTela()
    const proximo = ordem[ordem.indexOf('Cobrir Cálcio') + 1]
    if (!proximo) throw new Error('o cálcio é o último da tabela')

    await usuario.click(screen.getByRole('button', { name: 'Cobrir Cálcio' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Adicionar' }))
    expect(screen.queryByRole('button', { name: 'Cobrir Cálcio' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: proximo })).toHaveFocus())
  })

  it('CA-713: fechar a gaveta sem adicionar devolve o foco ao Cobrir', async () => {
    const usuario = montar(adulta, exemplo())
    await usuario.click(screen.getByRole('button', { name: 'Cobrir Cálcio' }))
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cobrir Cálcio' })).toHaveFocus())
  })
})

describe('As cinco do USDA na etapa 3 (spec vitaminas-usda, CA-958)', () => {
  it('aparecem na tabela, com † quando algum alimento do plano não tem o dado', () => {
    // 533 Cuscuz: sem equivalente no USDA, as cinco ficam sem dado.
    const plano = criarPlanoPadrao(ids)
    const almoco = plano.refeicoes[2]
    if (!almoco) throw new Error('sem almoço')
    montar(adulta, adicionarItem(plano, almoco.id, 'principal', { alimentoId: 533, gramas: 200 }, ids))
    for (const rotulo of ['Selênio', 'Vitamina D', 'Vitamina E', 'Folato (DFE)', 'Vitamina B12']) {
      const linha = screen.getAllByRole('row').find((r) => r.textContent?.startsWith(rotulo))
      if (!linha) throw new Error(`${rotulo} fora da tabela`)
      expect(within(linha).getByTitle(/total possivelmente subestimado/)).toHaveTextContent('†')
      expect(within(linha).getByRole('button', { name: `Cobrir ${rotulo}` })).toBeInTheDocument()
    }
  })
})
