import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import { comCuidadosDaFase, montarRestricoes, SEM_RESTRICOES } from '@/domain/restricoes.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { DialogoImprimir } from './DialogoImprimir.tsx'
import { MenuExportar } from './MenuExportar.tsx'

let n = 0
const ids = () => `id${++n}`
const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }
const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

function plano(): Plano {
  const p = criarPlanoPadrao(ids)
  const almoco = p.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(p, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
}

const abrir = () => render(<DialogoImprimir aberto caso={caso} plano={plano()} assinatura={ANA} aoFechar={vi.fn()} />)
const janela = () => within(screen.getByRole('dialog', { name: 'Plano alimentar para imprimir' }))

beforeEach(() => localStorage.clear())

describe('Suplementos da ficha na janela de imprimir (spec anamnese-e-prescricoes, CA-577)', () => {
  const vitD = { id: 's1', nome: 'Vitamina D3', dose: '1 cápsula', horario: '', duracao: '', observacao: '' }

  it('CA-577: com suplementos, a opção "Suplementos da ficha" aparece ligada e tira a seção quando desligada', async () => {
    render(<DialogoImprimir aberto caso={caso} plano={plano()} assinatura={ANA} suplementos={[vitD]} aoFechar={vi.fn()} />)
    const opcao = janela().getByRole('switch', { name: 'Suplementos da ficha' })
    expect(opcao).toHaveAttribute('aria-checked', 'true')
    expect(janela().getByRole('heading', { name: 'Suplementos' })).toBeInTheDocument()
    await userEvent.setup().click(opcao)
    expect(janela().queryByRole('heading', { name: 'Suplementos' })).not.toBeInTheDocument()
  })

  it('CA-577: sem suplemento com nome, a opção não aparece', () => {
    render(<DialogoImprimir aberto caso={caso} plano={plano()} assinatura={ANA} suplementos={[{ ...vitD, nome: '' }]} aoFechar={vi.fn()} />)
    expect(janela().queryByRole('switch', { name: 'Suplementos da ficha' })).not.toBeInTheDocument()
    // CA-635 (spec impressao-do-plano): os lembretes saíram da folha.
    expect(screen.getByText('Refeições, orientações e assinatura sempre entram. Escolha o que incluir além disso.')).toBeInTheDocument()
  })
})

describe('Aviso de restrição antes de imprimir (spec impressao-do-plano, correção C, D-480)', () => {
  const comOvo = (): Plano => {
    const p = plano()
    const cafe = p.refeicoes[0]
    const jantar = p.refeicoes[4]
    if (!cafe || !jantar) throw new Error('sem refeição')
    // 488 Ovo cozido no café e no jantar: uma linha só (CB-448).
    return adicionarItem(adicionarItem(p, cafe.id, 'principal', { alimentoId: 488, gramas: 90 }, ids), jantar.id, 'substituto1', { alimentoId: 488, gramas: 45 }, ids)
  }
  const alergiaAOvo = montarRestricoes({ marcadas: ['ovo'], texto: '', doencas: [], naoGosta: '' })

  it('CA-1327: com ovo no plano e alergia a ovo na ficha, a janela avisa, sem sair no papel, e o botão continua liberado', () => {
    render(<DialogoImprimir aberto caso={caso} plano={comOvo()} restricoes={alergiaAOvo} assinatura={ANA} aoFechar={vi.fn()} />)
    const aviso = janela().getByText('Este plano tem Ovo cozido, e a ficha diz Alergia: ovo. Confira antes de imprimir.')
    expect(aviso.closest('.print\\:hidden')).not.toBeNull()
    expect(within(document.querySelector('.area-impressao') as HTMLElement).queryByText(/Confira antes de imprimir/)).toBeNull()
    expect(janela().getAllByText(/Este plano tem Ovo cozido/)).toHaveLength(1)
    expect(janela().getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeEnabled()
  })

  it('CA-1328: sem nada que bata com a ficha, nenhum aviso', () => {
    render(<DialogoImprimir aberto caso={caso} plano={plano()} restricoes={alergiaAOvo} assinatura={ANA} aoFechar={vi.fn()} />)
    expect(janela().queryByText(/Confira antes de imprimir/)).not.toBeInTheDocument()
  })

  it('CB-449: sem paciente, o cuidado da fase de vida (criança com café) também avisa', () => {
    const p = plano()
    const cafe = p.refeicoes[0]
    if (!cafe) throw new Error('sem café')
    const comCafe = adicionarItem(p, cafe.id, 'principal', { alimentoId: 471, gramas: 50 }, ids)
    const crianca = comCuidadosDaFase(SEM_RESTRICOES, { condicao: { tipo: 'nenhuma' }, idadeAnos: 6 })
    render(<DialogoImprimir aberto caso={caso} plano={comCafe} restricoes={crianca} assinatura={ANA} aoFechar={vi.fn()} />)
    // O cuidado não vem da ficha: a frase diz o cuidado, sem "a ficha diz".
    expect(janela().getByText(/^Este plano tem Café[^.]*\. Café, chá preto ou mate e refrigerante com cafeína não são indicados para crianças\. Confira antes de imprimir\.$/)).toBeInTheDocument()
  })
})

describe('Janela de imprimir (CA-317, CA-320)', () => {
  it('CA-317: lista de compras e trocas começam desmarcadas e mudam a prévia na hora', async () => {
    abrir()
    const usuario = userEvent.setup()
    const compras = janela().getByRole('switch', { name: 'Lista de compras' })
    const trocas = janela().getByRole('switch', { name: 'Trocas' })
    expect(compras).toHaveAttribute('aria-checked', 'false')
    expect(trocas).toHaveAttribute('aria-checked', 'false')
    expect(janela().queryByRole('heading', { name: 'Lista de compras da semana' })).not.toBeInTheDocument()

    await usuario.click(compras)
    // CA-1257 (correção A, D-445): a lista é da semana, no peso de compra.
    expect(janela().getByRole('heading', { name: 'Lista de compras da semana' })).toBeInTheDocument()
    await usuario.click(trocas)
    expect(janela().getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
  })

  it('CA-320: o que foi marcado volta marcado na próxima vez', async () => {
    const { unmount } = abrir()
    await userEvent.setup().click(janela().getByRole('switch', { name: 'Trocas' }))
    unmount()

    abrir()
    expect(janela().getByRole('switch', { name: 'Trocas' })).toHaveAttribute('aria-checked', 'true')
    expect(janela().getByRole('switch', { name: 'Lista de compras' })).toHaveAttribute('aria-checked', 'false')
  })

  it('a folha sai com quem assina o plano', () => {
    abrir()
    expect(janela().getAllByText('Ana Souza · CRN-6 12345').length).toBeGreaterThan(0)
  })

  it('clicar no título ou texto da opção alterna o switch uma única vez', async () => {
    abrir()
    const usuario = userEvent.setup()

    // Testa "Lista de compras"
    const switchCompras = janela().getByRole('switch', { name: 'Lista de compras' })
    const tituloCompras = janela().getByText('Lista de compras')
    const textoCompras = janela().getByText('Para 7 dias, no peso de compra.')

    // Estado inicial: false
    expect(switchCompras).toHaveAttribute('aria-checked', 'false')

    // Clique no título: false → true
    await usuario.click(tituloCompras)
    expect(switchCompras).toHaveAttribute('aria-checked', 'true')

    // Clique no texto de apoio: true → false
    await usuario.click(textoCompras)
    expect(switchCompras).toHaveAttribute('aria-checked', 'false')

    // Clique no próprio switch: false → true
    await usuario.click(switchCompras)
    expect(switchCompras).toHaveAttribute('aria-checked', 'true')

    // Testa "Trocas" também
    const switchTrocas = janela().getByRole('switch', { name: 'Trocas' })
    const tituloTrocas = janela().getByText('Trocas')
    const textoTrocas = janela().getByText('Até 2 opções para cada alimento do plano.')

    // Estado inicial: false
    expect(switchTrocas).toHaveAttribute('aria-checked', 'false')

    // Clique no título: false → true
    await usuario.click(tituloTrocas)
    expect(switchTrocas).toHaveAttribute('aria-checked', 'true')

    // Clique no texto de apoio: true → false
    await usuario.click(textoTrocas)
    expect(switchTrocas).toHaveAttribute('aria-checked', 'false')

    // Clique no próprio switch: false → true
    await usuario.click(switchTrocas)
    expect(switchTrocas).toHaveAttribute('aria-checked', 'true')
  })

  it('o menu Exportar leva a assinatura até a folha de imprimir', async () => {
    render(<MenuExportar caso={caso} plano={plano()} assinatura={ANA} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }))
    expect(janela().getAllByText('Ana Souza · CRN-6 12345').length).toBeGreaterThan(0)
    expect(janela().getByRole('button', { name: /Imprimir ou salvar em PDF/ })).toBeInTheDocument()
  })
})

describe('Quantidades para o paciente na janela de imprimir (spec alimentos-e-gramaturas, D-376)', () => {
  it('CA-1121 e CA-1122: plano novo em "Medida e gramas"; trocar o modo muda a folha e chama quem grava no plano', async () => {
    const aoMudarModo = vi.fn()
    const { rerender } = render(<DialogoImprimir aberto caso={caso} plano={plano()} assinatura={ANA} aoMudarModo={aoMudarModo} aoFechar={vi.fn()} />)
    const escolha = janela().getByRole('radiogroup', { name: 'Quantidades para o paciente' })
    expect(within(escolha).getByRole('radio', { name: 'Medida e gramas' })).toHaveAttribute('aria-checked', 'true')
    expect(janela().getByText('6 colheres de sopa (150 g)')).toBeInTheDocument()
    await userEvent.setup().click(within(escolha).getByRole('radio', { name: 'Só gramas' }))
    expect(aoMudarModo).toHaveBeenLastCalledWith('gramas')
    rerender(<DialogoImprimir aberto caso={{ ...caso, quantidades: 'gramas' }} plano={plano()} assinatura={ANA} aoMudarModo={aoMudarModo} aoFechar={vi.fn()} />)
    expect(janela().getByText('150 g')).toBeInTheDocument()
  })

  it('sem quem grave no plano, a escolha vale só para esta impressão', async () => {
    abrir()
    await userEvent.setup().click(janela().getByRole('radio', { name: 'Só medida' }))
    expect(janela().getByText('6 colheres de sopa')).toBeInTheDocument()
  })
})
