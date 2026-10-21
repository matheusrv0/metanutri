import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DIAS_PARA_SUMIR } from '@/domain/acompanhamento.ts'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { MAXIMO_SUGESTOES } from '@/domain/cobrir.ts'
import { DIAS_PACIENTE_ATIVO, planoPorId } from '@/domain/conta.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { TelaInicio } from './TelaInicio.tsx'

const montar = (acoes: Partial<{ aoComecar: () => void; aoVerPrecos: () => void; aoVerFontes: () => void }> = {}) =>
  render(<TelaInicio aoComecar={acoes.aoComecar ?? vi.fn()} aoVerPrecos={acoes.aoVerPrecos ?? vi.fn()} aoVerFontes={acoes.aoVerFontes ?? vi.fn()} />)

const titulos = () => screen.getAllByRole('heading').map((h) => h.textContent ?? '')
const texto = () => document.body.textContent ?? ''

describe('TelaInicio (spec site-publico-profissional)', () => {
  it('CA-1000: topo, Como funciona, recursos, Quanto custa e a faixa final, nesta ordem', () => {
    montar()
    const ordem = [/^Faltou cálcio\?/, /^Como funciona$/, /^Do atendimento à folha do paciente$/, /^Quanto custa$/, /^Comece pelo Free$/].map((padrao) =>
      titulos().findIndex((t) => padrao.test(t)),
    )
    expect(ordem.every((p) => p >= 0)).toBe(true)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
  })

  it('CA-1000: saem a frase do ferro, os cartões de 57% e "g + colher", "O diferencial" e os números de passo', () => {
    montar()
    expect(texto()).not.toMatch(/Todo programa avisa|Nenhum diz|57%|g \+ colher|O diferencial|O Cobrir e as missões/)
    for (const numero of ['01', '02', '03']) expect(screen.queryByText(numero)).not.toBeInTheDocument()
  })

  it('CA-113: o título do topo é o combinado', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Faltou cálcio? O MetaNutri diz o que comer.')
  })

  it('CA-1001: uma frase embaixo do título diz para quem é e o que faz, e os botões vêm depois; nada acima do título', () => {
    montar()
    const titulo = screen.getByRole('heading', { level: 1 })
    const frase = titulo.nextElementSibling
    expect(frase?.tagName).toBe('P')
    expect(frase).toHaveTextContent(
      'Software de nutrição para nutricionistas: monte o plano, veja o que falta de 20 vitaminas e minerais e da fibra, e o botão Cobrir sugere o alimento e a porção que fecham cada falta.',
    )
    const botoes = frase?.nextElementSibling
    expect(within(botoes as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['Começar grátis', 'Ver preços'])
    expect(titulo.previousElementSibling).toBeNull()
  })

  it('CA-1003: Como funciona tem o Cobrir e o acompanhamento do paciente, com as telas reais', () => {
    montar()
    const secao = within(screen.getByRole('region', { name: 'Como funciona' }))
    const cobrir = secao.getByRole('heading', { level: 3, name: 'Monte o plano e feche o que falta' }).parentElement
    expect(cobrir).toHaveTextContent(`o botão Cobrir sugere até ${MAXIMO_SUGESTOES} alimentos de grupos diferentes, com a porção em gramas e em medida caseira e quanto da falta cada um cobre`)
    const paciente = secao.getByRole('heading', { level: 3, name: 'Acompanhe o paciente entre as consultas' }).parentElement
    expect(paciente).toHaveTextContent('sem baixar app nem criar conta')
    expect(paciente).toHaveTextContent(`quem passa ${DIAS_PARA_SUMIR} dias sem marcar sobe para o topo da lista`)
    expect(paciente).toHaveTextContent('WhatsApp, com o texto pronto')
  })

  it('CA-115: as telas reais, uma captura por tema, só a do tema visível', () => {
    montar()
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

  it('CA-1004: seis recursos que existem no produto, sem cartão dentro de cartão', () => {
    montar()
    const secao = screen.getByRole('region', { name: 'Do atendimento à folha do paciente' })
    expect(within(secao).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Anamnese e avaliação',
      'Substitutos e trocas',
      'Receitas com cálculo',
      'Suplementos e exames',
      'Folha do paciente',
      'Na sua conta',
    ])
    expect(secao).toHaveTextContent('imprimir ou salvar em PDF, com nomes que o paciente entende, e documentos em Word')
    expect(secao.querySelectorAll('.rounded-3xl')).toHaveLength(0)
  })

  it('CA-1005: Quanto custa mostra Estudante, Solo e Pro com os valores e limites do domínio, e leva a Preços', async () => {
    const aoVerPrecos = vi.fn()
    montar({ aoVerPrecos })
    const secao = within(screen.getByRole('region', { name: 'Quanto custa' }))
    const solo = planoPorId('solo')
    const pro = planoPorId('pro')
    const estudante = planoPorId('estudante')
    expect(secao.getByText('R$ 0')).toBeInTheDocument()
    expect(secao.getByText('R$ 34,90')).toBeInTheDocument()
    expect(secao.getByText('R$ 64,90')).toBeInTheDocument()
    expect(secao.getByText(`Com o comprovante de matrícula. ${estudante?.limitePacientesAtivos ?? ''} pacientes ativos.`)).toBeInTheDocument()
    expect(secao.getByText(`${solo?.resumo ?? ''} ${solo?.limitePacientesAtivos ?? ''} pacientes ativos.`)).toBeInTheDocument()
    expect(secao.getByText(`${pro?.resumo ?? ''} Pacientes ilimitados.`)).toBeInTheDocument()
    expect(secao.getByText(`A conta é por paciente ativo: quem teve plano ou missão nos últimos ${DIAS_PACIENTE_ATIVO} dias.`)).toBeInTheDocument()
    await userEvent.setup().click(secao.getByRole('button', { name: 'Comparar os planos' }))
    expect(aoVerPrecos).toHaveBeenCalledOnce()
  })

  it('CA-1006: só números verdadeiros, do domínio; o teste prende os de hoje', () => {
    montar()
    const numeros = [MICRONUTRIENTES_ADEQUACAO.length, MICRONUTRIENTES_ADEQUACAO.filter((c) => c !== 'fibra_g').length, ALIMENTOS.length]
    expect(numeros).toEqual([21, 20, 597])
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('597')).toBeInTheDocument()
    expect(screen.getByText('na adequação de cada plano')).toBeInTheDocument()
    expect(texto()).not.toContain('conferidos')
  })

  it('CA-1007: o cartão dos 21 nutrientes rola até Como funciona; o dos 597 alimentos abre Fontes da base', async () => {
    const aoVerFontes = vi.fn()
    montar({ aoVerFontes })
    const alvo = document.getElementById('como-funciona')
    if (!alvo) throw new Error('sem a seção Como funciona')
    alvo.scrollIntoView = vi.fn()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /^21/ }))
    expect(alvo.scrollIntoView).toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: /^597/ }))
    expect(aoVerFontes).toHaveBeenCalledOnce()
  })

  it('CA-117: Começar grátis (do topo e da faixa final) e Ver preços chamam quem manda', async () => {
    const aoComecar = vi.fn()
    const aoVerPrecos = vi.fn()
    montar({ aoComecar, aoVerPrecos })
    const usuario = userEvent.setup()
    for (const botao of screen.getAllByRole('button', { name: /Começar grátis/ })) await usuario.click(botao)
    expect(aoComecar).toHaveBeenCalledTimes(2)
    await usuario.click(screen.getByRole('button', { name: 'Ver preços' }))
    expect(aoVerPrecos).toHaveBeenCalledOnce()
  })

  it('CA-119 e CA-1020: a foto do topo tem o tamanho reservado e prioridade alta', () => {
    montar()
    const foto = screen.getByAltText(/Três pratos/)
    expect(foto).toHaveAttribute('width', '1600')
    expect(foto).toHaveAttribute('height', '712')
    expect(foto).toHaveAttribute('fetchpriority', 'high')
    expect(foto).not.toHaveAttribute('loading', 'lazy')
  })

  it('CA-1008: cada informação uma vez, uma pergunta só, sem frase de efeito, comparação ou promessa clínica', () => {
    montar()
    const vezes = (trecho: string) => texto().split(trecho).length - 1
    expect(vezes('em gramas e em medida caseira')).toBe(1)
    expect(vezes('?')).toBe(1)
    expect(texto()).not.toMatch(/de verdade|nenhum programa|o único|para de abandonar|sem planilha|nunca vira zero/i)
  })

  it('CA-321 e CA-1008: a área pública fala em Base MetaNutri, não nas tabelas de origem', () => {
    montar()
    expect(screen.getByText('da Base MetaNutri')).toBeInTheDocument()
    expect(texto()).not.toMatch(/TACO|POF|IBGE/)
  })
})
