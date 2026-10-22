import { render, screen, within } from '@testing-library/react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import { PRIMEIRO_ID_PRODUTO } from '@/domain/produtos.ts'
import { ALIMENTOS, registrarProdutos } from '@/domain/tabelas.ts'
import type { Alimento, Caso, Plano } from '@/domain/tipos.ts'
import { FolhaDieta } from './FolhaDieta.tsx'

let n = 0
const ids = () => `id${++n}`

const ARROZ = 3
const BATATA = 91
const MACARRAO_CRU = 40

const caso: Caso = {
  ...criarCasoVazio('c1'),
  nome: 'Maria, 28 anos',
  dataConsulta: '2026-09-15',
  sexo: 'F',
  idadeAnos: 28,
  pesoKg: 60,
  estaturaCm: 165,
  orientacoes: 'Beber 2 litros de água por dia.',
}

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

function planoCheio(): Plano {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  const jantar = plano.refeicoes[4]
  if (!almoco || !jantar) throw new Error('plano padrão mudou')
  plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: ARROZ, gramas: 150 }, ids)
  plano = adicionarItem(plano, almoco.id, 'substituto1', { alimentoId: BATATA, gramas: 120 }, ids)
  plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: MACARRAO_CRU, gramas: 80 }, ids)
  return plano
}

const refeicao = (nome: RegExp) => within(screen.getByRole('region', { name: nome }))

beforeEach(() => localStorage.clear())

