import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SUGESTOES_PADRAO, type SugestaoAlimento } from '@/domain/sugestoes.ts'
import { DialogoSugestoes } from './DialogoSugestoes.tsx'

const montar = (lista: readonly SugestaoAlimento[] = SUGESTOES_PADRAO.almoco, salvou = true) => {
  const aoSalvar = vi.fn<(lista: readonly SugestaoAlimento[]) => boolean>(() => salvou)
  const aoFechar = vi.fn<() => void>()
  render(<DialogoSugestoes tipo="almoco" lista={lista} aoSalvar={aoSalvar} aoFechar={aoFechar} />)
  return { usuario: userEvent.setup(), aoSalvar, aoFechar }
}

/** Ordem da lista, lida dos botões de tirar (um por item, na ordem da tela). */
const ordem = () => screen.getAllByRole('button', { name: /^Tirar / }).map((b) => (b.getAttribute('aria-label') ?? '').slice('Tirar '.length))
const campo = () => screen.getByRole('textbox', { name: 'Alimento para acrescentar' })

describe('Editar sugestões (CA-241 a CA-243, CB-70)', () => {
  it('CA-241: lista nome, medida caseira e gramas de cada sugestão', () => {
    montar()
    expect(screen.getByRole('dialog', { name: 'Sugestões para o almoço' })).toBeInTheDocument()
    expect(ordem()).toEqual([
      'Arroz, tipo 1, cozido',
      'Feijão, carioca, cozido',
      'Frango, peito, sem pele, grelhado',
      'Carne, bovina, patinho, sem gordura, grelhado',
      'Alface, crespa, crua',
      'Tomate, com semente, cru',
    ])
    expect(screen.getByText('4 colheres de sopa · 100 g')).toBeInTheDocument()
    expect(screen.getByText('1 concha · 140 g')).toBeInTheDocument()
  })

  it('CA-241: tira e muda a ordem', async () => {
    const { usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Tirar Tomate, com semente, cru' }))
    await usuario.click(screen.getByRole('button', { name: 'Descer Arroz, tipo 1, cozido' }))
    await usuario.click(screen.getByRole('button', { name: 'Subir Alface, crespa, crua' }))
    expect(ordem()).toEqual([
      'Feijão, carioca, cozido',
      'Arroz, tipo 1, cozido',
      'Frango, peito, sem pele, grelhado',
      'Alface, crespa, crua',
      'Carne, bovina, patinho, sem gordura, grelhado',
    ])
    expect(screen.getByRole('button', { name: 'Subir Feijão, carioca, cozido' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer Carne, bovina, patinho, sem gordura, grelhado' })).toBeDisabled()
  })

  it('CA-242: acrescenta com medida caseira, mostrando antes o que vai entrar', async () => {
    const { usuario } = montar()
    await usuario.type(campo(), '1 concha feijão preto')
    expect(screen.getByText(/^Vai entrar: Feijão, preto, cozido — .*140 g$/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(ordem().slice(-1)).toEqual(['Feijão, preto, cozido'])
    expect(campo()).toHaveValue('')
  })

  it('CA-242: sem medida entra em gramas, e Enter também acrescenta', async () => {
    const { usuario, aoSalvar } = montar([])
    await usuario.type(campo(), '150 arroz integral cozido{Enter}')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoSalvar).toHaveBeenCalledWith([{ alimentoId: 1, gramas: 150 }])
  })

  it('CA-242: alimento que não existe não entra, e a tela diz isso', async () => {
    const { usuario } = montar()
    await usuario.type(campo(), 'xyzabc')
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Nenhum alimento encontrado')
    expect(ordem()).toHaveLength(6)
  })

  it('CA-242: medida que não existe para o alimento não vira grama inventada', async () => {
    const { usuario } = montar([])
    await usuario.type(campo(), '1 fatia arroz tipo 1 cozido{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('A medida "fatia" não está cadastrada')
    expect(screen.getByText('A lista está vazia. A refeição vai mostrar só a busca.')).toBeInTheDocument()
  })

  it('o mesmo alimento não entra duas vezes', async () => {
    const { usuario } = montar()
    await usuario.type(campo(), 'arroz tipo 1 cozido{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Esse alimento já está na lista.')
    expect(ordem()).toHaveLength(6)
  })

  it('CA-243: Salvar entrega a lista nova e fecha', async () => {
    const { usuario, aoSalvar, aoFechar } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Tirar Alface, crespa, crua' }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoSalvar).toHaveBeenCalledTimes(1)
    expect(aoSalvar.mock.calls[0]?.[0]).toHaveLength(5)
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('CA-243: Voltar à lista padrão troca o rascunho pela padrão', async () => {
    const { usuario, aoSalvar } = montar([{ alimentoId: 561, gramas: 140 }])
    await usuario.click(screen.getByRole('button', { name: 'Voltar à lista padrão' }))
    expect(ordem()).toHaveLength(6)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoSalvar).toHaveBeenCalledWith(SUGESTOES_PADRAO.almoco)
  })

  it('CA-243: fechar sem salvar não muda nada', async () => {
    const { usuario, aoSalvar, aoFechar } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Tirar Alface, crespa, crua' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(aoSalvar).not.toHaveBeenCalled()
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('CB-70: aparelho que não guarda avisa e o diálogo fica aberto', async () => {
    const { usuario, aoFechar } = montar(SUGESTOES_PADRAO.almoco, false)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByText('Não deu para salvar neste aparelho. As sugestões continuam como estavam.')).toBeInTheDocument()
    expect(aoFechar).not.toHaveBeenCalled()
  })
})
