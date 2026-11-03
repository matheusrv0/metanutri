// Semana, no link do paciente (spec lado-do-paciente, D-1207 e CA-2211).
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { diasMarcadosNaSemana } from '@/domain/acompanhamento.ts'
import { abrirLink, HOJE, linkDeTeste } from './linkDeTeste.test-utils.tsx'

const MARCACOES = [
  { dia: '2026-10-21', feitas: ['agua'] },
  { dia: '2026-10-22', feitas: ['agua'] },
  { dia: '2026-10-28', feitas: ['refeicao-cafe', 'refeicao-almoco', 'refeicao-lanche', 'refeicao-jantar'] },
  { dia: '2026-10-30', feitas: ['refeicao-cafe', 'refeicao-almoco', 'refeicao-lanche', 'refeicao-jantar', 'agua'] },
  { dia: HOJE, feitas: ['refeicao-cafe', 'agua'] },
]

const abrirSemana = async (parcial = {}) => {
  abrirLink(linkDeTeste({ marcacoes: MARCACOES, ...parcial }))
  await userEvent.setup().click(screen.getByRole('link', { name: 'Semana' }))
}

describe('CA-2211: Semana', () => {
  it('CA-2211: "Sua semana", "3 de 7 dias" e "A meta é 4 dias."', async () => {
    await abrirSemana()
    expect(screen.getByRole('heading', { level: 1, name: 'Sua semana' })).toBeInTheDocument()
    expect(screen.getByText('3 de 7 dias')).toBeInTheDocument()
    expect(screen.getByText('A meta é 4 dias.')).toBeInTheDocument()
  })

  it('CA-2211: com 4 dias ou mais, "Dentro da meta."', async () => {
    await abrirSemana({ marcacoes: ['2026-10-31', '2026-11-01', '2026-11-02', HOJE].map((dia) => ({ dia, feitas: ['agua'] })) })
    expect(screen.getByText('4 de 7 dias')).toBeInTheDocument()
    expect(screen.getByText('Dentro da meta.')).toBeInTheDocument()
  })

  it('CA-2211: os 7 dias com as missões de cada um ("4/6"), um traço no dia sem missão, e hoje com contorno', async () => {
    await abrirSemana()
    const dias = within(screen.getByRole('list', { name: 'Missões feitas por dia' })).getAllByRole('listitem')
    expect(dias.map((d) => d.getAttribute('aria-label'))).toEqual([
      'qua, 28: 4 de 6 missões',
      'qui, 29: nenhuma missão',
      'sex, 30: 5 de 6 missões',
      'sáb, 31: nenhuma missão',
      'dom, 1: nenhuma missão',
      'seg, 2: nenhuma missão',
      'ter, 3: 2 de 6 missões, hoje',
    ])
    expect(dias.map((d) => d.children[1]?.textContent)).toEqual(['4/6', '–', '5/6', '–', '–', '–', '2/6'])
    expect(dias[6]?.className).toContain('ring-heading')
    expect(dias.slice(0, 6).every((d) => !d.className.includes('ring-heading'))).toBe(true)
  })

  it('CA-2211: as 4 semanas anteriores, com as datas e os dias marcados', async () => {
    await abrirSemana()
    expect(screen.getByRole('heading', { name: 'Semanas anteriores' })).toBeInTheDocument()
    const semanas = within(screen.getByRole('heading', { name: 'Semanas anteriores' }).nextElementSibling as HTMLElement).getAllByRole('listitem')
    expect(semanas.map((s) => s.textContent)).toEqual(['21 a 27 de out.2 dias', '14 a 20 de out.0 dias', '7 a 13 de out.0 dias', '30/9 a 6 de out.0 dias'])
  })

  it('CA-2211: os números batem com a Adesão da nutricionista para o mesmo paciente e o mesmo dia', async () => {
    await abrirSemana()
    expect(screen.getByText(`${diasMarcadosNaSemana(linkDeTeste({ marcacoes: MARCACOES }), HOJE)} de 7 dias`)).toBeInTheDocument()
  })

  it('CA-2211: a próxima consulta, quando há; sem ela, nada', async () => {
    await abrirSemana({ proximaConsulta: '2026-11-17T14:30' })
    expect(screen.getByText('Próxima consulta: terça, 17 de novembro, às 14:30')).toBeInTheDocument()
  })

  it('D-1207: sem cor de enfeite: o dia com missão é verde (estado), o dia sem missão é um traço', async () => {
    await abrirSemana()
    const dias = within(screen.getByRole('list', { name: 'Missões feitas por dia' })).getAllByRole('listitem')
    expect(dias[0]?.querySelector('.bg-stateok')).not.toBeNull()
    expect(dias[1]?.querySelector('.bg-stateok')).toBeNull()
  })
})
