// A semana do paciente no link (spec lado-do-paciente, D-1207 e CA-2211).
import { criarAcompanhamento, diasMarcadosNaSemana, estadoDoAcompanhamento, type Acompanhamento, type MarcacaoDia } from './acompanhamento.ts'
import type { Missao } from './missoes.ts'
import { datasDaSemana, diasDaSemana, fraseDaMeta, pontosDaSemana, semanasAnteriores, textoDosDias, ultimosSeteDias } from './semanaDoPaciente.ts'

const MISSOES: readonly Missao[] = ['cafe', 'almoco', 'lanche', 'jantar', 'frutas', 'agua'].map((id) => ({ id, texto: id, origem: 'Refeição do plano' }))

function link(marcacoes: readonly MarcacaoDia[]): Acompanhamento {
  return { ...criarAcompanhamento({ casoId: 'c', pacienteId: 'p', nome: 'Juliana', missoes: MISSOES }, { agora: () => '2026-09-01T10:00:00.000Z' }), marcacoes }
}

// Terça, 3 de novembro de 2026: a semana do protótipo (qua 28/10 a ter 3/11).
const HOJE = '2026-11-03'
const SEMANA = link([
  { dia: '2026-10-28', feitas: ['cafe', 'almoco', 'lanche', 'jantar'] },
  { dia: '2026-10-30', feitas: ['cafe', 'almoco', 'lanche', 'jantar', 'agua'] },
  { dia: '2026-11-03', feitas: ['cafe', 'agua'] },
])

describe('CA-2211: os últimos 7 dias', () => {
  it('CA-2211: de quarta 28 a terça 3, hoje por último e com o contorno', () => {
    const dias = ultimosSeteDias(SEMANA, HOJE)
    expect(dias.map((d) => `${d.nome} ${d.numero}`)).toEqual(['qua 28', 'qui 29', 'sex 30', 'sáb 31', 'dom 1', 'seg 2', 'ter 3'])
    expect(dias.map((d) => d.hoje)).toEqual([false, false, false, false, false, false, true])
  })

  it('CA-2211: as missões de cada dia ("4/6"), e um traço no dia sem missão, nunca zero', () => {
    expect(ultimosSeteDias(SEMANA, HOJE).map((d) => d.texto)).toEqual(['4/6', '–', '5/6', '–', '–', '–', '2/6'])
  })

  it('CA-2211: o leitor de tela ouve o dia e as missões', () => {
    const dias = ultimosSeteDias(SEMANA, HOJE)
    expect(dias[0]?.rotulo).toBe('qua, 28: 4 de 6 missões')
    expect(dias[1]?.rotulo).toBe('qui, 29: nenhuma missão')
    expect(dias[6]?.rotulo).toBe('ter, 3: 2 de 6 missões, hoje')
  })

  it('CA-2211: "3 de 7 dias", com a frase da meta', () => {
    expect(textoDosDias(diasDaSemana(SEMANA, HOJE))).toBe('3 de 7 dias')
    expect(fraseDaMeta(3)).toBe('A meta é 4 dias.')
    expect(fraseDaMeta(4)).toBe('Dentro da meta.')
    expect(fraseDaMeta(7)).toBe('Dentro da meta.')
  })

  it('CA-2211: os números batem com a Adesão da nutricionista para o mesmo paciente e o mesmo dia', () => {
    for (const hoje of ['2026-10-28', '2026-10-31', '2026-11-03', '2026-11-09']) {
      const dias = ultimosSeteDias(SEMANA, hoje).filter((d) => d.feitas > 0).length
      expect(dias).toBe(diasMarcadosNaSemana(SEMANA, hoje))
      expect(diasDaSemana(SEMANA, hoje)).toBe(diasMarcadosNaSemana(SEMANA, hoje))
    }
    // E o estado da Adesão sai da mesma conta: 3 dias na semana, abaixo dos 4, é "atenção".
    expect(estadoDoAcompanhamento(SEMANA, HOJE)).toBe('atencao')
  })

  it('CA-2203: os pontos da linha da semana em Hoje', () => {
    expect(pontosDaSemana(SEMANA, HOJE)).toEqual([true, false, true, false, false, false, true])
  })
})

describe('D-1207: as 4 semanas anteriores', () => {
  const ANTES = link([
    { dia: '2026-10-21', feitas: ['cafe'] },
    { dia: '2026-10-22', feitas: ['cafe'] },
    { dia: '2026-10-24', feitas: ['agua'] },
    { dia: '2026-10-25', feitas: ['agua'] },
    { dia: '2026-10-27', feitas: ['cafe'] },
    { dia: '2026-10-01', feitas: ['cafe'] },
  ])

  it('D-1207: quatro semanas de 7 dias, da mais recente para a mais antiga, com as datas', () => {
    expect(semanasAnteriores(ANTES, HOJE).map((s) => s.datas)).toEqual(['21 a 27 de out.', '14 a 20 de out.', '7 a 13 de out.', '30/9 a 6 de out.'])
  })

  it('D-1207: os dias marcados de cada semana, "5 dias" e "1 dia"', () => {
    const semanas = semanasAnteriores(ANTES, HOJE)
    expect(semanas.map((s) => s.texto)).toEqual(['5 dias', '0 dias', '0 dias', '1 dia'])
    expect(semanas[0]?.pontos).toEqual([true, true, false, true, true, false, true])
  })

  it('D-1207: duas datas no mesmo mês e em meses diferentes', () => {
    expect(datasDaSemana('2026-10-21', '2026-10-27')).toBe('21 a 27 de out.')
    expect(datasDaSemana('2026-09-30', '2026-10-06')).toBe('30/9 a 6 de out.')
    expect(datasDaSemana('2026-12-29', '2027-01-04')).toBe('29/12 a 4 de jan.')
  })
})
