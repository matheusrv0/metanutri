import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { ResumoDoDia } from './ResumoDoDia.tsx'

let n = 0
const ids = () => `id${++n}`

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }

/** Plano com arroz cozido (id 1) em quantidade grande, para ter kcal e macros. */
function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('plano sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 1, gramas: 300 }, ids)
}

function Anfitriao({ inicial, plano }: { readonly inicial?: Partial<Caso>; readonly plano?: Plano }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <ResumoDoDia caso={caso} plano={plano ?? criarPlanoPadrao(ids)} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
}

const montar = (inicial?: Partial<Caso>, plano?: Plano) => {
  render(<Anfitriao {...(inicial ? { inicial } : {})} {...(plano ? { plano } : {})} />)
  return userEvent.setup()
}

const resumo = () => within(screen.getByRole('region', { name: 'Resumo do dia' }))
const abrirAjustes = async (usuario: ReturnType<typeof userEvent.setup>) => usuario.click(screen.getByRole('button', { name: 'Ajustar' }))

describe('Resumo do dia', () => {
  it('CA-06 e CA-07: TMB por Mifflin e GET pelo fator de atividade', async () => {
    const usuario = montar(adulta)
    // Mifflin para mulher de 28 anos, 60 kg, 165 cm: 1330 kcal; fator 1,2 → 1596 kcal
    expect(resumo().getByText('1.330 kcal')).toBeInTheDocument()
    expect(resumo().getByText('1.596 kcal')).toBeInTheDocument()

    await abrirAjustes(usuario)
    await usuario.click(screen.getByRole('radio', { name: /Moderadamente ativo/ }))
    expect(resumo().getByText('2.062 kcal')).toBeInTheDocument()
  })

  it('CA-06: trocar para Harris-Benedict muda a TMB', async () => {
    const usuario = montar(adulta)
    await abrirAjustes(usuario)
    await usuario.click(screen.getByRole('radio', { name: 'Harris-Benedict' }))
    expect(resumo().getByText('1.403 kcal')).toBeInTheDocument()
  })

  it('CA-08: fator próprio entra no GET', async () => {
    const usuario = montar(adulta)
    await abrirAjustes(usuario)
    const campo = screen.getByLabelText('Fator próprio')
    await usuario.clear(campo)
    await usuario.type(campo, '1,45')
    expect(resumo().getByText('1.929 kcal')).toBeInTheDocument()
  })

  it('CA-09: GET manual substitui o calculado e a tela avisa', async () => {
    const usuario = montar(adulta)
    await abrirAjustes(usuario)
    await usuario.type(screen.getByLabelText('GET manual'), '1800')
    expect(resumo().getByText('GET definido manualmente')).toBeInTheDocument()
    expect(resumo().getByText('1.800 kcal')).toBeInTheDocument()
  })

  it('CA-06a: criança não recebe Mifflin nem Harris-Benedict', async () => {
    const usuario = montar({ sexo: 'M', idadeAnos: 8, pesoKg: 25, estaturaCm: 128 })
    await abrirAjustes(usuario)
    expect(screen.queryByRole('radio', { name: 'Harris-Benedict' })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Nível de atividade' })).toBeInTheDocument()
  })

  it('CA-06c e CA-06d: lactante mostra o adicional da lactação e a categoria de atividade', () => {
    montar({ ...adulta, condicao: { tipo: 'lactante', mesesPosParto: 3 } })
    expect(resumo().getByText(/lactação|leite/i)).toBeInTheDocument()
    expect(resumo().getByText(/inativo/)).toBeInTheDocument()
  })

  it('CA-10 e CA-681: kcal do plano, alvo e uma frase só com o % do GET e a faixa, sem selo', () => {
    montar(adulta, planoComArroz())
    expect(resumo().getByText('371 kcal')).toBeInTheDocument()
    expect(resumo().getByText('GET calculado')).toBeInTheDocument()
    expect(resumo().getByText('23% do GET, abaixo de 90%')).toHaveClass('text-warningtext')
    expect(resumo().queryByText('Abaixo de 90%')).not.toBeInTheDocument()
    expect(resumo().getByRole('progressbar')).toBeInTheDocument()
  })

  it('CA-22, CA-23 e CA-682: macros em gramas e % sem casa, g/kg só na proteína, frase e meta curta', () => {
    montar(adulta, planoComArroz())
    expect(resumo().getByText('8 g · 8% · 0,13 g/kg')).toBeInTheDocument()
    expect(resumo().getAllByText(/^\d+ g · \d+%$/)).toHaveLength(2)
    expect(resumo().getByText('10 a 35%')).toBeInTheDocument()
    expect(resumo().getByText('45 a 65%')).toBeInTheDocument()
    expect(resumo().getByText('20 a 35%')).toBeInTheDocument()
    expect(resumo().queryByText(/Meta:/)).not.toBeInTheDocument()
    // "faixa da idade" só dentro de "Ver cálculo".
    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    const conteudo = document.getElementById(verCalculo.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(resumo().getAllByText(/faixa da idade/).every((el) => conteudo.contains(el))).toBe(true)
    // O estado sai como frase do medidor: dentro, faltam X, quase lá, acima, passou de leve.
    expect(resumo().getAllByText(/Dentro da faixa|para a faixa|Quase lá|acima da faixa|Passou de leve/).length).toBe(3)
  })

  it('CA-24 e CA-683: "Ajustar" leva às metas dos macros, e a meta própria aparece como sua', async () => {
    const usuario = montar(adulta, planoComArroz())
    await abrirAjustes(usuario)
    await usuario.click(resumo().getByRole('button', { name: 'Metas de macronutrientes' }))
    const janela = within(screen.getByRole('dialog', { name: 'Metas de macronutrientes' }))
    await usuario.click(janela.getByRole('radio', { name: 'g/kg de peso' }))
    await usuario.type(janela.getByLabelText('Proteína: mínimo'), '1,2')
    await usuario.type(janela.getByLabelText('Proteína: máximo'), '1,6')
    await usuario.click(janela.getByRole('button', { name: 'Salvar metas' }))

    expect(resumo().getByText('1,2 a 1,6 g/kg · sua meta')).toBeInTheDocument()
    expect(resumo().getByText('faixa da idade e suas metas')).toBeInTheDocument()
  })

  it('CA-683: no modo rápido, "Ajustar" mostra a meta de energia e as metas dos macros', async () => {
    const usuario = montar({ ...adulta, modo: 'rapido' })
    await abrirAjustes(usuario)
    expect(resumo().getByLabelText('Meta de energia')).toBeInTheDocument()
    expect(resumo().getByRole('button', { name: 'Metas de macronutrientes' })).toBeInTheDocument()
  })

  it('CA-684: "Ver cálculo" traz carboidrato e gordura em g/kg e a origem das metas', async () => {
    const usuario = montar(adulta, planoComArroz())
    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    await usuario.click(verCalculo)
    const conteudo = within(document.getElementById(verCalculo.getAttribute('aria-controls') ?? '') as HTMLElement)
    expect(conteudo.getByText('TMB')).toBeInTheDocument()
    expect(conteudo.getByText('Carboidrato no plano').nextElementSibling?.textContent).toMatch(/^\d+,\d{2} g\/kg$/)
    expect(conteudo.getByText('Gordura no plano').nextElementSibling?.textContent).toMatch(/^\d+,\d{2} g\/kg$/)
    expect(conteudo.getByText('Metas dos macronutrientes').nextElementSibling).toHaveTextContent('faixa da idade')
  })

  it('CB-206: sem peso, nenhum g/kg', () => {
    montar({ sexo: 'F', idadeAnos: 28, estaturaCm: 165 }, planoComArroz())
    expect(resumo().queryByText(/g\/kg/)).not.toBeInTheDocument()
  })

  it('CA-11: mudar o fator não altera o plano', async () => {
    const plano = planoComArroz()
    const usuario = montar(adulta, plano)
    await abrirAjustes(usuario)
    await usuario.click(screen.getByRole('radio', { name: /Muito ativo/ }))
    expect(resumo().getByText('371 kcal')).toBeInTheDocument()
    expect(plano.refeicoes[2]?.opcoes.principal).toHaveLength(1)
  })

  it('CB-01: sem peso, a energia não é calculada e o painel explica', () => {
    montar({ sexo: 'F', idadeAnos: 28 })
    expect(resumo().getByText(/Informe/)).toBeInTheDocument()
    expect(resumo().getByText('—')).toBeInTheDocument()
  })
})

describe('Resumo do dia num cartão só (CA-333, CA-680)', () => {
  it('energia e macronutrientes no mesmo cartão, um botão só, e a conta recolhida em "Ver cálculo"', async () => {
    const usuario = montar(adulta)
    const cartao = screen.getByText('Resumo do dia').closest('[data-slot="card"]')
    expect(cartao).not.toBeNull()
    const noCartao = within(cartao as HTMLElement)
    expect(noCartao.getByText('Proteína')).toBeInTheDocument()
    expect(noCartao.getAllByText('Gordura').length).toBeGreaterThan(0)
    expect(noCartao.queryByText('Macronutrientes')).not.toBeInTheDocument()
    expect(noCartao.queryByRole('button', { name: 'Metas' })).not.toBeInTheDocument()
    expect(noCartao.getAllByRole('button').map((b) => b.textContent)).toEqual(['Ajustar', 'Ver cálculo'])

    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    const conteudo = document.getElementById(verCalculo.getAttribute('aria-controls') ?? '')
    expect(verCalculo).toHaveAttribute('aria-expanded', 'false')
    expect(conteudo).toHaveAttribute('hidden')
    await usuario.click(verCalculo)
    expect(conteudo).not.toHaveAttribute('hidden')
    expect(within(conteudo as HTMLElement).getByText('TMB')).toBeInTheDocument()
  })
})

describe('Resumo do dia no modo rápido (CA-226, CA-228)', () => {
  it('item 9: modo rápido sem dados para calcular não diz "Meta calculada"', () => {
    montar({ modo: 'rapido' })
    expect(resumo().getByText('Meta de energia')).toBeInTheDocument()
    expect(resumo().queryByText('Meta calculada')).not.toBeInTheDocument()
  })

  it('mostra a meta calculada e o fator', () => {
    montar({ ...adulta, modo: 'rapido' })
    expect(resumo().getByText('Meta calculada')).toBeInTheDocument()
    expect(resumo().getByText('1.596 kcal')).toBeInTheDocument()
    expect(resumo().getByText('Fator de atividade')).toBeInTheDocument()
  })

  it('a meta digitada aparece como definida por você', () => {
    montar({ ...adulta, modo: 'rapido', metaEnergiaKcal: 1800 })
    expect(resumo().getByText('Meta definida por você')).toBeInTheDocument()
    expect(resumo().getByText('1.800 kcal')).toBeInTheDocument()
    expect(resumo().queryByText('Fator de atividade')).not.toBeInTheDocument()
  })

  it('CA-681: no modo rápido, a frase diz "da meta"', () => {
    montar({ ...adulta, modo: 'rapido', metaEnergiaKcal: 1800 }, planoComArroz())
    expect(resumo().getByText('20% da meta, abaixo de 90%')).toBeInTheDocument()
  })

  it('CB-207: meta digitada, "Ver cálculo" sem TMB e sem fator, só o que existe', () => {
    montar({ ...adulta, modo: 'rapido', metaEnergiaKcal: 1800 }, planoComArroz())
    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    const conteudo = within(document.getElementById(verCalculo.getAttribute('aria-controls') ?? '') as HTMLElement)
    expect(conteudo.queryByText('TMB')).not.toBeInTheDocument()
    expect(conteudo.getByText('Carboidrato no plano')).toBeInTheDocument()
  })
})

describe('Arredondamento na direção do estado (CA-695)', () => {
  const comGet = (get: number): Partial<Caso> => ({ ...adulta, energia: { ...criarCasoVazio('x').energia, getManual: get } })

  it('CA-695: 89,6% do GET sai "89%, abaixo de 90%", e 110,4% sai "111%, acima de 110%"', () => {
    const plano = planoComArroz()
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total
    const { unmount } = render(<Anfitriao inicial={comGet(kcal / 0.896)} plano={plano} />)
    expect(resumo().getByText('89% do GET, abaixo de 90%')).toBeInTheDocument()
    unmount()

    render(<Anfitriao inicial={comGet(kcal / 1.104)} plano={plano} />)
    expect(resumo().getByText('111% do GET, acima de 110%')).toBeInTheDocument()
  })
})

describe('"Ver cálculo" em ordem (CA-702)', () => {
  it('CA-702: a fonte da energia vem logo depois da energia, antes dos macros', async () => {
    const usuario = montar(adulta, planoComArroz())
    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    await usuario.click(verCalculo)
    const conteudo = within(document.getElementById(verCalculo.getAttribute('aria-controls') ?? '') as HTMLElement)
    const fonte = conteudo.getByRole('button', { name: /fonte/i })
    const fator = conteudo.getByText('Fator de atividade')
    const carboidrato = conteudo.getByText('Carboidrato no plano')
    const origem = conteudo.getByText('Metas dos macronutrientes')
    expect(fator.compareDocumentPosition(fonte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(fonte.compareDocumentPosition(carboidrato) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(carboidrato.compareDocumentPosition(origem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-702: o g/kg da proteína fica só na linha, sem repetir em "Ver cálculo"', () => {
    montar(adulta, planoComArroz())
    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    const conteudo = within(document.getElementById(verCalculo.getAttribute('aria-controls') ?? '') as HTMLElement)
    expect(conteudo.queryByText(/Proteína/)).not.toBeInTheDocument()
    expect(resumo().getAllByText(/0,13 g\/kg/)).toHaveLength(1)
  })
})
