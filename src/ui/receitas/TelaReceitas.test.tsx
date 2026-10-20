import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { CHAVE_RECEITAS, type Receita } from '@/domain/receitas.ts'
import { PANQUECA } from '@/domain/receitas.test-utils.ts'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { TelaReceitas } from './TelaReceitas.tsx'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

// O Radix Select pede ao navegador o que o jsdom não tem.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
})

const salva = (id: string, nome: string, extra: Partial<Receita> = {}): Receita => ({
  id,
  nome,
  ingredientes: PANQUECA.ingredientes,
  porcoes: PANQUECA.porcoes,
  nomeDaPorcao: PANQUECA.nomeDaPorcao,
  pesoProntoG: PANQUECA.pesoProntoG,
  preparo: PANQUECA.preparo,
  criadoEm: '2026-10-19T10:00:00.000Z',
  atualizadoEm: '2026-10-19T10:00:00.000Z',
  ...extra,
})

function montar(armazenamento: Armazenamento | null, receitas: readonly Receita[] = []) {
  if (armazenamento) armazenamento.setItem(CHAVE_RECEITAS, JSON.stringify(receitas))
  render(
    <ContextoArmazenamento.Provider value={armazenamento}>
      <TelaReceitas />
    </ContextoArmazenamento.Provider>,
  )
  return userEvent.setup()
}

const listaDeReceitas = () => screen.getByRole('list', { name: 'Receitas' })

/** Digita na busca de ingrediente e escolhe o primeiro resultado. */
async function adicionarIngrediente(usuario: ReturnType<typeof userEvent.setup>, texto: string) {
  await usuario.type(screen.getByRole('combobox', { name: 'Adicionar ingrediente' }), `${texto}{Enter}`)
}

