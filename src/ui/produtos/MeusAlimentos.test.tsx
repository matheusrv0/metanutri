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
    expect(janela.getByText(/^Falta acertar \d+ campos\. Eles estão marcados\.$/)).toBeInTheDocument()
    expect(janela.getByText('O alimento precisa de um nome.')).toBeInTheDocument()
  })

  it('CA-1364 (D-499): com um campo só a acertar, o resumo fala no singular', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    await usuario.type(janela.getByLabelText('Nome'), 'Cuscuz da casa')
    await usuario.selectOptions(janela.getByLabelText('Grupo'), 'Cereais e derivados')
    await usuario.selectOptions(janela.getByLabelText('Como é servido'), 'cozido')
    await usuario.type(janela.getByLabelText('Energia'), '112')
    await usuario.type(janela.getByLabelText('Proteína'), '2,2')
    await usuario.type(janela.getByLabelText('Gordura total'), '0,3')
    await usuario.selectOptions(janela.getByLabelText('Fonte dos valores'), 'laboratorio')
    await usuario.click(janela.getByRole('button', { name: 'Salvar alimento' }))
    expect(janela.getByText('Falta acertar um campo. Ele está marcado.')).toBeInTheDocument()
    expect(janela.getByText('Informe o carboidrato: sem ele, o alimento não entra nos cálculos.')).toBeInTheDocument()
  })

  it('CA-1365 (D-499): o limite da conta aparece com ponto de milhar', () => {
    localStorage.setItem('metanutri:produtos', JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: 900_000 + i, nome: `A${i}`, porcaoG: 100, porPorcao: {}, criadoEm: 'x' }))))
    render(<TelaProdutos formularioNovo />)
    expect(screen.getByText('Você chegou a 1.000 alimentos, o limite da conta. Exclua um que não usa mais para cadastrar outro.')).toBeInTheDocument()
  })

  it('CA-1356 (D-493): com gordura trans ou nome de doce, a chave do Cobrir fica travada e diz o motivo', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    const chave = () => janela.getByRole('switch', { name: /Pode aparecer no Cobrir e nas trocas/ })
    await usuario.type(janela.getByLabelText('Nome'), 'Mistura da casa')
    await usuario.selectOptions(janela.getByLabelText('Grupo'), 'Cereais e derivados')
    await usuario.type(janela.getByLabelText('Energia'), '112')
    await usuario.type(janela.getByLabelText('Proteína'), '2,2')
    await usuario.type(janela.getByLabelText('Carboidrato'), '25')
    await usuario.type(janela.getByLabelText('Gordura total'), '0,3')
    expect(chave()).toBeEnabled()
    await usuario.type(janela.getByLabelText('Gordura trans'), '0,6')
    expect(chave()).toBeDisabled()
    expect(janela.getByText('Não entra no Cobrir nem nas trocas: gordura trans declarada.')).toBeInTheDocument()
    await usuario.clear(janela.getByLabelText('Gordura trans'))
    expect(chave()).toBeEnabled()
    await usuario.clear(janela.getByLabelText('Nome'))
    await usuario.type(janela.getByLabelText('Nome'), 'Bolo de chocolate da vó')
    expect(chave()).toBeDisabled()
    expect(janela.getByText('Não entra no Cobrir nem nas trocas: doce.')).toBeInTheDocument()
  })

  it('CA-1360 (D-496): a medida com número mostra a leitura antes de salvar', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    await usuario.click(janela.getByRole('button', { name: 'Adicionar medida' }))
    await usuario.type(janela.getByLabelText('Nome da medida 1'), '2 fatias')
    await usuario.type(janela.getByLabelText('Peso da medida 1'), '50')
    expect(janela.getByText('Fica fatia · 25 g.')).toBeInTheDocument()
    await usuario.clear(janela.getByLabelText('Nome da medida 1'))
    await usuario.type(janela.getByLabelText('Nome da medida 1'), 'fatia')
    expect(janela.queryByText(/^Fica /)).not.toBeInTheDocument()
  })

  it('CA-1361 e CA-1362 (D-497): "1.200" é milhar; "Tr" e "3 g" marcam o campo e não salvam', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    await usuario.type(janela.getByLabelText('Nome'), 'Cuscuz da casa')
    await usuario.selectOptions(janela.getByLabelText('Grupo'), 'Cereais e derivados')
    await usuario.selectOptions(janela.getByLabelText('Como é servido'), 'cozido')
    await usuario.type(janela.getByLabelText('Energia'), '112')
    await usuario.type(janela.getByLabelText('Proteína'), '3 g')
    await usuario.type(janela.getByLabelText('Carboidrato'), '25')
    await usuario.type(janela.getByLabelText('Gordura total'), '0,3')
    await usuario.type(janela.getByLabelText('Sódio'), '1.200')
    await usuario.type(janela.getByLabelText('Fibra alimentar'), 'Tr')
    await usuario.selectOptions(janela.getByLabelText('Fonte dos valores'), 'laboratorio')
    await usuario.click(janela.getByRole('button', { name: 'Salvar alimento' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(janela.getAllByText('Digite só o número, sem a unidade. Traço: 0.')).toHaveLength(2)
    expect(janela.queryByText(/^Informe a proteína/)).not.toBeInTheDocument()
    await usuario.clear(janela.getByLabelText('Proteína'))
    await usuario.type(janela.getByLabelText('Proteína'), '2.2')
    await usuario.clear(janela.getByLabelText('Fibra alimentar'))
    await usuario.type(janela.getByLabelText('Fibra alimentar'), '0')
    await usuario.click(janela.getByRole('button', { name: 'Salvar alimento' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [gravado] = JSON.parse(localStorage.getItem('metanutri:produtos') ?? '[]') as { porPorcao: Record<string, number | null> }[]
    expect(gravado?.porPorcao).toMatchObject({ sodio_mg: 1200, proteina_g: 2.2, fibra_g: 0 })
  })

  it('CA-1368 (D-502): a medida sem nome e a de peso 0 ficam marcadas, cada uma no seu campo', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    await usuario.click(janela.getByRole('button', { name: 'Adicionar medida' }))
    await usuario.click(janela.getByRole('button', { name: 'Adicionar medida' }))
    expect(janela.getByLabelText('Nome da medida 1')).toHaveAttribute('placeholder', 'ex.: fatia')
    await usuario.type(janela.getByLabelText('Peso da medida 1'), '30')
    await usuario.type(janela.getByLabelText('Nome da medida 2'), 'fatia')
    await usuario.click(janela.getByRole('button', { name: 'Salvar alimento' }))
    expect(janela.getByLabelText('Nome da medida 1')).toHaveAttribute('aria-invalid', 'true')
    expect(janela.getByLabelText('Peso da medida 1')).not.toHaveAttribute('aria-invalid')
    expect(janela.getByLabelText('Peso da medida 2')).toHaveAttribute('aria-invalid', 'true')
    expect(janela.getByText('Dê um nome à medida.')).toBeInTheDocument()
    expect(janela.getByText('Peso maior que 0 e até 2.000 g.')).toBeInTheDocument()
  })

  it('CA-1363 (D-498): o item antigo sem medida caseira abre, edita, salva e exclui', async () => {
    localStorage.setItem('metanutri:produtos', JSON.stringify([{ id: 900_000, nome: 'Iogurte da fazenda', marca: 'Sítio', porcaoG: 170, porPorcao: { energia_kcal: 110, proteina_g: 6, carboidrato_g: 8, lipideos_g: 6 } }]))
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    const lista = within(screen.getByRole('list', { name: 'Alimentos cadastrados' }))
    expect(lista.getByRole('heading', { name: 'Iogurte da fazenda' })).toBeInTheDocument()
    await usuario.click(lista.getByRole('button', { name: 'Editar Iogurte da fazenda' }))
    const janela = within(screen.getByRole('dialog', { name: 'Editar alimento' }))
    expect(janela.getByLabelText('Medida caseira da porção')).toHaveValue('')
    await usuario.selectOptions(janela.getByLabelText('Grupo'), 'Leite e derivados')
    await usuario.click(janela.getByRole('button', { name: 'Salvar alterações' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Alimento “Iogurte da fazenda” salvo.')
    await usuario.click(screen.getByRole('button', { name: 'Excluir Iogurte da fazenda' }))
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir alimento' }))
    expect(screen.queryByRole('list', { name: 'Alimentos cadastrados' })).not.toBeInTheDocument()
  })

  it('CA-1366 (D-500): só o tipo Rótulo tem a linha do que a rotulagem também obriga', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    const linha = 'A rotulagem também obriga açúcares adicionados; eles não entram no cálculo do plano. Gordura trans acima de zero tira o alimento do Cobrir e das trocas.'
    expect(janela.queryByText(linha)).not.toBeInTheDocument()
    await usuario.click(janela.getByRole('radio', { name: 'Preparação' }))
    expect(janela.queryByText(linha)).not.toBeInTheDocument()
    await usuario.click(janela.getByRole('radio', { name: 'Rótulo' }))
    expect(janela.getByText(linha)).toBeInTheDocument()
    // A linha não cita a norma pelo número.
    expect(janela.queryByText(/RDC/)).not.toBeInTheDocument()
  })

  it('CA-1369 (D-503): com a medida da porção lida, a lista de medidas diz que ela já vale', async () => {
    render(<TelaProdutos formularioNovo />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Novo alimento' }))
    const janela = within(screen.getByRole('dialog', { name: 'Novo alimento' }))
    expect(janela.getByText('Nenhuma medida. Sem ela, o paciente lê o peso.')).toBeInTheDocument()
    await usuario.click(janela.getByRole('radio', { name: 'Rótulo' }))
    await usuario.click(janela.getByRole('radio', { name: 'Na porção' }))
    await usuario.type(janela.getByLabelText('Porção'), '40')
    await usuario.type(janela.getByLabelText('Medida caseira da porção'), '4 colheres de sopa')
    expect(janela.getByText('A medida da porção (colher de sopa · 10 g) já vale. Acrescente outras, se quiser.')).toBeInTheDocument()
    expect(janela.queryByText('Nenhuma medida. Sem ela, o paciente lê o peso.')).not.toBeInTheDocument()
    // CA-1370 (D-504): trocar para "Por 100 g" leva a medida para a lista.
    await usuario.click(janela.getByRole('radio', { name: 'Por 100 g' }))
    expect(janela.getByLabelText('Nome da medida 1')).toHaveValue('colher de sopa')
    expect(janela.getByLabelText('Peso da medida 1')).toHaveValue('10')
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
    const { unmount } = render(<TelaAlimentos formularioNovo={false} />)
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
