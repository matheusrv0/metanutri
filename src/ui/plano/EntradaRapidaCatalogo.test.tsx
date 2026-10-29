// Spec base-ampliada, fase 2: o catálogo de rótulos na entrada rápida (CA-1755 a CA-1757, CA-1764, CB-750 e CB-751).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ArquivoFatia, ArquivoIndice } from '@/domain/catalogoOff.ts'
import { criarRepositorioProdutos } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { prepararCatalogoParaTeste, VERSAO_DO_CATALOGO } from '../estado/catalogoOff.ts'
import { EntradaRapida } from './EntradaRapida.tsx'

const INDICE: ArquivoIndice = {
  versao: VERSAO_DO_CATALOGO,
  campos: ['codigo', 'nome', 'marca', 'porcaoG', 'porcaoTexto', 'ml', 'kcal'],
  produtos: [['7891000100103', 'Iogurte Natural Integral Cremoso', 'Nestlé', 170, '1 pote (170 g)', 0, 60]],
}
const FATIA: ArquivoFatia = { chaves: ['energia_kcal', 'proteina_g', 'lipideos_g', 'carboidrato_g'], produtos: { '7891000100103': [60, 4, 3, 5] } }

const adicionados: { alimentoId: number; gramas: number }[] = []
let pedidos: string[] = []

function servidor(falha: 'indice' | 'fatia' | null = null) {
  pedidos = []
  prepararCatalogoParaTeste({
    buscar: (caminho) => {
      pedidos.push(caminho)
      if (falha === 'indice' && caminho.endsWith('indice.json')) return Promise.reject(new Error('sem rede'))
      if (falha === 'fatia' && caminho.includes('fatias')) return Promise.reject(new Error('sem rede'))
      return Promise.resolve(caminho.endsWith('indice.json') ? INDICE : FATIA)
    },
  })
}

beforeEach(() => {
  localStorage.clear()
  adicionados.length = 0
})
afterEach(() => {
  prepararCatalogoParaTeste({ automatico: false })
  // A cópia de um teste não pode ficar na busca do próximo.
  registrarProdutos([])
})

const montar = () => {
  render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })} />)
  return { usuario: userEvent.setup(), campo: screen.getByRole('combobox', { name: 'Adicionar alimento' }) }
}
const copias = () => criarRepositorioProdutos(armazenamentoLocal()).listar()

