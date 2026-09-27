import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento, marcarMissao, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { Missao } from '@/domain/missoes.ts'
import type { FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
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

    expect(await screen.findByText(/Suas missões de hoje, Ana/)).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByText('Beber cerca de 2,1 litros de água')).toBeInTheDocument()
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

    expect(screen.getByText(/Dia fechado, Ana/)).toBeInTheDocument()
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
    expect(screen.getByText('A meta são 4 dias por semana.')).toBeInTheDocument()
  })

  it('quem está no ritmo recebe outra frase', async () => {
    const dias = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']
    const { fonte } = fonteFalsa(acompanhamento({ marcacoes: dias.map((dia) => ({ dia, feitas: ['agua'] })) }))
    render(<TelaMissoesPaciente token="abc" fonte={fonte} hoje={HOJE} />)

    expect(await screen.findByText(/no ritmo que seu nutricionista combinou/)).toBeInTheDocument()
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
