import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ItemPlano, ModoQuantidade } from '@/domain/tipos.ts'
import { itemDeReceita, PANQUECA } from '@/domain/receitas.test-utils.ts'
import { LinhaItem } from './LinhaItem.tsx'

const MARGARINA = 263
const MANTEIGA = 261

const linha = (alimentoId: number, gramas: number) =>
  render(
    <ul>
      <LinhaItem item={{ id: 'i1', alimentoId, gramas }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
    </ul>,
  )

describe('Linha do alimento no planejador (spec revisao-geral-trabalho, D-242)', () => {
  it('CA-779: 5 g de margarina mostram "1 ponta de faca", como a folha', () => {
    linha(MARGARINA, 5)
    expect(screen.getByText('1 ponta de faca')).toBeInTheDocument()
  })

  it('CA-789 e CA-1151: alimento próprio excluído vira "Alimento excluído", com os gramas, "— kcal" e sem substituto', () => {
    render(
      <ul>
        <LinhaItem item={{ id: 'i1', alimentoId: 900_001, gramas: 40 }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} aoSubstituir={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText('Alimento excluído')).toBeInTheDocument()
    expect(screen.getByLabelText('Gramas de Alimento excluído')).toHaveValue('40')
    expect(screen.getByText('— kcal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Substituir/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover Alimento excluído' })).toBeInTheDocument()
    // Revisão de 20/10/2026: a nutricionista sabe que o paciente não vê esse item.
    expect(screen.getByText('Não aparece no plano impresso nem no link do paciente.')).toBeInTheDocument()
  })

  it('CA-984 (integracao-rodada-1910): a receita com um ingrediente apagado mostra as kcal com a †; inteira, sem †', () => {
    const comApagado = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 900_001, gramas: 20 }] }
    const { unmount } = render(
      <ul>
        <LinhaItem item={itemDeReceita('r1', 120, comApagado)} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText(/kcal/).textContent).toMatch(/^\d+ kcal†$/)
    unmount()
    render(
      <ul>
        <LinhaItem item={itemDeReceita('r2', 120)} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText(/kcal/).textContent).toMatch(/^\d+ kcal$/)
  })

  it('CB-317 (integracao-rodada-1910, revisão final M-5): receita sem ingrediente que exista avisa que não sai para o paciente', () => {
    const soApagados = { ...PANQUECA, ingredientes: [{ alimentoId: 900_001, gramas: 150 }] }
    const { unmount } = render(
      <ul>
        <LinhaItem item={itemDeReceita('r1', 120, soApagados)} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText('Não aparece no plano impresso nem no link do paciente.')).toBeInTheDocument()
    unmount()
    render(
      <ul>
        <LinhaItem item={itemDeReceita('r2', 120)} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.queryByText('Não aparece no plano impresso nem no link do paciente.')).not.toBeInTheDocument()
  })

  it('CA-780: 30 g de manteiga mostram "1 colher de sopa", nunca "1 fatia"', () => {
    linha(MANTEIGA, 30)
    expect(screen.getByText('1 colher de sopa')).toBeInTheDocument()
    expect(screen.queryByText(/fatia/)).not.toBeInTheDocument()
  })
})

