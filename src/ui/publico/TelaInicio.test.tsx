import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { coberturaDeCalcio, pctAlimentosSemVitaminaA } from '@/domain/vitrine.ts'
import { TelaInicio } from './TelaInicio.tsx'

const titulos = () => screen.getAllByRole('heading').map((h) => h.textContent ?? '')
const posicao = (padrao: RegExp) => titulos().findIndex((t) => padrao.test(t))

describe('TelaInicio', () => {
  it('CA-112: topo, problema, como funciona, o diferencial e a faixa final, nesta ordem', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    const ordem = [/Faltou cálcio/, /Todo programa avisa/, /Um plano completo em minutos/, /O diferencial, na tela de verdade/, /Monte o próximo plano/].map(posicao)
    expect(ordem.every((p) => p >= 0)).toBe(true)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
  })

  it('CA-113: o título do topo é o combinado', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Faltou cálcio? O MetaNutri diz o que comer.')
  })

  it('CA-114: só números verdadeiros, calculados do sistema e da base', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    const numeros = [String(MICRONUTRIENTES_ADEQUACAO.length), String(ALIMENTOS.length), String(coberturaDeCalcio().length), `${pctAlimentosSemVitaminaA()}%`]
    // Prende o dado de hoje: se algum desses números mudar sem querer, o teste avisa.
    expect(numeros).toEqual(['16', '597', '5', '57%'])
    for (const numero of numeros) expect(screen.getByText(numero)).toBeInTheDocument()
  })

  it('CA-115: o diferencial mostra telas reais do app, uma captura por tema, só a do tema visível', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    for (const [alt, nome] of [
      [/botão Cobrir/, 'cobrir'],
      [/missões do paciente/, 'missoes'],
    ] as const) {
      const [claro, escuro] = screen.getAllByAltText(alt)
      expect(claro).toHaveAttribute('src', expect.stringContaining(`imagens/${nome}-claro.png`))
      expect(claro?.className).toContain('dark:hidden')
      expect(escuro).toHaveAttribute('src', expect.stringContaining(`imagens/${nome}-escuro.png`))
      expect(escuro?.className).toMatch(/(^| )hidden .*dark:block/)
    }
  })

  it('CA-113: o topo não tem mais o nome grande atrás dos pratos', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    expect(screen.queryByText('metanutri')).not.toBeInTheDocument()
    expect(screen.getByAltText(/Três pratos/)).toBeInTheDocument()
  })

  it('CA-117: Começar grátis e Ver preços chamam quem manda', async () => {
    const aoComecar = vi.fn()
    const aoVerPrecos = vi.fn()
    render(<TelaInicio aoComecar={aoComecar} aoVerPrecos={aoVerPrecos} />)
    const usuario = userEvent.setup()
    for (const botao of screen.getAllByRole('button', { name: /Começar grátis/ })) await usuario.click(botao)
    expect(aoComecar).toHaveBeenCalledTimes(2)
    await usuario.click(screen.getByRole('button', { name: 'Ver preços' }))
    expect(aoVerPrecos).toHaveBeenCalledOnce()
  })

  it('CA-119: a foto do topo tem o tamanho reservado', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    const foto = screen.getByAltText(/Três pratos/)
    expect(foto).toHaveAttribute('width', '1600')
    expect(foto).toHaveAttribute('height', '712')
  })

  it('CA-321: a área pública fala em Base MetaNutri, não nas tabelas de origem', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    expect(screen.getByText('da Base MetaNutri')).toBeInTheDocument()
    expect(screen.getByText('dos alimentos da base')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/TACO|POF|IBGE/)
  })
})