describe('Folha da dieta (US-B1)', () => {
  it('CA-308: cabeçalho com título, nome do plano e data por extenso', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    expect(screen.getByRole('heading', { name: 'Plano alimentar' })).toBeInTheDocument()
    expect(screen.getByText('Maria, 28 anos · 15 de setembro de 2026')).toBeInTheDocument()
  })

  it('Foco de revisão 2: sem nome e sem data, nada de separador solto', () => {
    render(<FolhaDieta caso={{ ...caso, nome: '', dataConsulta: null }} plano={planoCheio()} />)
    expect(screen.getByText('Paciente sem nome')).toBeInTheDocument()
  })

  it('CA-623, CA-629 e CA-630: o nome que o paciente entende e uma quantidade só', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    const almoco = refeicao(/^12:00 Almoço$/)
    expect(almoco.getByRole('heading', { name: 'Almoço' })).toBeInTheDocument()
    const arroz = almoco.getByText('Arroz branco cozido').closest('li')
    expect(arroz).toHaveTextContent(/^Arroz branco cozido, 6 colheres de sopa$/)
    // A quantidade perto do nome: a coluna do alimento tem largura fixa. No celular, a quantidade embaixo, em cinza.
    expect(arroz).toHaveClass('sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]')
    expect(within(arroz as HTMLElement).getByText('6 colheres de sopa')).toHaveClass('text-muted-foreground', 'sm:text-foreground')
    expect(almoco.queryByText(/150 g/)).not.toBeInTheDocument()
    expect(almoco.queryByText(/Arroz, tipo 1/)).not.toBeInTheDocument()

    // Sem medida caseira, o peso.
    const jantar = refeicao(/^19:00 Jantar$/)
    expect(jantar.getByText('Macarrão (peso cru)').closest('li')).toHaveTextContent(/^Macarrão \(peso cru\), 80 g$/)
  })

  it('CB-187: nome de produto com código sai como texto, e nada executa', () => {
    const codigo = '<img src=x onerror="window.__xssFolha=1">'
    const produto = { ...ALIMENTOS[0], id: PRIMEIRO_ID_PRODUTO + 8, descricao: codigo, categoria: 'Meus produtos', base: null } as Alimento
    registrarProdutos([produto])
    try {
      let plano = criarPlanoPadrao(ids)
      const ceia = plano.refeicoes[5]
      if (!ceia) throw new Error('sem ceia')
      plano = adicionarItem(plano, ceia.id, 'principal', { alimentoId: produto.id, gramas: 30 }, ids)
      const { container } = render(<FolhaDieta caso={caso} plano={plano} opcoes={{ listaDeCompras: true, trocas: false }} />)
      expect(refeicao(/^21:00 Ceia$/).getByText(codigo)).toBeInTheDocument()
      expect(container.querySelector('img[src="x"]')).toBeNull()
      expect((window as unknown as { __xssFolha?: number }).__xssFolha).toBeUndefined()
    } finally {
      registrarProdutos([])
    }
  })

  // Spec conduta-da-nutricionista, D-297: a nutricionista escolhe, por plano; substitui o D-183 e o D-189.
  function planoComDesjejum(): Plano {
    let plano = planoCheio()
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 265, gramas: 5 }, ids)
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 222, gramas: 130 }, ids)
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 182, gramas: 130 }, ids)
    return plano
  }

  it('CA-926 e CA-927: em "Medida caseira", só a medida, sem o peso ao lado; margarina em ponta de faca', () => {
    render(<FolhaDieta caso={caso} plano={planoComDesjejum()} />)
    const desjejum = refeicao(/^06:00 Desjejum$/)
    expect(desjejum.getByText('Maçã Fuji com casca').closest('li')).toHaveTextContent(/^Maçã Fuji com casca, 3 fatias e meia$/)
    // D-295: "5 fatias" de banana vira a medida de até 4 pedaços que serve.
    expect(desjejum.getByText('Banana prata').closest('li')).toHaveTextContent(/^Banana prata, 1 unidade e meia$/)
    expect(desjejum.getByText('Margarina com sal').closest('li')).toHaveTextContent(/^Margarina com sal, 1 ponta de faca$/)
    // A batata de 120 g não sai mais em gramas: tem medida caseira que serve.
    expect(refeicao(/^12:00 Almoço$/).getByText('Batata inglesa cozida').closest('li')).not.toHaveTextContent(/\d g$/)
    expect(screen.getByRole('article').textContent).not.toMatch(/ · \d+ g/)
  })

  it('CA-925: em "Gramas", só o peso, na refeição, na lista de compras e nas trocas', () => {
    render(<FolhaDieta caso={{ ...caso, quantidades: 'gramas' }} plano={planoComDesjejum()} opcoes={{ listaDeCompras: true, trocas: true }} />)
    const desjejum = refeicao(/^06:00 Desjejum$/)
    expect(desjejum.getByText('Maçã Fuji com casca').closest('li')).toHaveTextContent(/^Maçã Fuji com casca, 130 g$/)
    expect(desjejum.getByText('Margarina com sal').closest('li')).toHaveTextContent(/^Margarina com sal, 5 g$/)
    expect(refeicao(/^12:00 Almoço$/).getByText('Arroz branco cozido').closest('li')).toHaveTextContent(/^Arroz branco cozido, 150 g$/)
    const compra = (texto: string) => screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent?.trim() === texto)
    expect(compra('Arroz branco cozido — 150 g')).toBeInTheDocument()
    const trocas = [...screen.getByRole('list', { name: 'Trocas' }).querySelectorAll('.troca')].map((t) => t.textContent ?? '')
    expect(trocas.length).toBeGreaterThan(0)
    for (const troca of trocas) expect(troca).toMatch(/ · \d+ g$/)
  })

  it('CA-626: produto cadastrado sai com o nome que a nutricionista escreveu', () => {
    const whey = { ...ALIMENTOS[0], id: PRIMEIRO_ID_PRODUTO + 7, descricao: 'Whey, baunilha (Marca X)', categoria: 'Meus produtos', base: null } as Alimento
    registrarProdutos([whey])
    try {
      let plano = criarPlanoPadrao(ids)
      const ceia = plano.refeicoes[5]
      if (!ceia) throw new Error('sem ceia')
      plano = adicionarItem(plano, ceia.id, 'principal', { alimentoId: whey.id, gramas: 30 }, ids)
      render(<FolhaDieta caso={caso} plano={plano} />)
      expect(refeicao(/^21:00 Ceia$/).getByText('Whey, baunilha (Marca X)')).toBeInTheDocument()
    } finally {
      registrarProdutos([])
    }
  })

  it('CA-631: "Opção 1" em cima da primeira e "ou Opção 2" no fio, sem caixa; substituto vazio não aparece nem conta', () => {
    // A batata vai no substituto 2, com o substituto 1 vazio: na folha ela é a "Opção 2" (a ordem em que aparece).
    let plano = criarPlanoPadrao(ids)
    const almocoId = plano.refeicoes[2]?.id ?? ''
    plano = adicionarItem(plano, almocoId, 'principal', { alimentoId: ARROZ, gramas: 150 }, ids)
    plano = adicionarItem(plano, almocoId, 'substituto1', { alimentoId: MACARRAO_CRU, gramas: 0 }, ids)
    plano = adicionarItem(plano, almocoId, 'substituto2', { alimentoId: BATATA, gramas: 120 }, ids)
    render(<FolhaDieta caso={caso} plano={plano} />)
    const regiao = screen.getByRole('region', { name: /^12:00 Almoço$/ })
    const almoco = within(regiao)
    expect(almoco.getAllByText(/Opção/).map((e) => e.textContent)).toEqual(['Opção 1', 'ou Opção 2'])
    const [principal, substituto] = almoco.getAllByRole('list')
    expect(principal).toHaveTextContent('Arroz branco cozido')
    expect(substituto).toHaveTextContent('Batata inglesa cozida')
    const antes = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(antes(almoco.getByText('Opção 1'), principal as Node)).toBe(true)
    expect(antes(almoco.getByText('ou Opção 2'), substituto as Node)).toBe(true)
    expect(regiao.querySelector('[class*="bg-"], [class*="rounded"]')).toBeNull()
  })

  it('CA-632: refeição com uma opção só (aqui, só um substituto) vem sem rótulo, sem "ou" e não diz que está vazia', () => {
    let plano = criarPlanoPadrao(ids)
    const ceia = plano.refeicoes[5]
    if (!ceia) throw new Error('sem ceia')
    plano = adicionarItem(plano, ceia.id, 'substituto1', { alimentoId: BATATA, gramas: 120 }, ids)
    render(<FolhaDieta caso={caso} plano={plano} />)
    const regiao = refeicao(/^21:00 Ceia$/)
    expect(regiao.getByText('Batata inglesa cozida')).toBeInTheDocument()
    expect(regiao.queryByText('ou')).not.toBeInTheDocument()
    expect(regiao.queryByText(/Opção/)).not.toBeInTheDocument()
    expect(regiao.queryByText('Sem alimentos nesta refeição.')).not.toBeInTheDocument()
  })

  it('CA-311: a folha não fala de energia', () => {
    const { container } = render(<FolhaDieta caso={{ ...caso, modo: 'rapido', metaEnergiaKcal: 1800 }} plano={planoCheio()} />)
    expect(container.textContent).not.toMatch(/kcal/)
  })

  it('CA-311: lista de compras e trocas também não falam de energia', () => {
    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: true, trocas: true }} />)
    expect(screen.getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/energia|kcal/i)
  })

  it('CA-633: sem "No dia a dia", sem a régua de cor do topo e sem a linha da base', () => {
    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    expect(screen.queryByRole('heading', { name: 'No dia a dia' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Beber cerca de/)).toBeNull()
    expect(screen.queryByText(/por volta das/)).not.toBeInTheDocument()
    expect(screen.queryByText(/responsabilidade do nutricionista/)).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Base MetaNutri/)
    expect(container.querySelector('.border-laranja, .border-primary')).toBeNull()
  })

  it('CA-620: o horário tem a cor do nome da refeição, não a cor de ação do tema', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    const horario = within(screen.getByRole('region', { name: /^12:00 Almoço$/ })).getByText('12:00')
    expect(horario).toHaveClass('text-heading')
    expect(horario).not.toHaveClass('text-primary')
    // D-180: o papel usa o escopo claro de tokens.css.
    expect(screen.getByRole('article')).toHaveClass('papel')
  })

  it('CA-313: nutricionista assina sozinha, com a linha da conta no topo e no fim', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    expect(screen.getAllByText('Ana Souza · CRN-6 12345')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: 'Assinaturas' })).getByText('Nutricionista')).toBeInTheDocument()
  })

  it('CA-313: estágio sai com os dois nomes e duas assinaturas; sem ninguém, uma linha "Assinatura"', () => {
    const { unmount } = render(<FolhaDieta caso={{ ...caso, estagiario: 'Júlia Martins', preceptor: 'Carla Mendes' }} plano={planoCheio()} />)
    const assinaturas = within(screen.getByRole('group', { name: 'Assinaturas' }))
    expect(assinaturas.getByText('Estagiário(a)')).toBeInTheDocument()
    expect(assinaturas.getByText('Preceptor(a)')).toBeInTheDocument()
    expect(screen.getAllByText('Júlia Martins').length).toBeGreaterThanOrEqual(2)
    unmount()

    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(within(screen.getByRole('group', { name: 'Assinaturas' })).getByText('Assinatura')).toBeInTheDocument()
  })

  it('CA-633: refeições, orientações, receitas e assinatura nessa ordem; no atendimento completo, a folha acaba na assinatura', () => {
    const { container } = render(<FolhaDieta caso={{ ...caso, receitas: 'Cuscuz com ovo.' }} plano={planoCheio()} assinatura={ANA} />)
    const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const ceia = screen.getByRole('region', { name: /^21:00 Ceia$/ })
    const orientacoes = screen.getByRole('heading', { name: 'Orientações' })
    const receitas = screen.getByRole('heading', { name: 'Receitas' })
    const assinaturas = screen.getByRole('group', { name: 'Assinaturas' })
    expect(antes(ceia, orientacoes)).toBe(true)
    expect(antes(orientacoes, receitas)).toBe(true)
    expect(antes(receitas, assinaturas)).toBe(true)
    expect(container.querySelector('.fecho-da-folha')?.lastElementChild).toBe(assinaturas)
  })

  it('CA-634: em prescrição rápida, a última linha diz que não houve avaliação, e só ela', () => {
    const { container } = render(<FolhaDieta caso={{ ...caso, modo: 'rapido' }} plano={planoCheio()} />)
    const ultima = container.querySelector('.fecho-da-folha')?.lastElementChild
    expect(ultima).toHaveTextContent(/^Plano montado em prescrição rápida, sem avaliação antropométrica\.$/)
  })

  it('CA-315: refeição e fim da folha não se partem entre páginas', () => {
    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    for (const secao of screen.getAllByRole('region', { name: /^\d{2}:\d{2} / })) expect(secao).toHaveClass('break-inside-avoid')
    // O bloco do fim pode correr por páginas (orientação longa); só a assinatura com a linha final não se parte.
    expect(container.querySelector('.fim-da-folha')).not.toHaveClass('break-inside-avoid')
    expect(container.querySelector('.fecho-da-folha')).toHaveClass('break-inside-avoid', 'break-before-avoid')
    expect(container.querySelector('.fecho-da-folha')).toContainElement(screen.getByRole('group', { name: 'Assinaturas' }))
  })

  it('CA-316: a regra da linha fina vem com o nome do plano e quem assina', () => {
    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    const css = container.querySelector('style')?.textContent ?? ''
    expect(css).toContain('Plano alimentar · Maria, 28 anos')
    expect(css).toContain('Ana Souza · CRN-6 12345')
  })

  it('CA-318 e CA-319: lista de compras e trocas só quando marcadas, numa página nova, com até 2 trocas', () => {
    const { unmount } = render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.queryByRole('heading', { name: 'Lista de compras' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Trocas' })).not.toBeInTheDocument()
    unmount()

    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: true, trocas: true }} />)
    expect(screen.getByRole('heading', { name: 'Lista de compras' })).toBeInTheDocument()
    // CA-628 e CA-643: a lista de compras usa o nome para o paciente e a quantidade pela regra da refeição.
    const compra = (texto: string) => screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent?.trim() === texto)
    expect(compra('Arroz branco cozido — 6 colheres de sopa')).toBeInTheDocument()
    expect(compra('Macarrão (peso cru) — 80 g')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Trocas' }).textContent).not.toMatch(/,/)
    expect(container.querySelector('.anexos-da-folha')).toHaveClass('break-before-page')
    for (const linha of within(screen.getByRole('list', { name: 'Trocas' })).getAllByRole('listitem')) {
      expect(linha.querySelectorAll('.troca').length).toBeLessThanOrEqual(2)
    }
  })

  it('CB-188: a folha não troca um alimento por ele mesmo pelo nome do paciente', () => {
    // Arroz tipo 1 do plano: o arroz tipo 2 também é "Arroz branco cozido" e não pode aparecer como troca dele.
    render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: false, trocas: true }} />)
    const linhas = within(screen.getByRole('list', { name: 'Trocas' })).getAllByRole('listitem')
    expect(linhas.length).toBeGreaterThan(0)
    for (const linha of linhas) {
      const alimento = linha.querySelector('strong')?.textContent ?? ''
      const trocas = [...linha.querySelectorAll('.troca')].map((t) => (t.textContent ?? '').split(' · ')[0])
      expect(trocas, alimento).not.toContain(alimento)
      expect(new Set(trocas).size, alimento).toBe(trocas.length)
    }
  })

  it('CA-644: na troca, medida de pedaço com mais de 4 pedaços vira o peso ("Omelete de queijo", não "5 fatias")', () => {
    let n = 0
    const { caso: exemplo, plano } = criarExemplo(() => `ex${++n}`, '2026-10-15')
    render(<FolhaDieta caso={exemplo} plano={plano} opcoes={{ listaDeCompras: false, trocas: true }} />)
    const trocas = [...screen.getByRole('list', { name: 'Trocas' }).querySelectorAll('.troca')].map((t) => t.textContent ?? '')
    expect(trocas.length).toBeGreaterThan(0)
    for (const troca of trocas) expect(troca).not.toMatch(/\b([5-9]|\d{2,})( fatias| pedaços| rodelas| gomos)/)
    // A omelete saiu das trocas do ovo: alimento simples não troca por prato composto (spec conduta-da-nutricionista, CA-919).
    expect(trocas.some((t) => t.startsWith('Omelete'))).toBe(false)
  })

  it('as trocas não oferecem doce nem ultraprocessado', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: false, trocas: true }} />)
    const texto = (screen.getByRole('list', { name: 'Trocas' }).textContent ?? '').toLowerCase()
    for (const proibido of ['biscoito', 'chocolate', 'salsicha', 'refrigerante']) expect(texto).not.toContain(proibido)
  })

  describe('suplementos da ficha (spec anamnese-e-prescricoes)', () => {
    const vitD = { id: 's1', nome: 'Vitamina D3', dose: '1 cápsula', horario: 'No almoço', duracao: '3 meses', observacao: 'Com comida' }
    const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia', responsavelTecnico: 'Carla' }
    const FRASE = 'Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).'

    it('CA-577: a seção Suplementos vem logo depois de Orientações, com nome, a linha de baixo e a observação', () => {
      const { container } = render(<FolhaDieta caso={{ ...caso, receitas: 'Bolo de banana.' }} plano={planoCheio()} assinatura={ANA} suplementos={[vitD, { ...vitD, id: 's2', nome: '' }]} />)
      const titulos = [...(container.querySelector('.fim-da-folha')?.querySelectorAll('h3') ?? [])].map((h) => h.textContent)
      expect(titulos).toEqual(['Orientações', 'Suplementos', 'Receitas'])
      const secao = within(screen.getByRole('region', { name: 'Suplementos' }))
      const itens = secao.getAllByRole('listitem')
      expect(itens).toHaveLength(1)
      expect(itens[0]).toHaveTextContent('Vitamina D3 · Dose: 1 cápsula · Horário: No almoço · Por quanto tempo: 3 meses')
      expect(itens[0]).toHaveTextContent('Com comida')
      expect(secao.queryByText(FRASE)).not.toBeInTheDocument()
    })

    it('CA-577 e CB-166: sem suplemento com nome, a folha sai como antes', () => {
      const { unmount } = render(<FolhaDieta caso={caso} plano={planoCheio()} />)
      expect(screen.queryByRole('heading', { name: 'Suplementos' })).not.toBeInTheDocument()
      unmount()
      render(<FolhaDieta caso={caso} plano={planoCheio()} suplementos={[{ ...vitD, nome: ' ' }]} />)
      expect(screen.queryByRole('heading', { name: 'Suplementos' })).not.toBeInTheDocument()
    })

    it('CA-584: plano de estudante, ou com estagiário ou preceptor, leva a frase de proposta', () => {
      const { unmount } = render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={JULIA} suplementos={[vitD]} />)
      expect(within(screen.getByRole('region', { name: 'Suplementos' })).getByText(FRASE)).toBeInTheDocument()
      unmount()
      render(<FolhaDieta caso={{ ...caso, preceptor: 'Carla' }} plano={planoCheio()} assinatura={ANA} suplementos={[vitD]} />)
      expect(within(screen.getByRole('region', { name: 'Suplementos' })).getByText(FRASE)).toBeInTheDocument()
    })
  })

  describe('a água em Orientações (spec conduta-da-nutricionista, D-298)', () => {
    it('CA-931: sem edição, Orientações começa pela linha automática e segue com o texto da nutricionista', () => {
      render(<FolhaDieta caso={{ ...caso, pesoKg: 62, orientacoes: 'Coma devagar.' }} plano={planoCheio()} />)
      const secao = screen.getByRole('region', { name: 'Orientações' })
      expect([...secao.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['Beba cerca de 2,2 litros de água por dia.', 'Coma devagar.'])
    })

    it('CA-931: sem texto da nutricionista, a seção traz só a linha da água', () => {
      render(<FolhaDieta caso={{ ...caso, pesoKg: 62, orientacoes: '' }} plano={planoCheio()} />)
      const secao = screen.getByRole('region', { name: 'Orientações' })
      expect([...secao.querySelectorAll('p')].map((p) => p.textContent)).toEqual(['Beba cerca de 2,2 litros de água por dia.'])
    })

    it('CA-932 e CA-933: a linha escrita vale, a apagada não sai, e não há caixa de marcar', () => {
      const { unmount } = render(<FolhaDieta caso={{ ...caso, linhaDaAgua: 'Beba 2 litros de água, mais no treino.' }} plano={planoCheio()} />)
      const secao = screen.getByRole('region', { name: 'Orientações' })
      expect(secao).toHaveTextContent('Beba 2 litros de água, mais no treino.')
      expect(secao).not.toHaveTextContent('Beba cerca de')
      expect(secao.querySelector('input, [role="checkbox"], .rounded.border-\\[1\\.5px\\]')).toBeNull()
      unmount()
      render(<FolhaDieta caso={{ ...caso, linhaDaAgua: '', orientacoes: '' }} plano={planoCheio()} />)
      expect(screen.queryByRole('region', { name: 'Orientações' })).not.toBeInTheDocument()
    })

    it('CA-1092 (spec ficha-unica): sem peso e sem edição, não há linha da água', () => {
      render(<FolhaDieta caso={{ ...caso, pesoKg: null, orientacoes: 'Coma devagar.' }} plano={planoCheio()} />)
      expect(screen.getByRole('region', { name: 'Orientações' })).not.toHaveTextContent(/litros/)
    })
  })

  it('CB-71: plano sem alimento sai com o aviso em cada refeição', () => {
    render(<FolhaDieta caso={{ ...caso, orientacoes: '', linhaDaAgua: '' }} plano={criarPlanoPadrao(ids)} />)
    expect(screen.getAllByText('Sem alimentos nesta refeição.')).toHaveLength(6)
    expect(screen.queryByRole('heading', { name: 'Orientações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No dia a dia' })).not.toBeInTheDocument()
  })
})

describe('Produto apagado fica fora da folha (spec revisao-geral-trabalho, D-248, CA-789)', () => {
  it('nem a refeição nem a lista de compras citam o item apagado', () => {
    let plano = planoCheio()
    const almoco = plano.refeicoes[2]
    if (!almoco) throw new Error('plano padrão mudou')
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 900_001, gramas: 40 }, ids)
    render(<FolhaDieta caso={caso} plano={plano} opcoes={{ listaDeCompras: true, trocas: true }} />)
    const folha = screen.getByRole('heading', { name: 'Plano alimentar' }).closest('article') as HTMLElement
    expect(folha).not.toHaveTextContent(/removido|apagado|40 g/i)
    expect(refeicao(/^12:00 Almoço$/).getByText('Arroz branco cozido')).toBeInTheDocument()
  })
})
