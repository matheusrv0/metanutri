import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { TelaAdequacao } from './TelaAdequacao.tsx'

let n = 0
const ids = () => `id${++n}`

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }

function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 200 }, ids)
}

function Anfitriao({ inicial, planoInicial }: { readonly inicial?: Partial<Caso>; readonly planoInicial?: Plano }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  const [plano, setPlano] = useState<Plano>(planoInicial ?? criarPlanoPadrao(ids))
  return (
    <TelaAdequacao
      caso={caso}
      plano={plano}
      gastoEnergetico={1800}
      aoAlterarCaso={(m) => setCaso((c) => ({ ...c, ...m }))}
      aoAlterarPlano={setPlano}
      gerarId={ids}
    />
  )
}

const montar = (inicial: Partial<Caso> = adulta, planoInicial?: Plano) => {
  render(<Anfitriao inicial={inicial} {...(planoInicial ? { planoInicial } : {})} />)
  return userEvent.setup()
}

const linhaDe = (nutriente: string) => {
  const celula = screen.getByText(nutriente)
  const linha = celula.closest('tr')
  if (!linha) throw new Error(`linha de ${nutriente} não encontrada`)
  return within(linha)
}

const primeiraSugestao = (gaveta: ReturnType<typeof within>) => {
  const item = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')[0]
  if (!item) throw new Error('sem sugestões')
  return item
}

const abrirCobrir = async (usuario: ReturnType<typeof userEvent.setup>, nutriente: string) => {
  await usuario.click(linhaDe(nutriente).getByRole('button', { name: 'Cobrir' }))
  return within(screen.getByRole('dialog'))
}

describe('Etapa 3: adequação', () => {
  it('CA-25 e CA-33: lista os micronutrientes com total, referência, adequação, estado e fontes', () => {
    montar(adulta, planoComArroz())
    expect(screen.getByRole('columnheader', { name: 'Nutriente' })).toBeInTheDocument()
    const ferro = linhaDe('Ferro')
    expect(ferro.getAllByText(/mg$/).length).toBeGreaterThan(0)
    expect(ferro.getByText(/% \(meta/)).toBeInTheDocument()
    expect(ferro.getByText(/Abaixo da meta|Adequado|Acima do limite superior/)).toBeInTheDocument()
    expect(screen.getByText(/^Composição: /)).toBeInTheDocument()
    expect(screen.getByText(/^Referências de ingestão: /)).toBeInTheDocument()
  })

  it('CA-26 e CA-27: preset individual usa RDA e coletivo usa EAR', async () => {
    const usuario = montar(adulta, planoComArroz())
    expect(linhaDe('Ferro').getByText('rda')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Individual (RDA, 90%)' })).toHaveAttribute('aria-checked', 'true')

    await usuario.click(screen.getByRole('radio', { name: 'Coletivo (EAR, 50%)' }))
    expect(linhaDe('Ferro').getByText('ear')).toBeInTheDocument()
    expect(linhaDe('Ferro').getByText(/meta 50%/)).toBeInTheDocument()
  })

  it('CA-28: preset personalizado aceita referência e mínimo próprios', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    await usuario.click(screen.getByRole('radio', { name: 'EAR' }))
    const minimo = screen.getByLabelText('Mínimo da meta')
    await usuario.clear(minimo)
    await usuario.type(minimo, '70')
    expect(linhaDe('Ferro').getByText(/meta 70%/)).toBeInTheDocument()
  })

  it('CA-29: nutriente sem RDA nem EAR mostra referência AI', () => {
    montar(adulta, planoComArroz())
    expect(screen.getAllByText('ai').length).toBeGreaterThan(0)
  })

  it('CA-32: nutriente com alimentos sem dado avisa que o total é subestimado', () => {
    montar(adulta, planoComArroz())
    const marcas = screen.getAllByTitle(/total possivelmente subestimado/)
    expect(marcas.length).toBeGreaterThan(0)
    expect(marcas[0]).toHaveTextContent("†")
    expect(screen.getByText(/Falta de dado nunca entra como zero/)).toBeInTheDocument()
  })

  it('CB-05: plano vazio mostra 0% e o cobrir continua funcionando', async () => {
    const usuario = montar()
    expect(linhaDe('Ferro').getByText(/^0% \(meta/)).toBeInTheDocument()
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    expect(gaveta.getByText(/Faltam .* mg para a meta/)).toBeInTheDocument()
  })

  it('CA-34 a CA-36: sugestões trazem porção, cobertura e kcal', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    const sugestoes = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    expect(sugestoes.length).toBeGreaterThan(0)
    expect(sugestoes.length).toBeLessThanOrEqual(5)
    expect(sugestoes[0]?.textContent).toMatch(/cobre \d+% da falta/)
    expect(sugestoes[0]?.textContent).toMatch(/kcal/)
  })

  it('CA-38: escolher a refeição e confirmar adiciona o alimento e recalcula', async () => {
    const usuario = montar(adulta, planoComArroz())
    const antes = linhaDe('Ferro').getByText(/% \(meta/).textContent
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    await usuario.selectOptions(gaveta.getByLabelText('Adicionar em'), gaveta.getByRole('option', { name: /Jantar/ }))
    await usuario.click(within(primeiraSugestao(gaveta)).getByRole('button', { name: 'Adicionar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(linhaDe('Ferro').getByText(/% \(meta/).textContent).not.toBe(antes)
  })

  it('CA-40: sugestão oculta não volta a aparecer', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    const lista = () => within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' })).getAllByRole('listitem')
    const primeiro = lista()[0]?.textContent ?? ''

    await usuario.click(within(primeiraSugestao(gaveta)).getByRole('button', { name: /^Ocultar/ }))
    expect(lista()[0]?.textContent).not.toBe(primeiro)
  })

  it('CA-36a: incluir ingredientes muda a lista de sugestões', async () => {
    const usuario = montar(adulta, planoComArroz())
    const gaveta = await abrirCobrir(usuario, 'Ferro')
    const antes = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)

    await usuario.click(gaveta.getByRole('switch', { name: 'Incluir ingredientes e alimentos crus' }))
    const depois = within(gaveta.getByRole('list', { name: 'Sugestões para cobrir' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(depois).not.toEqual(antes)
  })
})
