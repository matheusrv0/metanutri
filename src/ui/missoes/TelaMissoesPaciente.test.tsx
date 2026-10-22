import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento, marcarMissao, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { DietaDoLink } from '@/domain/dietaDoLink.ts'
import type { Missao } from '@/domain/missoes.ts'
import { LinkSemConexao, MarcacaoRecusada, type FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { TelaMissoesPaciente } from './TelaMissoesPaciente.tsx'

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 07:00', origem: 'Refeição do plano' },
  { id: 'vegetais', texto: 'Comer os vegetais do almoço e do jantar', origem: 'Verduras do plano' },
  { id: 'agua', texto: 'Beber cerca de 2,1 litros de água', origem: '35 ml por quilo de peso' },
]

const HOJE = '2026-09-26'

function acompanhamento(parcial: Partial<Acompanhamento> = {}): Acompanhamento {
  const base = criarAcompanhamento(
    { casoId: 'caso-1', pacienteId: 'p1', nome: 'Ana Souza', missoes: MISSOES },
    { agora: () => '2026-09-25T10:00:00.000Z', gerarId: () => 'ac-1', aleatorio: (n) => new Uint8Array(n).fill(3) },
  )
  return { ...base, ...parcial }
}

/** Fonte de mentira que guarda o que foi salvo, para o teste conferir. */
function fonteFalsa(inicial: Acompanhamento | null, naNuvem = false) {
  const salvos: Acompanhamento[] = []
  let atual = inicial
  const fonte: FonteAcompanhamentos = {
    naNuvem,
    porToken: () => Promise.resolve(atual),
    salvar: (a) => {
      salvos.push(a)
      atual = a
      return Promise.resolve(a)
    },
  }
  return { fonte, salvos }
}

describe('Tela de missões do paciente', () => {
  it('chama a pessoa pelo primeiro nome e lista as missões do dia', async () => {
    const { fonte } = fonteFalsa(acompanhamento())
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByRole('heading', { name: 'Suas missões de hoje, Ana' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByText('Beber cerca de 2,1 litros de água')).toBeInTheDocument()
  })

  it('nome com vírgula ("Ana, 30 anos") vira só "Ana", sem a vírgula', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ nome: 'Ana, 30 anos' }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByRole('heading', { name: 'Suas missões de hoje, Ana' })).toBeInTheDocument()
  })

  it('mostra de onde cada missão veio, para a pessoa entender o porquê', async () => {
    const { fonte } = fonteFalsa(acompanhamento())
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText('35 ml por quilo de peso')).toBeInTheDocument()
  })

  it('marcar uma missão atualiza a tela e salva', async () => {
    const { fonte, salvos } = fonteFalsa(acompanhamento())
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    const agua = await screen.findByRole('button', { name: /litros de água/ })
    expect(agua).toHaveAttribute('aria-pressed', 'false')

    await usuario.click(agua)

    expect(agua).toHaveAttribute('aria-pressed', 'true')
    expect(salvos).toHaveLength(1)
    expect(salvos[0]?.marcacoes).toEqual([{ dia: HOJE, feitas: ['agua'] }])
  })

  it('desmarcar volta atrás e salva de novo', async () => {
    const { fonte, salvos } = fonteFalsa(acompanhamento())
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    const agua = await screen.findByRole('button', { name: /litros de água/ })
    await usuario.click(agua)
    await usuario.click(agua)

    expect(agua).toHaveAttribute('aria-pressed', 'false')
    expect(salvos[1]?.marcacoes).toEqual([])
  })

  it('conta o progresso do dia', async () => {
    const { fonte } = fonteFalsa(acompanhamento())
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    await usuario.click(await screen.findByRole('button', { name: /litros de água/ }))

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText('feitas hoje')).toBeInTheDocument()
  })

  it('comemora quando o dia fecha', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ marcacoes: [{ dia: HOJE, feitas: ['refeicao-1', 'vegetais'] }] }))
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    await usuario.click(await screen.findByRole('button', { name: /litros de água/ }))

    expect(screen.getByText(/Dia completo, Ana/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('mostra quantos dias da semana a pessoa marcou', async () => {
    const marcacoes = [
      { dia: '2026-09-24', feitas: ['agua'] },
      { dia: '2026-09-25', feitas: ['agua'] },
    ]
    const { fonte } = fonteFalsa(acompanhamento({ marcacoes }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText('Você marcou missão em 2 dias desta semana.')).toBeInTheDocument()
    expect(screen.getByText('A meta é marcar em 4 dias por semana.')).toBeInTheDocument()
  })

  it('quem está no ritmo recebe outra frase', async () => {
    const dias = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']
    const { fonte } = fonteFalsa(acompanhamento({ marcacoes: dias.map((dia) => ({ dia, feitas: ['agua'] })) }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText('Você está no ritmo combinado.')).toBeInTheDocument()
  })

  it('sem nuvem ligada, explica por que o link não abre em outro aparelho', async () => {
    const { fonte } = fonteFalsa(null, false)
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText('Este link ainda não abre em outro aparelho')).toBeInTheDocument()
    expect(screen.getByText(/conta na nuvem do MetaNutri não foi ligada/)).toBeInTheDocument()
  })

  it('com nuvem ligada, link inexistente diz que foi trocado', async () => {
    const { fonte } = fonteFalsa(null, true)
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText('Este link não existe mais')).toBeInTheDocument()
  })

  it('plano sem missão nenhuma não mostra lista vazia sem explicação', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ missoes: [] }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText('Seu plano ainda não tem missões.')).toBeInTheDocument()
  })

  it('o que foi marcado ontem não aparece marcado hoje', async () => {
    const ontem = marcarMissao(acompanhamento(), '2026-09-25', 'agua', true)
    const { fonte } = fonteFalsa(ontem)
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByRole('button', { name: /litros de água/ })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Aviso de conta de estágio na tela do paciente', () => {
  it('link de estudante avisa que não é atendimento profissional', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ usoNaoComercial: true }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText(/estágio de nutrição/i)).toBeInTheDocument()
    expect(screen.getByText(/Não substitui consulta com nutricionista/i)).toBeInTheDocument()
  })

  it('link de conta paga não mostra o aviso', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ usoNaoComercial: false }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    await screen.findByRole('heading', { name: /missões de hoje/i })
    expect(screen.queryByText(/estágio de nutrição/i)).not.toBeInTheDocument()
  })
})

