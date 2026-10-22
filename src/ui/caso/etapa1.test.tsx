import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

function Anfitriao({ inicial }: { readonly inicial: Partial<Caso> }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
}

const montar = (inicial: Partial<Caso>) => {
  render(<Anfitriao inicial={inicial} />)
  return userEvent.setup()
}

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 62, estaturaCm: 165 }

describe('Quantidades para o paciente (spec conduta-da-nutricionista, D-297)', () => {
  it('CA-924: plano novo vem com "Medida caseira", e a escolha muda o plano', async () => {
    const usuario = montar(adulta)
    const escolha = screen.getByRole('radiogroup', { name: 'Quantidades para o paciente' })
    expect(within(escolha).getByRole('radio', { name: 'Medida caseira' })).toHaveAttribute('aria-checked', 'true')
    expect(within(escolha).getByRole('radio', { name: 'Gramas' })).toHaveAttribute('aria-checked', 'false')
    await usuario.click(within(escolha).getByRole('radio', { name: 'Gramas' }))
    expect(within(escolha).getByRole('radio', { name: 'Gramas' })).toHaveAttribute('aria-checked', 'true')
    expect(within(escolha).getByRole('radio', { name: 'Medida caseira' })).toHaveAttribute('aria-checked', 'false')
  })

  it('CA-924: fica no cartão Identificação, o primeiro da etapa', () => {
    montar(adulta)
    const identificacao = screen.getByRole('heading', { name: 'Identificação' }).closest('[data-slot="card"]')
    expect(identificacao).not.toBeNull()
    expect(within(identificacao as HTMLElement).getByRole('radiogroup', { name: 'Quantidades para o paciente' })).toBeInTheDocument()
  })
})

describe('Meta de água pelo peso (spec ficha-unica, D-355; spec conduta-da-nutricionista, D-298)', () => {
  it('CA-1092: o campo mostra a meta em litros, o método e a conta, e a referência da DRI numa linha à parte', () => {
    montar(adulta)
    const campo = screen.getByLabelText('Meta de água')
    expect(campo).toHaveValue('2,2')
    expect(campo).toHaveAccessibleDescription('Por peso: 35 ml/kg (18 a 55 anos) · 35 ml × 62 kg = 2,2 L')
    expect(screen.getByText('Referência da DRI para mulheres de 19 anos ou mais: 2,7 L de água total, cerca de 2,2 L em bebidas.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar a calculada' })).not.toBeInTheDocument()
  })

  it('CA-1092: a meta acompanha o peso enquanto não há edição', async () => {
    const usuario = montar(adulta)
    const peso = screen.getByLabelText('Peso')
    await usuario.clear(peso)
    await usuario.type(peso, '80')
    expect(screen.getByLabelText('Meta de água')).toHaveValue('2,8')
  })

  it('CA-1093: o valor digitado vale e fica; apagar tira a meta; "Usar a calculada" volta à conta', async () => {
    const usuario = montar(adulta)
    const campo = screen.getByLabelText('Meta de água')
    await usuario.clear(campo)
    expect(campo).toHaveAccessibleDescription('Sem meta de água no plano impresso e na missão do link.')
    await usuario.type(campo, '3')
    expect(campo).toHaveValue('3')
    expect(screen.getByText('Valor digitado. A conta dá 2,2 L.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Usar a calculada' }))
    expect(campo).toHaveValue('2,2')
  })

  it('CA-1091: "Por energia (1 ml/kcal)" usa a meta de energia', async () => {
    const usuario = montar(adulta)
    await usuario.click(screen.getByRole('radio', { name: 'Por energia (1 ml/kcal)' }))
    expect(screen.getByLabelText('Meta de água')).toHaveAccessibleDescription(/^Por energia: 1 ml\/kcal · 1 ml × [\d.]+ kcal = \d,\d L$/)
  })

  it('CA-1092: sem peso, o campo fica vazio e pede o peso', () => {
    montar({ ...adulta, pesoKg: null })
    const campo = screen.getByLabelText('Meta de água')
    expect(campo).toHaveValue('')
    expect(campo).toHaveAccessibleDescription('Informe o peso para a meta automática.')
  })

  it('CA-1095: a linha escrita à mão antes continua, com o aviso, até "Usar a calculada"', async () => {
    const usuario = montar({ ...adulta, linhaDaAgua: 'Beba 2 litros de água, mais no calor.' })
    expect(screen.getByText('Linha escrita antes: “Beba 2 litros de água, mais no calor.”. Ela continua no plano impresso até você usar a calculada.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Usar a calculada' }))
    expect(screen.queryByText(/Linha escrita antes/)).not.toBeInTheDocument()
  })
})