describe('a biblioteca de receitas (spec receitas-com-calculo)', () => {
  it('CA-860: sem receita, diz que não há e oferece "Nova receita"', () => {
    montar(new Memoria())
    expect(screen.getByText('Nenhuma receita ainda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova receita' })).toBeInTheDocument()
  })

  it('CA-861 e CA-862: monta a receita, vê o valor de uma porção e salva na lista', async () => {
    const usuario = montar(new Memoria())
    await usuario.click(screen.getByRole('button', { name: 'Nova receita' }))
    expect(screen.getByRole('heading', { name: 'Nova receita' })).toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Nome'), 'Panqueca de banana')
    await adicionarIngrediente(usuario, '150 banana prata crua')
    await adicionarIngrediente(usuario, '100 ovo galinha inteiro cru')
    await adicionarIngrediente(usuario, '30 aveia flocos')
    const ingredientes = screen.getByRole('list', { name: 'Ingredientes' })
    expect(within(ingredientes).getAllByRole('listitem')).toHaveLength(3)
    // Sem o peso pronto, o campo diz quanto dá a soma.
    expect(screen.getByText('Vazio: a soma dos ingredientes, 280 g.')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Rende'), '2')
    await usuario.click(screen.getByRole('combobox', { name: 'Nome da porção' }))
    await usuario.click(screen.getByRole('option', { name: 'unidade' }))
    await usuario.type(screen.getByLabelText('Peso pronto'), '240')
    await usuario.type(screen.getByLabelText('Modo de preparo'), 'Amasse e doure.')

    const porcao = screen.getByRole('region', { name: 'Valor de uma porção' })
    expect(porcao).toHaveTextContent('Por unidade · 120 g')
    expect(porcao).toHaveTextContent('204 kcal')
    expect(porcao).toHaveTextContent('9,6 g')
    // O ovo não tem fibra na tabela: o valor leva a marca.
    expect(within(porcao).getByText(/2,9 g/)).toHaveTextContent('†')

    await usuario.click(screen.getByRole('button', { name: 'Salvar receita' }))
    const linha = within(listaDeReceitas()).getByRole('listitem')
    expect(linha).toHaveTextContent('Panqueca de banana')
    expect(linha).toHaveTextContent('Rende 2 unidades (120 g cada) · 204 kcal por unidade')
    expect(screen.getByRole('status')).toHaveTextContent('Receita “Panqueca de banana” salva.')
  })

  it('CA-861 (rodada da revisão): sem dado de energia em nenhum ingrediente, a lista diz "— kcal", nunca "0 kcal"', () => {
    montar(new Memoria(), [salva('l', 'Leite batido', { ingredientes: [{ alimentoId: 458, gramas: 200 }], porcoes: 1, nomeDaPorcao: 'copo', pesoProntoG: null })])
    const linha = within(listaDeReceitas()).getByRole('listitem')
    expect(linha).toHaveTextContent('Rende 1 copo (200 g) · — kcal por copo')
    expect(linha).not.toHaveTextContent('0 kcal')
  })

  it('CA-862: no valor da porção, o nutriente sem nenhum dado aparece como travessão', async () => {
    const usuario = montar(new Memoria(), [salva('l', 'Leite batido', { ingredientes: [{ alimentoId: 458, gramas: 200 }], porcoes: 1, nomeDaPorcao: 'copo', pesoProntoG: null })])
    await usuario.click(screen.getByRole('button', { name: 'Editar Leite batido' }))
    const porcao = screen.getByRole('region', { name: 'Valor de uma porção' })
    expect(porcao).toHaveTextContent('— kcal')
    expect(porcao).not.toHaveTextContent('0 kcal')
  })

  it('CB-270: salvar vazio não salva e diz o que falta', async () => {
    const arm = new Memoria()
    const usuario = montar(arm)
    await usuario.click(screen.getByRole('button', { name: 'Nova receita' }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar receita' }))
    expect(screen.getByText('A receita precisa de um nome.')).toBeInTheDocument()
    expect(screen.getByText('Adicione pelo menos um ingrediente.')).toBeInTheDocument()
    expect(screen.getByText('Diga quantas porções a receita rende.')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Peso pronto'), '0')
    expect(screen.getByText('O peso pronto precisa ser maior que zero.')).toBeInTheDocument()
    expect(JSON.parse(arm.getItem(CHAVE_RECEITAS) ?? '[]')).toEqual([])
  })

  it('CA-861a: nome e modo de preparo com limite e contagem visível', async () => {
    const usuario = montar(new Memoria())
    await usuario.click(screen.getByRole('button', { name: 'Nova receita' }))
    expect(screen.getByText('0/120')).toBeInTheDocument()
    expect(screen.getByText('0/4.000')).toBeInTheDocument()
    const nome = screen.getByLabelText('Nome')
    fireEvent.change(nome, { target: { value: 'a'.repeat(130) } })
    expect(nome).toHaveValue('a'.repeat(120))
    expect(screen.getByText('120/120')).toBeInTheDocument()
    const preparo = screen.getByLabelText('Modo de preparo')
    expect(preparo).toHaveAttribute('maxLength', '4000')
    fireEvent.change(preparo, { target: { value: 'b'.repeat(4100) } })
    expect(preparo).toHaveValue('b'.repeat(4000))
    expect(screen.getByText('4.000/4.000')).toBeInTheDocument()
  })

  it('cancelar volta para a lista sem salvar', async () => {
    const usuario = montar(new Memoria())
    await usuario.click(screen.getByRole('button', { name: 'Nova receita' }))
    await usuario.type(screen.getByLabelText('Nome'), 'Bolo')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Nenhuma receita ainda.')).toBeInTheDocument()
  })

  it('CA-863: editar abre a receita preenchida e salva a mudança', async () => {
    const usuario = montar(new Memoria(), [salva('a', 'Panqueca de banana')])
    await usuario.click(screen.getByRole('button', { name: 'Editar Panqueca de banana' }))
    expect(screen.getByRole('heading', { name: 'Editar receita' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Ingredientes' })).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByLabelText('Modo de preparo')).toHaveValue(PANQUECA.preparo)
    const nome = screen.getByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Panqueca fit')
    await usuario.click(screen.getByRole('button', { name: 'Salvar receita' }))
    expect(within(listaDeReceitas()).getByRole('listitem')).toHaveTextContent('Panqueca fit')
  })

  it('CB-271: no editor, o ingrediente que não existe mais diz "Alimento não encontrado", como a linha do plano', async () => {
    const usuario = montar(new Memoria(), [salva('a', 'Panqueca de banana', { ingredientes: [...PANQUECA.ingredientes, { alimentoId: 999_999, gramas: 20 }] })])
    await usuario.click(screen.getByRole('button', { name: 'Editar Panqueca de banana' }))
    expect(within(screen.getByRole('list', { name: 'Ingredientes' })).getByText('Alimento não encontrado')).toBeInTheDocument()
  })

  it('CA-864: duplicar faz "(cópia)"', async () => {
    const usuario = montar(new Memoria(), [salva('a', 'Panqueca de banana')])
    await usuario.click(screen.getByRole('button', { name: 'Mais ações de Panqueca de banana' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Duplicar' }))
    const nomes = within(listaDeReceitas()).getAllByRole('listitem').map((li) => li.querySelector('.text-heading')?.textContent)
    expect(nomes).toEqual(['Panqueca de banana', 'Panqueca de banana (cópia)'])
  })

  it('CA-865: excluir avisa que os planos continuam com a receita', async () => {
    const usuario = montar(new Memoria(), [salva('a', 'Panqueca de banana'), salva('b', 'Bolo')])
    await usuario.click(screen.getByRole('button', { name: 'Mais ações de Panqueca de banana' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Excluir' }))
    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Os planos que já usam esta receita continuam com ela.')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir receita' }))
    expect(within(listaDeReceitas()).getAllByRole('listitem')).toHaveLength(1)
    expect(listaDeReceitas()).not.toHaveTextContent('Panqueca')
  })

  it('CA-866: a busca filtra pelo nome, sem acento', async () => {
    const usuario = montar(new Memoria(), [salva('a', 'Panqueca de banana'), salva('b', 'Pão de queijo')])
    await usuario.type(screen.getByLabelText('Buscar receita'), 'pao')
    expect(within(listaDeReceitas()).getAllByRole('listitem')).toHaveLength(1)
    expect(listaDeReceitas()).toHaveTextContent('Pão de queijo')
    await usuario.clear(screen.getByLabelText('Buscar receita'))
    await usuario.type(screen.getByLabelText('Buscar receita'), 'lasanha')
    expect(screen.getByText('Nenhuma receita com esse nome.')).toBeInTheDocument()
  })

  it('CB-274: sem armazenamento, a tela avisa que as receitas valem só nesta aba', () => {
    montar(null)
    expect(screen.getByText('Este navegador não guarda dados: as receitas valem só enquanto a aba estiver aberta.')).toBeInTheDocument()
  })
})