describe('quantidade + medida = gramas (spec alimentos-e-gramaturas, G2, G3 e G5)', () => {
  const FEIJAO = 561
  const comMedida = (item: ItemPlano, modo: ModoQuantidade = 'medida-e-gramas') => {
    const aoMudarMedida = vi.fn()
    const aoMudarGramas = vi.fn()
    render(
      <ul>
        <LinhaItem item={item} aoMudarGramas={aoMudarGramas} aoRemover={vi.fn()} aoMudarMedida={aoMudarMedida} modo={modo} />
      </ul>,
    )
    return { aoMudarMedida, aoMudarGramas, usuario: userEvent.setup() }
  }
  const concha = { nome: 'concha', quantidade: 1.5, gramasPorMedida: 140 }

  it('CA-1118 e CA-1119: a linha mostra quantidade, medida e gramas ligados, e o que o paciente lê', () => {
    comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 210, medida: concha })
    expect(screen.getByLabelText('Quantidade de Feijão, carioca, cozido')).toHaveValue('1,5')
    const seletor = screen.getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' })
    expect(seletor).toHaveValue('concha')
    expect(within(seletor).getAllByRole('option').map((o) => o.textContent).slice(0, 4)).toEqual(['gramas', 'colher de sopa · 17 g', 'colher de servir · 35 g', 'concha · 140 g'])
    expect(screen.getByLabelText('Gramas de Feijão, carioca, cozido')).toHaveValue('210')
    expect(screen.getByText(/O paciente lê:/)).toHaveTextContent('O paciente lê: 1 concha e meia (210 g)')
  })

  it('CA-1114: mudar a quantidade ou a medida pede a medida nova; os gramas saem dela', async () => {
    const { aoMudarMedida, usuario } = comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 140, medida: { ...concha, quantidade: 1 } })
    const quantidade = screen.getByLabelText('Quantidade de Feijão, carioca, cozido')
    await usuario.clear(quantidade)
    await usuario.type(quantidade, '2')
    expect(aoMudarMedida).toHaveBeenLastCalledWith({ nome: 'concha', quantidade: 2, gramasPorMedida: 140 })
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' }), 'colher de sopa')
    expect(aoMudarMedida).toHaveBeenLastCalledWith({ nome: 'colher de sopa', quantidade: 1, gramasPorMedida: 17 })
  })

  it('CA-1115: gramas que não fecham mostram "≈", o paciente lê "cerca de" e há "Usar só gramas"', async () => {
    const { aoMudarMedida, usuario } = comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 190, medida: concha })
    expect(screen.getByText('aproximadamente')).toBeInTheDocument()
    expect(screen.getByText(/O paciente lê:/)).toHaveTextContent('190 g (cerca de 1 concha e meia)')
    await usuario.click(screen.getByRole('button', { name: 'Usar só gramas' }))
    expect(aoMudarMedida).toHaveBeenLastCalledWith(null)
  })

  it('CA-1117: sem medida escolhida, a automática aparece marcada; "Fixar a medida" guarda sem mudar os gramas', async () => {
    const { aoMudarMedida, usuario } = comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 102 }, 'medida-caseira')
    expect(screen.getByText(/O paciente lê:/)).toHaveTextContent('6 colheres de sopa · medida automática')
    await usuario.click(screen.getByRole('button', { name: 'Fixar a medida' }))
    const fixada = aoMudarMedida.mock.lastCall?.[0] as { nome: string; quantidade: number; gramasPorMedida: number }
    expect(fixada.nome).toBe('colher de sopa')
    expect(fixada.quantidade * fixada.gramasPorMedida).toBeCloseTo(102, 6)
  })

  it('CA-1238 (Importante 1 da revisão de código): com a medida automática, escolher outra medida não muda os gramas', async () => {
    const { aoMudarMedida, usuario } = comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 102 }, 'medida-caseira')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' }), 'concha')
    const escolhida = aoMudarMedida.mock.lastCall?.[0] as { nome: string; quantidade: number; gramasPorMedida: number }
    expect(escolhida.nome).toBe('concha')
    // Antes, a quantidade da automática (6) ia para a concha: 6 × 140 = 840 g.
    expect(escolhida.quantidade * escolhida.gramasPorMedida).toBeCloseTo(102, 6)
  })

  it('CA-1238: "+ Nova medida…" também mantém os gramas sem medida guardada', async () => {
    const aoMudarMedida = vi.fn()
    const aoCriarMedida = vi.fn((_alimentoId: number, aoCriar: (m: { nome: string; gramas: number }) => void) => aoCriar({ nome: 'concha da casa', gramas: 100 }))
    render(
      <ul>
        <LinhaItem
          item={{ id: 'i1', alimentoId: FEIJAO, gramas: 102 }}
          aoMudarGramas={vi.fn()}
          aoRemover={vi.fn()}
          aoMudarMedida={aoMudarMedida}
          aoCriarMedida={aoCriarMedida}
          modo="medida-caseira"
        />
      </ul>,
    )
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' }), '__nova')
    const criada = aoMudarMedida.mock.lastCall?.[0] as { nome: string; quantidade: number; gramasPorMedida: number }
    expect(criada.nome).toBe('concha da casa')
    expect(criada.quantidade * criada.gramasPorMedida).toBeCloseTo(102, 6)
  })

  it('CA-1238: com medida guardada, trocar a medida muda os gramas (CA-1114 continua)', async () => {
    const { aoMudarMedida, usuario } = comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 210, medida: concha })
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' }), 'colher de servir')
    expect(aoMudarMedida).toHaveBeenLastCalledWith({ nome: 'colher de servir', quantidade: 1.5, gramasPorMedida: 35 })
  })

  it('CA-1116: "gramas" no seletor deixa o item só em gramas', async () => {
    const { aoMudarMedida, usuario } = comMedida({ id: 'i1', alimentoId: FEIJAO, gramas: 210, medida: concha })
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Medida de Feijão, carioca, cozido' }), 'gramas')
    expect(aoMudarMedida).toHaveBeenLastCalledWith(null)
  })

  it('CB-366: alimento sem medida mostra só os gramas e diz que não há medida cadastrada', () => {
    comMedida({ id: 'i1', alimentoId: 40, gramas: 90 })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('Sem medida caseira cadastrada.')).toBeInTheDocument()
    expect(screen.getByText(/O paciente lê:/)).toHaveTextContent('90 g')
  })

  it('CA-1124: leite mostra ml no campo e no que o paciente lê', () => {
    comMedida({ id: 'i1', alimentoId: 458, gramas: 150, medida: { nome: 'copo americano', quantidade: 1, gramasPorMedida: 150 } })
    expect(screen.getByText(/O paciente lê:/)).toHaveTextContent('1 copo americano (150 ml)')
    expect(screen.getByText('ml', { selector: 'span' })).toBeInTheDocument()
  })
})