describe('A dieta no link: "Meu plano" (spec dieta-no-link)', () => {
  const DIETA: DietaDoLink = {
    refeicoes: [
      {
        horario: '12:00',
        nome: 'Almoço',
        opcoes: [
          [
            { medida: '6 colheres de sopa', gramas: 150, alimento: 'Arroz, tipo 1, cozido' },
            { medida: '1 concha', gramas: 140, alimento: 'Feijão, carioca, cozido' },
          ],
          [{ medida: '1 unidade', gramas: 120, alimento: 'Batata, inglesa, cozida' }],
          [{ medida: null, gramas: 100, alimento: 'Mandioca, cozida' }],
        ],
      },
      { horario: '19:00', nome: 'Jantar', opcoes: [[{ medida: null, gramas: 80, alimento: 'Macarrão, trigo, cru' }]] },
    ],
    orientacoes: 'Beber água ao longo do dia.\nEvitar fritura.',
    receitas: 'Bolo de banana: 2 ovos, 3 bananas.',
    copiadaEm: '2026-10-14',
  }

  const abrirMeuPlano = async (parcial: Partial<Acompanhamento> = {}) => {
    const { fonte, salvos } = fonteFalsa(acompanhamento({ dieta: DIETA, ...parcial }))
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    await usuario.click(await screen.findByRole('tab', { name: 'Meu plano' }))
    return { usuario, salvos }
  }

  it('CA-530: com a dieta, o link mostra as abas e abre em "Missões", com a tela de hoje dentro do painel da aba', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ dieta: DIETA }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    const abas = await screen.findByRole('tablist', { name: 'O que ver' })
    const missoes = within(abas).getByRole('tab', { name: 'Missões' })
    expect(missoes).toHaveAttribute('aria-selected', 'true')
    expect(within(abas).getByRole('tab', { name: 'Meu plano' })).toHaveAttribute('aria-selected', 'false')
    const painel = screen.getByRole('tabpanel', { name: 'Missões' })
    expect(missoes).toHaveAttribute('aria-controls', painel.id)
    expect(within(painel).getByRole('heading', { name: 'Suas missões de hoje, Ana' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '12:00 Almoço' })).not.toBeInTheDocument()
  })

  it('CA-530: com o foco numa aba, as setas do teclado passam para a outra', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ dieta: DIETA }))
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    await usuario.click(await screen.findByRole('tab', { name: 'Missões' }))
    await usuario.keyboard('{ArrowRight}')

    const meuPlano = screen.getByRole('tab', { name: 'Meu plano' })
    expect(meuPlano).toHaveFocus()
    expect(meuPlano).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel', { name: 'Meu plano' })).getByRole('heading', { level: 1, name: 'Seu plano alimentar, Ana' })).toBeInTheDocument()

    await usuario.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Missões' })).toHaveAttribute('aria-selected', 'true')
  })

  it('CA-531, CA-748 (spec revisao-geral-publica) e CA-928 (spec conduta-da-nutricionista): cada refeição com horário e nome, só a medida caseira em destaque e o nome da folha impressa', async () => {
    await abrirMeuPlano()
    expect(screen.getByRole('heading', { level: 1, name: 'Seu plano alimentar, Ana' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Suas missões/ })).not.toBeInTheDocument()

    const almoco = within(screen.getByRole('region', { name: '12:00 Almoço' }))
    expect(almoco.getByRole('heading', { name: '12:00 Almoço' })).toBeInTheDocument()
    expect(almoco.getByText('6 colheres de sopa').tagName).toBe('STRONG')
    // D-297 (conduta-da-nutricionista): com a medida caseira, o peso não vai ao lado.
    expect(almoco.queryByText(/150 g/)).not.toBeInTheDocument()
    expect(almoco.getByText('Arroz branco cozido')).toBeInTheDocument()
    expect(almoco.queryByText('Arroz, tipo 1, cozido')).not.toBeInTheDocument()
    expect(screen.getAllByRole('region', { name: /^\d\d:\d\d / }).map((r) => r.getAttribute('aria-label'))).toEqual(['12:00 Almoço', '19:00 Jantar'])
  })

  it('CA-749 (com a D-295 e a D-297 da conduta-da-nutricionista): uma quantidade só, a da folha de hoje, mesmo numa cópia antiga', async () => {
    await abrirMeuPlano({
      dieta: {
        ...DIETA,
        refeicoes: [
          {
            horario: '07:00',
            nome: 'Café da manhã',
            opcoes: [
              [
                { medida: '1 unidade e meia', gramas: 70, alimento: 'Pão, trigo, francês' },
                { medida: null, gramas: 5, alimento: 'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)' },
                { medida: '5 fatias', gramas: 130, alimento: 'Banana, prata, crua' },
                { medida: '3 fatias e meia', gramas: 130, alimento: 'Maçã, Fuji, com casca, crua' },
              ],
            ],
          },
        ],
      },
    })
    const cafe = within(screen.getByRole('region', { name: '07:00 Café da manhã' }))
    const linha = (nome: string) => cafe.getByText(nome).closest('li')?.textContent
    expect(linha('Pão francês')).toBe('1 unidade e meiaPão francês')
    expect(linha('Margarina com sal')).toBe('1 ponta de facaMargarina com sal')
    expect(linha('Banana prata')).toBe('1 unidade e meiaBanana prata')
    expect(linha('Maçã Fuji com casca')).toBe('3 fatias e meiaMaçã Fuji com casca')
  })

  it('CA-750: produto do nutricionista e alimento removido saem como foram guardados', async () => {
    await abrirMeuPlano({
      dieta: {
        ...DIETA,
        refeicoes: [
          {
            horario: '10:00',
            nome: 'Lanche',
            opcoes: [
              [
                { medida: null, gramas: 45, alimento: 'Barra de proteína da Ana, sabor cacau' },
                { medida: '2 unidades', gramas: 60, alimento: 'Pão, de queijo, nome antigo' },
                { medida: null, gramas: 80, alimento: 'Alimento removido' },
              ],
            ],
          },
        ],
      },
    })
    const lanche = within(screen.getByRole('region', { name: '10:00 Lanche' }))
    expect(lanche.getByText('Barra de proteína da Ana, sabor cacau').closest('li')?.textContent).toBe('45 gBarra de proteína da Ana, sabor cacau')
    expect(lanche.getByText('Pão, de queijo, nome antigo').closest('li')?.textContent).toBe('2 unidadesPão, de queijo, nome antigo')
    expect(lanche.getByText('Alimento removido').closest('li')?.textContent).toBe('80 gAlimento removido')
  })

  it('CA-751: desenhar "Meu plano" não muda a cópia guardada; marcar grava a mesma dieta', async () => {
    const copia = structuredClone(DIETA)
    const { usuario, salvos } = await abrirMeuPlano({ dieta: copia })
    expect(copia).toEqual(DIETA)
    await usuario.click(screen.getByRole('tab', { name: 'Missões' }))
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    expect(salvos[0]?.dieta).toEqual(DIETA)
  })

  it('CA-752: o alimento continua em letra de 16 px (text-base) e a medida em destaque, em cima do nome', async () => {
    await abrirMeuPlano()
    const linha = within(screen.getByRole('region', { name: '12:00 Almoço' })).getByText('Arroz branco cozido').closest('li')
    expect(linha?.className).toContain('text-base')
    expect(linha?.firstElementChild?.textContent).toBe('6 colheres de sopa')
  })

  it('CA-928 (spec conduta-da-nutricionista) e D-319 (integracao-rodada-1910): plano em "Gramas" chega sem medida e marcado, e cada alimento mostra só o peso', async () => {
    const emGramas = DIETA.refeicoes.map((r) => ({ ...r, opcoes: r.opcoes.map((o) => o.map((i) => ({ ...i, medida: null }))) }))
    await abrirMeuPlano({ dieta: { ...DIETA, refeicoes: emGramas, quantidades: 'gramas' } })
    const almoco = within(screen.getByRole('region', { name: '12:00 Almoço' }))
    expect(almoco.getByText('150 g').tagName).toBe('STRONG')
    expect(almoco.queryByText(/colheres/)).not.toBeInTheDocument()
  })

  it('CB-156: alimento sem medida caseira mostra só o peso', async () => {
    await abrirMeuPlano()
    const jantar = within(screen.getByRole('region', { name: '19:00 Jantar' }))
    expect(jantar.getByText('80 g').tagName).toBe('STRONG')
    expect(jantar.queryByText(/· 80 g/)).not.toBeInTheDocument()
    expect(jantar.getByText('Macarrão (peso cru)')).toBeInTheDocument()
  })

  it('CA-532 e CA-645 (spec impressao-do-plano): as opções vêm uma depois da outra, com "Opção 1" e "ou Opção N"', async () => {
    await abrirMeuPlano()
    const almoco = screen.getByRole('region', { name: '12:00 Almoço' })
    expect(within(almoco).getByText('Opção 1')).toBeInTheDocument()
    expect(within(almoco).getAllByText(/^ou Opção \d$/).map((e) => e.textContent)).toEqual(['ou Opção 2', 'ou Opção 3'])
    const texto = almoco.textContent ?? ''
    expect(texto.indexOf('Opção 1')).toBeLessThan(texto.indexOf('Feijão'))
    expect(texto.indexOf('Feijão')).toBeLessThan(texto.indexOf('ou Opção 2'))
    expect(texto.indexOf('ou Opção 2')).toBeLessThan(texto.indexOf('Batata'))
    expect(texto.indexOf('ou Opção 3')).toBeLessThan(texto.indexOf('Mandioca'))
    // Uma opção só: sem rótulo e sem "ou".
    const jantar = within(screen.getByRole('region', { name: '19:00 Jantar' }))
    expect(jantar.queryByText(/Opção/)).not.toBeInTheDocument()
    expect(jantar.queryByText(/^ou/)).not.toBeInTheDocument()
  })

  it('CA-533: orientações e receitas aparecem com as quebras de linha que o nutricionista escreveu', async () => {
    await abrirMeuPlano()
    const orientacoes = screen.getByRole('region', { name: 'Orientações' })
    expect(within(orientacoes).getByRole('heading', { name: 'Orientações' })).toBeInTheDocument()
    expect(within(orientacoes).getByText(/Beber água ao longo do dia/).textContent).toBe('Beber água ao longo do dia.\nEvitar fritura.')
    expect(within(screen.getByRole('region', { name: 'Receitas' })).getByText('Bolo de banana: 2 ovos, 3 bananas.')).toBeInTheDocument()
  })

  it('CA-533: sem orientações e sem receitas, as seções não aparecem', async () => {
    await abrirMeuPlano({ dieta: { ...DIETA, orientacoes: '', receitas: '' } })
    expect(screen.queryByRole('region', { name: 'Orientações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Receitas' })).not.toBeInTheDocument()
  })

  it('CA-534: "Meu plano" não mostra kcal, macro nem nutriente', async () => {
    await abrirMeuPlano()
    expect(document.body.textContent).not.toMatch(/kcal|prote[ií]na|carboidrato|gordura|lip[ií]dio|nutriente/i)
  })

  it('CA-554: nome da refeição, alimento, orientações e receitas quebram em qualquer ponto (endereço longo não empurra a página)', async () => {
    const longo = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/view?usp=sharing'
    await abrirMeuPlano({
      dieta: {
        refeicoes: [{ horario: '12:00', nome: longo, opcoes: [[{ medida: null, gramas: 50, alimento: `${longo}#alimento` }]] }],
        orientacoes: `${longo}#orientacoes`,
        receitas: `${longo}#receitas`,
        copiadaEm: '2026-10-14',
      },
    })
    for (const texto of [longo, `${longo}#alimento`, `${longo}#orientacoes`, `${longo}#receitas`]) {
      expect(screen.getByText(texto).className, texto).toContain('[overflow-wrap:anywhere]')
    }
  })

  it('CA-538: o fim da parte diz o dia da cópia por extenso', async () => {
    await abrirMeuPlano()
    expect(screen.getByText('Atualizado em 14 de outubro de 2026.')).toBeInTheDocument()
  })

  it('CA-537: link de estudante mantém o aviso de estágio em "Meu plano"', async () => {
    await abrirMeuPlano({ usoNaoComercial: true })
    expect(screen.getByText(/estágio de nutrição/i)).toBeInTheDocument()
  })

  it('voltar para "Missões" mostra as missões de novo, e marcar continua gravando só as marcações', async () => {
    const { usuario, salvos } = await abrirMeuPlano()
    await usuario.click(screen.getByRole('tab', { name: 'Missões' }))
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    expect(salvos[0]?.marcacoes).toEqual([{ dia: HOJE, feitas: ['agua'] }])
    expect(salvos[0]?.dieta).toEqual(DIETA)
  })

  it('CA-536: link sem dieta (desligada, antigo ou banco sem o 012) é a tela de missões de hoje, sem seletor', async () => {
    const { fonte } = fonteFalsa(acompanhamento({ dieta: null }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    expect(await screen.findByRole('heading', { name: 'Suas missões de hoje, Ana' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('Meu plano')).not.toBeInTheDocument()
  })

  it('CB-159: dieta vazia conta como sem dieta; só com orientações, "Meu plano" mostra as orientações', async () => {
    const vazia: DietaDoLink = { refeicoes: [], orientacoes: '', receitas: '', copiadaEm: '2026-10-14' }
    const { fonte } = fonteFalsa(acompanhamento({ dieta: vazia }))
    const { unmount } = render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    await screen.findByRole('heading', { name: /missões de hoje/ })
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    unmount()

    await abrirMeuPlano({ dieta: { ...vazia, orientacoes: 'Beber água.' } })
    expect(screen.getByText('Beber água.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /^\d\d:\d\d / })).not.toBeInTheDocument()
  })
})

describe('Link do paciente sem internet (spec revisao-geral-publica, D-232)', () => {
  it('CA-753: sem resposta da nuvem e sem cópia, diz que não conseguiu abrir e oferece tentar de novo', async () => {
    let semInternet = true
    const fonte: FonteAcompanhamentos = {
      naNuvem: true,
      porToken: () => (semInternet ? Promise.reject(new LinkSemConexao()) : Promise.resolve(acompanhamento())),
      salvar: (a) => Promise.resolve(a),
    }
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Não foi possível abrir suas missões' })).toBeInTheDocument()
    expect(screen.getByText('Confira a internet do celular e tente de novo.')).toBeInTheDocument()
    expect(screen.queryByText('Este link não existe mais')).not.toBeInTheDocument()

    // CB-235: tentar de novo ainda sem internet volta à mesma tela.
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Não foi possível abrir suas missões' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tentar de novo' })).toHaveLength(1)

    semInternet = false
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Suas missões de hoje, Ana' })).toBeInTheDocument()
  })

  it('CA-755: a nuvem respondeu que o link não existe: continua "Este link não existe mais"', async () => {
    const { fonte } = fonteFalsa(null, true)
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Este link não existe mais' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('CA-756: a marcação que a nuvem não gravou volta atrás e a tela avisa; com a internet, salva e o aviso some', async () => {
    let semInternet = true
    const salvos: Acompanhamento[] = []
    const fonte: FonteAcompanhamentos = {
      naNuvem: true,
      porToken: () => Promise.resolve(acompanhamento()),
      salvar: (a) => {
        if (semInternet) return Promise.reject(new LinkSemConexao())
        salvos.push(a)
        return Promise.resolve(a)
      },
    }
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    const agua = await screen.findByRole('button', { name: /litros de água/ })
    await usuario.click(agua)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar. Confira a internet e marque de novo.')
    expect(agua).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    semInternet = false
    await usuario.click(agua)
    expect(agua).toHaveAttribute('aria-pressed', 'true')
    expect(salvos[0]?.marcacoes).toEqual([{ dia: HOJE, feitas: ['agua'] }])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('M-3b (CA-756): a nuvem recusou por um motivo dela: a tela mostra o motivo e diz com quem falar, sem mandar marcar de novo', async () => {
    const fonte: FonteAcompanhamentos = {
      naNuvem: true,
      porToken: () => Promise.resolve(acompanhamento()),
      salvar: () => Promise.reject(new MarcacaoRecusada('Este link já guarda marcações demais.')),
    }
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    const agua = await screen.findByRole('button', { name: /litros de água/ })
    await usuario.click(agua)
    expect(await screen.findByRole('alert')).toHaveTextContent('Este link já guarda marcações demais. Fale com quem montou seu plano.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Confira a internet')
    expect(agua).toHaveAttribute('aria-pressed', 'false')
  })

  it('CB-236 (M-4): a primeira marcação falha depois de a segunda salvar com ela junto: a tela relê e fica como a nuvem, sem aviso', async () => {
    let nuvem = acompanhamento()
    const pendentes: (() => void)[] = []
    const fonte: FonteAcompanhamentos = {
      naNuvem: true,
      porToken: () => Promise.resolve(nuvem),
      salvar: (a) => {
        const soAgua = a.marcacoes.some((m) => m.feitas.includes('agua')) && !a.marcacoes.some((m) => m.feitas.includes('refeicao-1'))
        if (soAgua) return new Promise((_, rejeitar) => pendentes.push(() => rejeitar(new LinkSemConexao())))
        nuvem = a
        return Promise.resolve(a)
      },
    }
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    const agua = await screen.findByRole('button', { name: /litros de água/ })
    const cafe = screen.getByRole('button', { name: /Café da manhã/ })
    await usuario.click(agua)
    await usuario.click(cafe)
    await act(async () => {
      pendentes.shift()?.()
      await new Promise((fim) => setTimeout(fim, 0))
    })
    // A segunda levou a lista inteira: a água chegou à nuvem por ela, e a tela concorda.
    expect(agua).toHaveAttribute('aria-pressed', 'true')
    expect(cafe).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('M-4: a resposta se perdeu, mas a nuvem gravou: a tela relê, a marca fica e não há aviso', async () => {
    let nuvem = acompanhamento()
    const fonte: FonteAcompanhamentos = {
      naNuvem: true,
      porToken: () => Promise.resolve(nuvem),
      salvar: (a) => {
        nuvem = a
        return Promise.reject(new LinkSemConexao())
      },
    }
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    const agua = await screen.findByRole('button', { name: /litros de água/ })
    await usuario.click(agua)
    await act(async () => {
      await new Promise((fim) => setTimeout(fim, 0))
    })
    expect(agua).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('M-4: sem conseguir reler, desfaz só aquela missão e avisa', async () => {
    let leituras = 0
    const fonte: FonteAcompanhamentos = {
      naNuvem: true,
      porToken: () => (++leituras === 1 ? Promise.resolve(acompanhamento({ marcacoes: [{ dia: HOJE, feitas: ['refeicao-1'] }] })) : Promise.reject(new LinkSemConexao())),
      salvar: () => Promise.reject(new LinkSemConexao()),
    }
    const usuario = userEvent.setup()
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    const agua = await screen.findByRole('button', { name: /litros de água/ })
    await usuario.click(agua)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar. Confira a internet e marque de novo.')
    expect(agua).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Café da manhã/ })).toHaveAttribute('aria-pressed', 'true')
    expect(leituras).toBe(2)
  })

  it('CA-757: a tela do paciente tem a região principal', async () => {
    const { fonte } = fonteFalsa(acompanhamento())
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)
    await screen.findByRole('heading', { name: 'Suas missões de hoje, Ana' })
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }))
  })
})
