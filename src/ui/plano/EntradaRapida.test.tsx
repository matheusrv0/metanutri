import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntradaRapida } from './EntradaRapida.tsx'

const adicionados: { alimentoId: number; gramas: number }[] = []

beforeEach(() => {
  localStorage.clear()
  adicionados.length = 0
})

const montar = () => {
  render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })} />)
  return userEvent.setup()
}

describe('Texto-guia (spec revisao-geral-trabalho, CA-791)', () => {
  it('CA-1112: ensina um exemplo que funciona', () => {
    montar()
    expect(screen.getByRole('combobox', { name: 'Adicionar alimento' }).getAttribute('placeholder')).toMatch(/^1 concha de feijão/)
  })
})

describe('Conteúdo com o campo vazio (CA-307)', () => {
  it('aparece com o campo vazio e some enquanto se digita', async () => {
    render(
      <EntradaRapida
        rotulo="Adicionar alimento"
        aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })}
        quandoVazio={<p>Sugestões de teste</p>}
      />,
    )
    const usuario = userEvent.setup()
    const campo = screen.getByRole('combobox', { name: 'Adicionar alimento' })
    expect(screen.getByText('Sugestões de teste')).toBeInTheDocument()
    await usuario.type(campo, 'arroz')
    expect(screen.queryByText('Sugestões de teste')).not.toBeInTheDocument()
    await usuario.clear(campo)
    expect(screen.getByText('Sugestões de teste')).toBeInTheDocument()
  })

  it('CB-55: adicionar pela busca não grava mais histórico no aparelho', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), '150 arroz integral{Enter}')
    expect(adicionados).toHaveLength(1)
    expect(localStorage.getItem('metanutri:frequentes')).toBeNull()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })
})

describe('Medida que o alimento não tem (spec alimentos-e-gramaturas, correção A, D-432)', () => {
  const comMedidas = () => {
    const aoAdicionar = vi.fn()
    const aoCriarMedida = vi.fn()
    render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={aoAdicionar} aoCriarMedida={aoCriarMedida} />)
    return { aoAdicionar, aoCriarMedida, usuario: userEvent.setup(), campo: screen.getByRole('combobox', { name: 'Adicionar alimento' }) }
  }

  it('CA-1228: a linha mostra o nome inteiro e, numa linha própria embaixo, o que falta e as medidas que há', async () => {
    const { usuario, campo } = comMedidas()
    await usuario.type(campo, 'meia xícara de aveia')
    const opcao = screen.getAllByRole('option')[0]
    if (!opcao) throw new Error('sem resultado')
    const nome = within(opcao).getByText('Aveia, flocos, crua')
    // O nome não divide a linha com o aviso: o aviso vai num bloco próprio, embaixo dele.
    expect(nome.className).not.toMatch(/truncate/)
    expect(within(opcao).getByText(/^Sem “xícara de chá” · tem colher de sopa \(15 g\)/)).toBeInTheDocument()
  })

  it('CA-1229: Enter numa linha sem a medida não põe nada e diz o que fazer', async () => {
    const { aoAdicionar, usuario, campo } = comMedidas()
    await usuario.type(campo, 'meia xícara de aveia{Enter}')
    expect(aoAdicionar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Nada foi adicionado: digite em gramas ou crie a medida.')
    expect(campo).toHaveValue('meia xícara de aveia')
  })

  it('CA-1230: "+ Nova medida" cria a medida com o nome escrito e põe o alimento nela, na quantidade digitada', async () => {
    const { aoAdicionar, aoCriarMedida, usuario, campo } = comMedidas()
    await usuario.type(campo, 'meia xícara de aveia')
    await usuario.click(screen.getByRole('button', { name: 'Nova medida “xícara de chá” para Aveia, flocos, crua' }))
    expect(aoCriarMedida).toHaveBeenCalledWith(7, expect.any(Function), 'xícara de chá')
    const aoCriar = aoCriarMedida.mock.lastCall?.[1] as (m: { nome: string; gramas: number }) => void
    act(() => aoCriar({ nome: 'xícara de chá', gramas: 80 }))
    expect(aoAdicionar).toHaveBeenCalledWith(7, 40, { nome: 'xícara de chá', quantidade: 0.5, gramasPorMedida: 80 })
    expect(campo).toHaveValue('')
  })

  it('CA-1258: "1 banana nanica" oferece criar a unidade', async () => {
    const { aoAdicionar, usuario, campo } = comMedidas()
    await usuario.type(campo, '1 banana nanica')
    expect(screen.getByRole('button', { name: 'Nova medida “unidade” para Banana, nanica, crua' })).toBeInTheDocument()
    await usuario.keyboard('{Enter}')
    expect(aoAdicionar).not.toHaveBeenCalled()
  })
})

describe('Honestidade do dado', () => {
  it('alimento sem energia na tabela mostra travessão, não zero', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), 'coco verde')
    const opcao = screen.getAllByRole('option').find((o) => o.textContent?.includes('Coco,  verde, cru'))
    expect(opcao).toBeDefined()
    expect(opcao?.textContent).toContain('— kcal')
    expect(opcao?.textContent).not.toContain('0 kcal')
  })

  it('alimento com dado faltando sai marcado na lista', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), 'coco verde')
    const opcao = screen.getAllByRole('option').find((o) => o.textContent?.includes('Coco,  verde, cru'))
    expect(opcao?.textContent).toMatch(/(parte dos|poucos) nutrientes/)
  })
})