describe('o catálogo na entrada rápida', () => {
  it('CA-1764 e CB-753: com menos de 3 letras, nada do catálogo é pedido', async () => {
    servidor()
    const { usuario, campo } = montar()
    await usuario.type(campo, 'io')
    expect(pedidos).toEqual([])
  })

  it('CA-1755: o produto vem depois dos alimentos da base, com a marca, a porção e a marca "rótulo"', async () => {
    servidor()
    const { usuario, campo } = montar()
    await usuario.type(campo, '170 iogurte natural')
    const lista = screen.getByRole('listbox', { name: 'Resultados para Adicionar alimento' })
    const produto = await within(lista).findByRole('option', { name: /Iogurte Natural Integral Cremoso/ })
    expect(produto).toHaveTextContent('rótulo')
    expect(produto).toHaveTextContent('Nestlé · 1 pote (170 g)')
    // D-764: as kcal por 100 g diferenciam os produtos parecidos.
    expect(produto).toHaveTextContent('60 kcal/100 g')
    const opcoes = within(lista).getAllByRole('option')
    expect(opcoes.indexOf(produto)).toBe(opcoes.length - 1)
    expect(opcoes.length).toBeGreaterThan(1)
  })

  it('CA-1756 e CA-1757: escolher grava uma cópia em Meus alimentos e põe a cópia no plano; de novo, a mesma cópia', async () => {
    servidor()
    const { usuario, campo } = montar()
    await usuario.type(campo, '170 iogurte natural integral cremoso')
    await usuario.click(await screen.findByRole('option', { name: /Iogurte Natural Integral Cremoso/ }))
    await waitFor(() => expect(adicionados).toHaveLength(1))
    const [copia] = copias()
    expect(copia).toMatchObject({ nome: 'Iogurte Natural Integral Cremoso', marca: 'Nestlé', codigoBarras: '7891000100103', fonte: { tipo: 'open-food-facts', codigo: '7891000100103', data: VERSAO_DO_CATALOGO } })
    expect(copia?.sugerirAutomaticamente).toBe(false)
    expect(adicionados[0]).toEqual({ alimentoId: copia?.id, gramas: 170 })

    // A cópia já está na conta: a linha do catálogo não se repete, e a cópia aparece como "meu".
    await usuario.type(campo, 'iogurte natural integral cremoso')
    const lista = screen.getByRole('listbox', { name: 'Resultados para Adicionar alimento' })
    await waitFor(() => expect(within(lista).getAllByRole('option', { name: /Iogurte Natural Integral Cremoso/ })).toHaveLength(1))
    expect(within(lista).getByRole('option', { name: /Iogurte Natural Integral Cremoso/ })).toHaveTextContent('meu')
    expect(copias()).toHaveLength(1)
  })

  it('o produto que só o catálogo tem não vem com o aviso de "nenhum alimento encontrado"', async () => {
    servidor()
    const { usuario, campo } = montar()
    await usuario.type(campo, 'cremoso integral')
    await screen.findByRole('option', { name: /Iogurte Natural Integral Cremoso/ })
    expect(screen.queryByText(/Nenhum alimento encontrado/)).not.toBeInTheDocument()
  })

  it('D-767: o catálogo espera cerca de 150 ms depois da última tecla para buscar de novo', async () => {
    servidor()
    const { usuario, campo } = montar()
    await usuario.type(campo, 'iogurte natural')
    expect(await screen.findByRole('option', { name: /Iogurte Natural Integral Cremoso/ })).toBeInTheDocument()
    // Logo depois da tecla, a lista do catálogo ainda é a de antes; passada a espera, é a do texto novo.
    await usuario.type(campo, ' xyz')
    expect(screen.queryByRole('option', { name: /Iogurte Natural Integral Cremoso/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('option', { name: /Iogurte Natural Integral Cremoso/ })).not.toBeInTheDocument())
  })

  it('CB-750: sem o índice, a busca segue com a base e uma linha diz que os produtos de marca precisam de internet', async () => {
    servidor('indice')
    const { usuario, campo } = montar()
    await usuario.type(campo, 'iogurte')
    expect(await screen.findByText('Os produtos de marca precisam de internet no primeiro uso.')).toBeInTheDocument()
    expect(within(screen.getByRole('listbox', { name: 'Resultados para Adicionar alimento' })).getAllByRole('option').length).toBeGreaterThan(0)
  })

  it('D-767: limpar o campo tira a lista do catálogo na hora, sem esperar', async () => {
    servidor()
    const { usuario, campo } = montar()
    await usuario.type(campo, 'iogurte natural')
    await screen.findByRole('option', { name: /Iogurte Natural Integral Cremoso/ })
    await usuario.clear(campo)
    expect(screen.queryByRole('option', { name: /Iogurte Natural Integral Cremoso/ })).not.toBeInTheDocument()
  })

  it('D-768: com Meus alimentos no limite de 1.000, a linha diz o limite, não "Tente de novo"', async () => {
    servidor()
    const cheio = Array.from({ length: 1000 }, (_, i) => ({ id: 900_000 + i, codigoBarras: '', nome: `Alimento ${i}`, marca: '', porcaoG: 100, medidaCaseira: '', porPorcao: {}, criadoEm: '2026-10-29' }))
    localStorage.setItem('metanutri:produtos', JSON.stringify(cheio))
    const { usuario, campo } = montar()
    await usuario.type(campo, 'iogurte natural integral cremoso')
    await usuario.click(await screen.findByRole('option', { name: /Iogurte Natural Integral Cremoso/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/limite da conta/)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/Tente de novo/)
    expect(adicionados).toEqual([])
  })

  it('CB-751: a fatia que não vem não põe nada nem grava cópia pela metade', async () => {
    servidor('fatia')
    const { usuario, campo } = montar()
    await usuario.type(campo, 'iogurte natural integral cremoso')
    await usuario.click(await screen.findByRole('option', { name: /Iogurte Natural Integral Cremoso/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o produto. Tente de novo.')
    expect(adicionados).toEqual([])
    expect(copias()).toEqual([])
  })
})
