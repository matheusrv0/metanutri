import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
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

  it('CA-10: mostra kcal do plano e a porcentagem do GET, com o estado', () => {
    montar(adulta, planoComArroz())
    expect(resumo().getByText('371 kcal')).toBeInTheDocument()
    expect(resumo().getByText('23% do GET')).toBeInTheDocument()
    expect(resumo().getByText('Abaixo de 90%')).toBeInTheDocument()
  })

  it('CA-22 e CA-23: macros em gramas, % das kcal e g/kg, com o estado da faixa', () => {
    montar(adulta, planoComArroz())
    const proteina = resumo().getByText('Proteína').closest('div')?.parentElement
    expect(proteina).toHaveTextContent('7,8 g')
    expect(proteina).toHaveTextContent('0,13 g/kg')
    expect(resumo().getAllByText(/Meta: .* \(faixa da idade\)/).length).toBe(3)
    // O estado agora sai como frase do medidor: dentro, faltam X, quase lá, acima, passou de leve.
    expect(resumo().getAllByText(/Dentro da faixa|para a faixa|Quase lá|acima da faixa|Passou de leve/).length).toBe(3)
  })

  it('CA-24: meta própria de proteína em g/kg passa a valer', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('button', { name: 'Metas' }))
    const janela = within(screen.getByRole('dialog', { name: 'Metas de macronutrientes' }))
    await usuario.click(janela.getByRole('radio', { name: 'g/kg de peso' }))
    await usuario.type(janela.getByLabelText('Proteína: mínimo'), '1,2')
    await usuario.type(janela.getByLabelText('Proteína: máximo'), '1,6')
    await usuario.click(janela.getByRole('button', { name: 'Salvar metas' }))

    expect(resumo().getByText('Meta: 1,2 a 1,6 g/kg (sua meta)')).toBeInTheDocument()
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
