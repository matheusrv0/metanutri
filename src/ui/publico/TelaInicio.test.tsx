import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DIAS_PARA_SUMIR } from '@/domain/acompanhamento.ts'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { MAXIMO_SUGESTOES } from '@/domain/cobrir.ts'
import { DIAS_PACIENTE_ATIVO, planoPorId } from '@/domain/conta.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { TelaInicio } from './TelaInicio.tsx'

const montar = (acoes: Partial<{ aoComecar: () => void; aoVerPrecos: () => void }> = {}) =>
  render(<TelaInicio aoComecar={acoes.aoComecar ?? vi.fn()} aoVerPrecos={acoes.aoVerPrecos ?? vi.fn()} />)

const titulos = () => screen.getAllByRole('heading').map((h) => h.textContent ?? '')
const texto = () => document.body.textContent ?? ''

describe('TelaInicio (spec site-publico-profissional, textos da spec textos-e-promessas)', () => {
  it('CA-1000: topo, Como funciona, recursos, Quanto custa e a faixa final, nesta ordem', () => {
    montar()
    const ordem = [/^Faltou cálcio\?/, /^Como funciona$/, /^Do atendimento ao documento entregue$/, /^Quanto custa$/, /^Teste com um paciente real$/].map(
      (padrao) => titulos().findIndex((t) => padrao.test(t)),
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

  it('CA-1173: uma frase embaixo do título diz para quem é e o que mais faz, sem repetir o título; os botões vêm depois', () => {
    montar()
    const titulo = screen.getByRole('heading', { level: 1 })
    const frase = titulo.nextElementSibling
    expect(frase?.tagName).toBe('P')
    expect(frase).toHaveTextContent(
      'Software para nutricionistas. Monte o plano alimentar, entregue em PDF e acompanhe o paciente pelo celular entre as consultas.',
    )
    expect(frase?.textContent).not.toMatch(/Cobrir|o que comer|vitaminas/)
    const botoes = frase?.nextElementSibling
    expect(within(botoes as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['Começar grátis', 'Ver preços'])
    expect(titulo.previousElementSibling).toBeNull()
  })

  it('CA-1173: os cartões do topo são os 21 nutrientes e as sugestões do Cobrir, com os números do domínio; o de alimentos saiu', () => {
    montar()
    expect([MICRONUTRIENTES_ADEQUACAO.length, MICRONUTRIENTES_ADEQUACAO.filter((c) => c !== 'fibra_g').length, MAXIMO_SUGESTOES]).toEqual([21, 20, 5])
    const nutrientes = screen.getByRole('button', { name: /^21/ })
    expect(nutrientes).toHaveTextContent('21nutrientes na adequação20 vitaminas e minerais e a fibra')
    const sugestoes = screen.getByRole('button', { name: /^Até 5/ })
    expect(sugestoes).toHaveTextContent('Até 5sugestões de alimentopara cada nutriente abaixo da meta')
    expect(ALIMENTOS.length).toBe(597)
    expect(texto()).not.toContain('597')
    expect(texto()).not.toMatch(/alimentos da Base|conferidos/)
  })

  it('CA-1173: os dois cartões do topo levam a Como funciona', async () => {
    montar()
    const alvo = document.getElementById('como-funciona')
    if (!alvo) throw new Error('sem a seção Como funciona')
    alvo.scrollIntoView = vi.fn()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /^21/ }))
    await usuario.click(screen.getByRole('button', { name: /^Até 5/ }))
    expect(alvo.scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('CA-1174: o Cobrir contra a lista por nutriente, e o acompanhamento do paciente, com as telas reais', () => {
    montar()
    const secao = within(screen.getByRole('region', { name: 'Como funciona' }))
    const cobrir = secao.getByRole('heading', { level: 3, name: 'Monte o plano e cubra o que falta' }).parentElement
    expect(cobrir).toHaveTextContent(
      'Digite “150 arroz” e tecle Enter: o alimento entra na refeição já com a medida caseira, e as calorias e os macros do dia se atualizam.',
    )
    expect(cobrir).toHaveTextContent(
      'Uma lista dos alimentos mais ricos em cálcio não diz quanto pôr no prato. O MetaNutri calcula quanto falta em cada nutriente abaixo da meta, e o botão Cobrir propõe o alimento e a porção, em gramas e em medida caseira, que fecham a diferença.',
    )
    expect(cobrir).toHaveTextContent(
      'As sugestões vêm de grupos diferentes e respeitam as restrições do paciente. Se nem uma porção realista fecha a diferença, a sugestão mostra quanto ela cobre. Você escolhe, e o alimento entra na refeição.',
    )
    const paciente = secao.getByRole('heading', { level: 3, name: 'Acompanhe o paciente entre as consultas' }).parentElement
    expect(paciente).toHaveTextContent(
      'O plano vira missões diárias num link. O paciente abre no celular, sem baixar aplicativo nem criar conta, e marca o que cumpriu. Se você quiser, o mesmo link mostra o plano alimentar.',
    )
    expect(paciente).toHaveTextContent(
      `Na tela Adesão, quem fica ${DIAS_PARA_SUMIR} dias sem marcar sobe para o topo da lista. Você manda o link e os lembretes pelo WhatsApp, com a mensagem pronta.`,
    )
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

  it('CA-1175: seis recursos que existem no produto, sem cartão dentro de cartão', () => {
    montar()
    const secao = screen.getByRole('region', { name: 'Do atendimento ao documento entregue' })
    expect(within(secao).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Anamnese e avaliação',
      'Substitutos e trocas',
      'Receitas e alimentos próprios',
      'Suplementos e exames',
      'Documentos',
      'Na sua conta',
    ])
    expect(secao).toHaveTextContent('produtos cadastrados pelo rótulo ou pelo código de barras')
    // CA-1202 (integração 22/10/2026): o que esta publicação entrega. A receita entra pela busca da refeição
    // (RECEITAS_NA_REFEICAO); o formulário do alimento próprio fica para a publicação 2 e não é prometido.
    expect(secao).toHaveTextContent('em Meus alimentos, produtos cadastrados pelo rótulo ou pelo código de barras. Os dois entram na refeição pela busca, como qualquer alimento.')
    expect(secao).not.toHaveTextContent(/alimento da sua região|preparação sua|qualquer alimento seu/i)
    expect(secao).toHaveTextContent('Aconselhamento nutricional e memorial de cálculo em Word.')
    expect(secao).toHaveTextContent('Planos e pacientes salvos na nuvem. Abra no computador ou no celular.')
    expect(secao.querySelectorAll('.rounded-3xl')).toHaveLength(0)
  })

  it('CA-1176: Quanto custa mostra Free, Solo e Pro com os valores e limites do domínio, e leva a Preços', async () => {
    const aoVerPrecos = vi.fn()
    montar({ aoVerPrecos })
    const secao = within(screen.getByRole('region', { name: 'Quanto custa' }))
    const solo = planoPorId('solo')
    const pro = planoPorId('pro')
    expect(secao.getByText('R$ 0')).toBeInTheDocument()
    expect(secao.getByText('R$ 34,90')).toBeInTheDocument()
    expect(secao.getByText('R$ 64,90')).toBeInTheDocument()
    expect(secao.getByText('Free')).toBeInTheDocument()
    expect(secao.getByText('2 pacientes ativos, sem cartão. Estudante com comprovante de matrícula: 10.')).toBeInTheDocument()
    expect(secao.getByText(`25 pacientes ativos. ${solo?.resumo ?? ''}`)).toBeInTheDocument()
    expect(secao.getByText(`Pacientes ilimitados. ${pro?.resumo ?? ''}`)).toBeInTheDocument()
    expect(
      secao.getByText(
        `Todas as assinaturas têm as mesmas funções. O preço depende de quantos pacientes ativos você tem: quem teve plano alimentar ou missão nos últimos ${DIAS_PACIENTE_ATIVO} dias.`,
      ),
    ).toBeInTheDocument()
    await userEvent.setup().click(secao.getByRole('button', { name: 'Comparar planos' }))
    expect(aoVerPrecos).toHaveBeenCalledOnce()
  })

  it('CA-1176: a faixa final convida a testar com um paciente real, grátis e sem cartão', () => {
    montar()
    const faixa = screen.getByRole('heading', { level: 2, name: 'Teste com um paciente real' }).closest('section')
    expect(faixa).toHaveTextContent('Teste com um paciente realGrátis, sem cartão.Começar grátis')
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

  it('CA-119, CA-1020 e CA-1027: a foto do topo tem o tamanho reservado, prioridade alta e é preguiçosa', () => {
    montar()
    const foto = screen.getByAltText(/Três pratos/)
    expect(foto).toHaveAttribute('width', '1600')
    expect(foto).toHaveAttribute('height', '712')
    expect(foto).toHaveAttribute('fetchpriority', 'high')
    // Escondida (link do paciente, raiz com sessão), não baixa; na landing, o <head> já a pré-carrega (preparar-pagina.js).
    expect(foto).toHaveAttribute('loading', 'lazy')
  })

  it('CA-1177: cada informação uma vez, uma pergunta só, sem comparação com empresa, promessa clínica nem termo antigo', () => {
    montar()
    const vezes = (trecho: string) => texto().split(trecho).length - 1
    expect(vezes('em gramas e em medida caseira')).toBe(1)
    expect(vezes('abaixo da meta')).toBeLessThanOrEqual(2)
    expect(vezes('?')).toBe(1)
    expect(texto()).not.toMatch(/de verdade|nenhum programa|o único|para de abandonar|sem planilha|nunca vira zero/i)
    expect(texto()).not.toMatch(/Dietbox|WebDiet|Nutrium|presos|clientela|folha do paciente|feche o que falta|cobre macros|macros que faltam/i)
  })

  it('CA-321 e CA-1177: a área pública não cita as tabelas de origem', () => {
    montar()
    expect(texto()).not.toMatch(/TACO|POF|IBGE/)
  })
})
