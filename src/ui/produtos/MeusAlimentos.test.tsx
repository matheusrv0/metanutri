// Spec alimentos-e-gramaturas, D-383 a D-387: as telas de "Meus alimentos" e das medidas próprias.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { medidasDoAlimento, registrarMedidasProprias } from '@/domain/busca.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { trocarDadosEmMemoria } from '../estado/armazenamentoDaSessao.ts'
import { TelaAlimentos } from '../alimentos/TelaAlimentos.tsx'
import { TelaProdutos } from './TelaProdutos.tsx'

// O jsdom não tem ResizeObserver; o Switch dentro de formulário mede o próprio tamanho.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

beforeEach(() => {
  localStorage.clear()
  registrarProdutos([])
  registrarMedidasProprias([])
})

describe('Meus alimentos com o formulário novo (D-383)', () => {
  it('CA-1157: na publicação 2, a tela abre com o formulário novo', () => {
    render(<TelaProdutos />)
    expect(screen.getByText('Meus alimentos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo alimento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cadastrar pelo rótulo' })).not.toBeInTheDocument()
  })

  it('CA-1139 e CA-1140: cadastra um alimento por 100 g, que entra na lista e na busca', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    expect(janela.getByRole('radio', { name: 'Alimento' })).toHaveAttribute('aria-checked', 'true')
    await usuario.type(janela.getByLabelText('Nome'), 'Cuscuz da casa')
    await usuario.selectOptions(janela.getByLabelText('Grupo'), 'Cereais e derivados')
    await usuario.selectOptions(janela.getByLabelText('Como é servido'), 'cozido')
    await usuario.type(janela.getByLabelText('Energia'), '112')
    await usuario.type(janela.getByLabelText('Proteína'), '2,2')
    await usuario.type(janela.getByLabelText('Carboidrato'), '25')
    await usuario.type(janela.getByLabelText('Gordura total'), '0,3')
    await usuario.selectOptions(janela.getByLabelText('Fonte dos valores'), 'laboratorio')
    await usuario.click(janela.getByRole('button', { name: 'Salvar alimento' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const lista = within(screen.getByRole('list', { name: 'Alimentos cadastrados' }))
    expect(lista.getByRole('heading', { name: 'Cuscuz da casa' })).toBeInTheDocument()
    expect(lista.getByText('Alimento · Cereais e derivados')).toBeInTheDocument()
    expect(lista.getByText('112 kcal')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Alimento “Cuscuz da casa” salvo.')
  })

  it('CA-1142 e CA-1143: sem macro não salva; energia longe dos macros avisa e desliga a chave do Cobrir', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    await usuario.type(janela.getByLabelText('Energia'), '252')
    await usuario.type(janela.getByLabelText('Proteína'), '2,2')
    await usuario.type(janela.getByLabelText('Carboidrato'), '25')
    expect(janela.queryByText(/Pelos macros, dá/)).not.toBeInTheDocument()
    await usuario.type(janela.getByLabelText('Gordura total'), '0,3')
    expect(janela.getByText('Pelos macros, dá 112 kcal; você digitou 252. Confira.')).toBeInTheDocument()
    expect(janela.getByRole('switch', { name: /Pode aparecer no Cobrir e nas trocas/ })).toBeDisabled()
    await usuario.click(janela.getByRole('button', { name: 'Salvar alimento' }))
    expect(janela.getByText(/Faltam acertar \d+ campos/)).toBeInTheDocument()
    expect(janela.getByText('O alimento precisa de um nome.')).toBeInTheDocument()
  })

  it('CA-1141: rótulo na porção mostra quanto dá por 100 g', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    await usuario.click(janela.getByRole('radio', { name: 'Rótulo' }))
    await usuario.click(janela.getByRole('radio', { name: 'Na porção' }))
    await usuario.type(janela.getByLabelText('Porção'), '30')
    await usuario.type(janela.getByLabelText('Energia'), '120')
    expect(janela.getByText('Equivale a 400 kcal por 100 g, valor usado nos cálculos do plano.')).toBeInTheDocument()
  })
})

describe('Tabela de alimentos com Meus alimentos e medidas próprias (D-385, D-387)', () => {
  it('CA-1152: o filtro "Origem" separa a base dos alimentos próprios, marcados "meu"', async () => {
    localStorage.setItem(
      'metanutri:produtos',
      JSON.stringify([{ id: 900_001, nome: 'Farofa de baru', marca: '', codigoBarras: '', porcaoG: 100, medidaCaseira: '', porPorcao: { energia_kcal: 400 }, criadoEm: '2026-10-21', tipo: 'alimento', grupo: 'Nozes e sementes', fonte: { tipo: 'rotulo' } }]),
    )
    // O provedor registra os alimentos da conta ao abrir (DP-7).
    trocarDadosEmMemoria(localStorage)
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Origem' }), 'meus')
    const lista = within(screen.getByRole('list', { name: 'Alimentos da tabela' }))
    expect(lista.getAllByRole('button')).toHaveLength(1)
    expect(lista.getByText('meu')).toBeInTheDocument()
    await usuario.click(lista.getByRole('button'))
    expect(screen.getAllByText(/^Cadastrado por você · fonte: rótulo · valores por 100/).length).toBeGreaterThan(0)
    // A ficha abre numa gaveta na tela estreita do teste; fecha antes de trocar o filtro.
    await usuario.keyboard('{Escape}')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Origem' }), 'base')
    expect(screen.getByText('597 alimentos')).toBeInTheDocument()
  })

  it('CA-1158: "+ Medida sua" na ficha cria a medida, que aparece marcada "sua"', async () => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), 'feijao carioca cozido')
    await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('button')[0] as HTMLElement)
    await usuario.click(screen.getAllByRole('button', { name: 'Medida sua' })[0] as HTMLElement)
    const janela = within(screen.getByRole('dialog', { name: 'Nova medida' }))
    await usuario.type(janela.getByLabelText('Nome da medida'), 'concha')
    await usuario.type(janela.getByLabelText('Peso'), '120')
    await usuario.click(janela.getByRole('button', { name: 'Salvar medida' }))
    expect(screen.getAllByText('concha · 120 g · sua').length).toBeGreaterThan(0)
    expect(medidasDoAlimento(561)[0]).toEqual({ nome: 'concha', gramas: 120, propria: true })
    expect(JSON.parse(localStorage.getItem('metanutri:medidas-proprias') ?? '[]')).toHaveLength(1)
  })

  it('CA-1148: "Copiar para Meus alimentos" só aparece com o formulário novo', async () => {
    const { unmount } = render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), 'feijao carioca cozido')
    await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('button')[0] as HTMLElement)
    expect(screen.queryByRole('button', { name: 'Copiar para Meus alimentos' })).not.toBeInTheDocument()
    unmount()
    render(<TelaAlimentos formularioNovo />)
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), 'feijao carioca cozido')
    await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('button')[0] as HTMLElement)
    await usuario.click(screen.getAllByRole('button', { name: 'Copiar para Meus alimentos' })[0] as HTMLElement)
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    expect(janela.getByLabelText('Nome')).toHaveValue('Feijão, carioca, cozido')
    expect(janela.getByLabelText('Fonte dos valores')).toHaveValue('copia-da-base')
  })
})
