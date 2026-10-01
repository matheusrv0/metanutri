import { render, screen, within } from '@testing-library/react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
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
    expect(screen.getByText('Sem nome')).toBeInTheDocument()
  })

  it('CA-309: medida caseira em destaque, peso ao lado e o alimento', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    const almoco = refeicao(/^12:00 Almoço$/)
    expect(almoco.getByRole('heading', { name: 'Almoço' })).toBeInTheDocument()
    expect(almoco.getByText('6 colheres de sopa')).toBeInTheDocument()
    expect(almoco.getByText(/· 150 g/)).toBeInTheDocument()
    expect(almoco.getByText('Arroz, tipo 1, cozido')).toBeInTheDocument()

    const jantar = refeicao(/^19:00 Jantar$/)
    expect(jantar.getByText('80 g')).toBeInTheDocument()
    expect(jantar.queryByText(/· 80 g/)).not.toBeInTheDocument()
  })

  it('CA-310: substituto vira "Opção 2"; substituto vazio não aparece', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    const almoco = refeicao(/^12:00 Almoço$/)
    expect(almoco.getByText('Opção 2')).toBeInTheDocument()
    expect(almoco.getByText('Batata, inglesa, cozida')).toBeInTheDocument()
    expect(almoco.queryByText('Opção 3')).not.toBeInTheDocument()
  })

  it('Foco de revisão 5: refeição só com substituto mostra a opção e não diz que está vazia', () => {
    let plano = criarPlanoPadrao(ids)
    const ceia = plano.refeicoes[5]
    if (!ceia) throw new Error('sem ceia')
    plano = adicionarItem(plano, ceia.id, 'substituto1', { alimentoId: BATATA, gramas: 120 }, ids)
    render(<FolhaDieta caso={caso} plano={plano} />)
    const regiao = refeicao(/^21:00 Ceia$/)
    expect(regiao.getByText('Opção 2')).toBeInTheDocument()
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

  it('CA-312: "No dia a dia" traz só o que não é horário de refeição', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.getByRole('heading', { name: 'No dia a dia' })).toBeInTheDocument()
    // "litros de água" aparece também nas orientações do caso; aqui só a seção dos lembretes.
    const lembretes = within(screen.getByRole('region', { name: 'No dia a dia' }))
    expect(lembretes.getByText(/litros de água/)).toBeInTheDocument()
    expect(screen.queryByText(/por volta das/)).not.toBeInTheDocument()
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

  it('CA-314: lembretes, orientações e assinatura nessa ordem, e a linha da base no fim', () => {
    render(<FolhaDieta caso={{ ...caso, receitas: 'Cuscuz com ovo.' }} plano={planoCheio()} assinatura={ANA} />)
    const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const lembretes = screen.getByRole('heading', { name: 'No dia a dia' })
    const orientacoes = screen.getByRole('heading', { name: 'Orientações' })
    const receitas = screen.getByRole('heading', { name: 'Receitas' })
    const assinaturas = screen.getByRole('group', { name: 'Assinaturas' })
    expect(antes(lembretes, orientacoes)).toBe(true)
    expect(antes(orientacoes, receitas)).toBe(true)
    expect(antes(receitas, assinaturas)).toBe(true)
    expect(screen.getByText(/A prescrição é responsabilidade do nutricionista\. Composição dos alimentos: Base MetaNutri\./)).toBeInTheDocument()
  })

  it('CA-314: em prescrição rápida, a linha final diz que não houve avaliação', () => {
    render(<FolhaDieta caso={{ ...caso, modo: 'rapido' }} plano={planoCheio()} />)
    expect(screen.getByText(/^Plano montado em prescrição rápida, sem avaliação antropométrica\./)).toBeInTheDocument()
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
    expect(screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent?.trim() === 'Arroz, tipo 1, cozido — 150 g')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
    expect(container.querySelector('.anexos-da-folha')).toHaveClass('break-before-page')
    for (const linha of within(screen.getByRole('list', { name: 'Trocas' })).getAllByRole('listitem')) {
      expect(linha.querySelectorAll('.troca').length).toBeLessThanOrEqual(2)
    }
  })

  it('as trocas não oferecem doce nem ultraprocessado', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: false, trocas: true }} />)
    const texto = (screen.getByRole('list', { name: 'Trocas' }).textContent ?? '').toLowerCase()
    for (const proibido of ['biscoito', 'chocolate', 'salsicha', 'refrigerante']) expect(texto).not.toContain(proibido)
  })

  it('CB-71: plano sem alimento sai com o aviso em cada refeição', () => {
    render(<FolhaDieta caso={{ ...caso, orientacoes: '' }} plano={criarPlanoPadrao(ids)} />)
    expect(screen.getAllByText('Sem alimentos nesta refeição.')).toHaveLength(6)
    expect(screen.queryByRole('heading', { name: 'Orientações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No dia a dia' })).not.toBeInTheDocument()
  })
})