describe('Etapa 1 mais limpa (US-B4)', () => {
  it('CA-329: cartões sem a frase de descrição', () => {
    montar(adulta)
    expect(screen.queryByText('Aparece no cabeçalho do documento exportado.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Base da antropometria e do gasto energético/)).not.toBeInTheDocument()
    expect(screen.queryByText('Entram no documento de aconselhamento exportado.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Condição fisiológica' })).not.toBeInTheDocument()
  })

  it('CA-330 e CA-331: masculino não vê condição; adulto não vê meses nem panturrilha', () => {
    montar({ ...adulta, sexo: 'M' })
    expect(screen.queryByRole('radiogroup', { name: 'Condição' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Meses além dos anos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Circunferência da panturrilha')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Circunferência da cintura')).toBeInTheDocument()
  })

  it('CA-331: os campos aparecem quando a idade pede', async () => {
    const usuario = montar(adulta)
    const idade = screen.getByLabelText('Idade')
    await usuario.clear(idade)
    await usuario.type(idade, '8')
    // D-244 (spec revisao-geral-trabalho): o campo segue a idade quando a pessoa termina de digitar.
    expect(await screen.findByLabelText('Meses além dos anos')).toBeInTheDocument()
    await usuario.clear(idade)
    await usuario.type(idade, '72')
    await waitFor(() => expect(screen.queryByLabelText('Meses além dos anos')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Circunferência da panturrilha')).toBeInTheDocument()
  })

  it('CB-73: campo com valor continua aparecendo', () => {
    montar({ ...adulta, idadeAnos: 45, circunferenciaPanturrilhaCm: 33, idadeMesesAdicionais: 4 })
    expect(screen.getByLabelText('Circunferência da panturrilha')).toHaveValue('33')
    expect(screen.getByLabelText('Meses além dos anos')).toHaveValue('4')
  })

  it('CA-332: composição corporal e observações recolhidas, e abrem com um clique', async () => {
    const usuario = montar(adulta)
    const composicao = screen.getByRole('button', { name: /Composição corporal/ })
    const observacoes = screen.getByRole('button', { name: /Observações/ })
    expect(composicao).toHaveAttribute('aria-expanded', 'false')
    expect(observacoes).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(composicao)
    expect(composicao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('radiogroup', { name: 'Protocolo de dobras' })).toBeVisible()
  })

  it('CA-332: já abertos quando têm dado', () => {
    const vazio = criarCasoVazio('c1')
    montar({
      ...adulta,
      observacoes: 'Prefere jantar cedo.',
      composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, tricipital: 12 } },
    })
    expect(screen.getByRole('button', { name: /Composição corporal/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Observações/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('CA-333: avaliação mostra valor e classificação na mesma linha', () => {
    montar(adulta)
    const imc = screen.getByText('22,8 kg/m²')
    expect(imc.parentElement?.textContent).toMatch(/22,8 kg\/m² · Eutrofia/)
  })
})

describe('Meses além dos anos sem piscar (spec revisao-geral-trabalho, D-244)', () => {
  const meses = () => screen.queryByLabelText('Meses além dos anos')
  const idade = () => screen.getByLabelText('Idade')
  const digitar = (valor: string) => fireEvent.change(idade(), { target: { value: valor } })

  describe('com o relógio parado', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })
    const esperar = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms)
      })

    it('CA-784: digitar "2" e "8" num adulto nunca mostra o campo de meses', () => {
      render(<Anfitriao inicial={adulta} />)
      digitar('')
      digitar('2')
      expect(meses()).not.toBeInTheDocument()
      digitar('28')
      expect(meses()).not.toBeInTheDocument()
      esperar(1000)
      expect(meses()).not.toBeInTheDocument()
    })

    it('CA-784: digitar "8" e parar mostra o campo meio segundo depois', () => {
      render(<Anfitriao inicial={adulta} />)
      digitar('8')
      esperar(400)
      expect(meses()).not.toBeInTheDocument()
      esperar(100)
      expect(meses()).toBeInTheDocument()
    })

    it('CA-784: digitar "8" e sair do campo mostra o campo na hora', () => {
      render(<Anfitriao inicial={adulta} />)
      digitar('8')
      fireEvent.blur(idade())
      expect(meses()).toBeInTheDocument()
    })

    it('CA-784 (revisão de 20/10/2026): abrir outro plano mostra os campos dele na hora, sem os do anterior', () => {
      function Trocador() {
        const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...adulta, idadeAnos: 8, modo: 'completo' })
        return (
          <>
            <button type="button" onClick={() => setCaso({ ...criarCasoVazio('c2'), modo: 'completo' })}>
              Outro plano
            </button>
            <button type="button" onClick={() => setCaso({ ...criarCasoVazio('c3'), ...adulta, idadeAnos: 65, modo: 'completo' })}>
              Plano de 65 anos
            </button>
            <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
          </>
        )
      }
      render(<Trocador />)
      expect(meses()).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Outro plano' }))
      expect(meses()).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Plano de 65 anos' }))
      expect(screen.getByLabelText('Circunferência da panturrilha')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Outro plano' }))
      expect(screen.queryByLabelText('Circunferência da panturrilha')).not.toBeInTheDocument()
    })

    it('CB-243: idade apagada, sem meses guardados: o campo some quando a pessoa termina', () => {
      render(<Anfitriao inicial={{ ...adulta, idadeAnos: 8 }} />)
      expect(meses()).toBeInTheDocument()
      digitar('')
      expect(meses()).toBeInTheDocument()
      esperar(500)
      expect(meses()).not.toBeInTheDocument()
    })
  })

  it('CB-248: digitar "8" e teclar Tab: o campo de meses aparece e recebe o foco', async () => {
    const usuario = montar(adulta)
    await usuario.clear(idade())
    await usuario.type(idade(), '8')
    await usuario.tab()
    expect(meses()).toHaveFocus()
  })
})
