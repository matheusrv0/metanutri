import { criarAcompanhamento, type Acompanhamento } from './acompanhamento.ts'
import { CHAVE_MUDANCAS, juntarCopias, lerMudancas, registrarMudanca } from './copiaDaConta.ts'
import { criarPacienteVazio, criarRepositorioPacientes, type Paciente } from './pacientes.ts'
import type { Backup } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import {
  agendaDaSemana,
  agoraEmBrasilia,
  aniversarioNaJanela,
  consultaPassou,
  escreverConsulta,
  lerConsulta,
  maiuscula,
  quando,
  somarDias,
  ultimoLinkPorPaciente,
  pacienteDoAcompanhamento,
} from './retorno.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const ficha = (id: string, nome: string, mudanca: Partial<Paciente> = {}): Paciente => ({ ...criarPacienteVazio(id, '2026-10-01T12:00:00.000Z'), nome, ...mudanca })

/** Quarta, 14/10/2026, 10h em Brasília (13h em UTC). */
const AGORA = agoraEmBrasilia(new Date('2026-10-14T13:00:00.000Z'))

describe('O campo da próxima consulta (D-143)', () => {
  it('CA-513: dia e horário viram AAAA-MM-DDTHH:MM; só o dia, AAAA-MM-DD', () => {
    expect(escreverConsulta('2026-10-16', '14:30')).toBe('2026-10-16T14:30')
    expect(escreverConsulta('2026-10-16', '')).toBe('2026-10-16')
    expect(lerConsulta('2026-10-16T14:30')).toEqual({ dia: '2026-10-16', hora: '14:30' })
    expect(lerConsulta('2026-10-16')).toEqual({ dia: '2026-10-16', hora: null })
  })

  it('CB-149: horário com segundos fica HH:MM; horário sem dia não é guardado', () => {
    expect(escreverConsulta('2026-10-16', '14:30:00')).toBe('2026-10-16T14:30')
    expect(escreverConsulta('', '14:30')).toBeNull()
    expect(escreverConsulta('2026-10-16', '25:00')).toBe('2026-10-16')
  })

  it('CA-526: valor estragado ou ausente lê como "sem consulta"', () => {
    for (const estragado of [undefined, null, '', 'amanhã', 42, '2026-13-40', '2026-02-30', '2026-10-16T25:00', '2026-10-16T14:60', '2026-10-16T14:30:00', { dia: '2026-10-16' }]) {
      expect(lerConsulta(estragado), String(estragado)).toBeNull()
    }
  })

  it('CA-526: ficha gravada antes do campo, ou com ele estragado, abre sem consulta', () => {
    const arm = new Memoria()
    arm.setItem(
      'metanutri:pacientes',
      JSON.stringify([
        { id: 'velha', nome: 'Ana', criadoEm: '2026-09-01T00:00:00.000Z', atualizadoEm: '2026-09-01T00:00:00.000Z' },
        { id: 'estragada', nome: 'Bia', proximaConsulta: 'amanhã', criadoEm: '2026-09-01T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z' },
        { id: 'boa', nome: 'Caio', proximaConsulta: '2026-10-16T14:30', criadoEm: '2026-09-01T00:00:00.000Z', atualizadoEm: '2026-09-03T00:00:00.000Z' },
      ]),
    )
    const repo = criarRepositorioPacientes(arm)
    expect(repo.obter('velha')?.proximaConsulta).toBeNull()
    expect(repo.obter('estragada')?.proximaConsulta).toBeNull()
    expect(repo.obter('boa')?.proximaConsulta).toBe('2026-10-16T14:30')
    expect(criarPacienteVazio('nova', '2026-10-14T00:00:00.000Z').proximaConsulta).toBeNull()
  })

  it('CA-513: marcar a consulta pela ficha muda o atualizadoEm (a ficha vai para a nuvem)', () => {
    const horas = ['2026-10-14T12:00:00.000Z', '2026-10-14T12:05:00.000Z']
    const repo = criarRepositorioPacientes(new Memoria(), { agora: () => horas.shift() ?? 'fim', gerarId: () => 'ana' })
    const criada = repo.criar('Ana')
    const salva = repo.salvar({ ...criada, proximaConsulta: '2026-10-16T14:30' })
    expect(salva.atualizadoEm).toBe('2026-10-14T12:05:00.000Z')
    expect(repo.obter('ana')?.proximaConsulta).toBe('2026-10-16T14:30')
  })
})

describe('A próxima consulta na nuvem (CA-525)', () => {
  const T = (hora: number) => `2026-10-14T${String(hora).padStart(2, '0')}:00:00.000Z`
  const copia = (dados: Record<string, string>): Backup => ({ formato: 1, geradoEm: T(0), dados })
  const mudancas = (alterados: Record<string, string>) => JSON.stringify({ alterados, excluidos: {} })

  it('mudar só a próxima consulta já marca a ficha como mudada', () => {
    const arm = new Memoria()
    const antes = JSON.stringify([ficha('ana', 'Ana')])
    const depois = JSON.stringify([ficha('ana', 'Ana', { proximaConsulta: '2026-10-16T14:30' })])
    registrarMudanca(arm, 'metanutri:pacientes', antes, depois, T(3))
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS)).alterados).toEqual({ 'pacientes/ana': T(3) })
  })

  it('a mesma ficha mudada nos dois aparelhos: fica a consulta da mudança mais nova, inteira', () => {
    const daqui = (hora: number) =>
      copia({
        'metanutri:pacientes': JSON.stringify([ficha('ana', 'Ana', { proximaConsulta: '2026-10-16T14:30', atualizadoEm: T(hora) })]),
        [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(hora) }),
      })
    const daNuvem = (hora: number) =>
      copia({
        'metanutri:pacientes': JSON.stringify([ficha('ana', 'Ana', { proximaConsulta: '2026-10-20', atualizadoEm: T(hora) })]),
        [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(hora) }),
      })
    const consultaDe = (c: Backup) => {
      const arm = new Memoria()
      arm.setItem('metanutri:pacientes', c.dados['metanutri:pacientes'] ?? '[]')
      return criarRepositorioPacientes(arm).obter('ana')?.proximaConsulta
    }
    expect(consultaDe(juntarCopias(daqui(5), daNuvem(4), T(6)))).toBe('2026-10-16T14:30')
    expect(consultaDe(juntarCopias(daqui(4), daNuvem(5), T(6)))).toBe('2026-10-20')
  })
})

describe('Hoje em Brasília (D-144)', () => {
  it('CA-523: 23h30 de 15/10 em Brasília ainda é 15/10, mesmo já sendo 16/10 em UTC', () => {
    expect(agoraEmBrasilia(new Date('2026-10-16T02:30:00.000Z'))).toEqual({ dia: '2026-10-15', hora: '23:30' })
    expect(agoraEmBrasilia(new Date('2026-10-15T03:00:00.000Z'))).toEqual({ dia: '2026-10-15', hora: '00:00' })
  })

  it('CB-147: somar dias atravessa a virada de mês e de ano', () => {
    expect(somarDias('2026-12-29', 3)).toBe('2027-01-01')
    expect(somarDias('2026-02-28', 1)).toBe('2026-03-01')
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('D-145: com horário, passa quando o horário passa; sem horário, quando o dia acaba', () => {
    expect(consultaPassou({ dia: '2026-10-14', hora: '09:59' }, AGORA)).toBe(true)
    expect(consultaPassou({ dia: '2026-10-14', hora: '10:00' }, AGORA)).toBe(false)
    expect(consultaPassou({ dia: '2026-10-14', hora: null }, AGORA)).toBe(false)
    expect(consultaPassou({ dia: '2026-10-13', hora: null }, AGORA)).toBe(true)
    expect(consultaPassou({ dia: '2026-10-15', hora: '08:00' }, AGORA)).toBe(false)
  })

  it('o quando: hoje, amanhã, dia da semana até 6 dias, depois só a data', () => {
    const hoje = '2026-10-14'
    expect(quando({ dia: '2026-10-14', hora: '14:30' }, hoje)).toBe('hoje às 14:30')
    expect(quando({ dia: '2026-10-15', hora: null }, hoje)).toBe('amanhã')
    expect(quando({ dia: '2026-10-16', hora: '10:00' }, hoje)).toBe('sexta, 16/10 às 10:00')
    expect(quando({ dia: '2026-10-17', hora: null }, hoje)).toBe('sábado, 17/10')
    expect(quando({ dia: '2026-10-20', hora: null }, hoje)).toBe('terça, 20/10')
    expect(quando({ dia: '2026-10-30', hora: null }, hoje)).toBe('30/10')
    expect(quando({ dia: '2027-01-05', hora: '08:00' }, hoje)).toBe('05/01/2027 às 08:00')
    expect(quando({ dia: '2026-10-10', hora: null }, hoje)).toBe('10/10')
    expect(maiuscula('sexta, 16/10')).toBe('Sexta, 16/10')
  })
})

describe('Aniversário (D-148)', () => {
  it('CA-522: o aniversário de hoje até 6 dias, no dia dele', () => {
    expect(aniversarioNaJanela('1990-10-14', '2026-10-14')).toBe('2026-10-14')
    expect(aniversarioNaJanela('1985-10-17', '2026-10-14')).toBe('2026-10-17')
    expect(aniversarioNaJanela('1985-10-20', '2026-10-14')).toBe('2026-10-20')
    expect(aniversarioNaJanela('1985-10-21', '2026-10-14')).toBeNull()
    expect(aniversarioNaJanela('1985-10-13', '2026-10-14')).toBeNull()
  })

  it('CB-146: 29/02 aparece em 28/02 no ano que não é bissexto', () => {
    expect(aniversarioNaJanela('2000-02-29', '2027-02-26')).toBe('2027-02-28')
    expect(aniversarioNaJanela('2000-02-29', '2028-02-26')).toBe('2028-02-29')
  })

  it('CB-147: a janela atravessa a virada do ano', () => {
    expect(aniversarioNaJanela('1990-01-02', '2026-12-29')).toBe('2027-01-02')
  })

  it('nascimento vazio, inválido, no futuro ou de hoje não gera aniversário', () => {
    for (const nascimento of [null, '', '1990-02-30', 'ontem', '2027-10-15', '2026-10-14']) {
      expect(aniversarioNaJanela(nascimento, '2026-10-14'), String(nascimento)).toBeNull()
    }
  })
})

describe('A agenda da semana (D-146)', () => {
  it('CA-519 e CA-520: consultas de hoje até 6 dias, por dia e horário; as passadas e as de 7 dias em diante ficam de fora', () => {
    const pacientes = [
      ficha('ana', 'Ana', { proximaConsulta: '2026-10-14T16:00' }),
      ficha('bia', 'Bia', { proximaConsulta: '2026-10-15T09:00' }),
      ficha('caio', 'Caio', { proximaConsulta: '2026-10-16T10:00' }),
      ficha('duda', 'Duda', { proximaConsulta: '2026-10-20T08:00' }),
      ficha('edu', 'Edu', { proximaConsulta: '2026-10-21T08:00' }),
      ficha('fabi', 'Fabi', { proximaConsulta: '2026-10-14T09:00' }),
      ficha('gabi', 'Gabi', { proximaConsulta: '2026-10-13' }),
      ficha('hugo', 'Hugo', { proximaConsulta: '2026-10-14' }),
      ficha('ivo', 'Ivo'),
    ]
    const agenda = agendaDaSemana(pacientes, AGORA)
    expect(agenda.map((i) => `${i.tipo} ${i.paciente.nome} ${i.dia} ${i.hora ?? '-'}`)).toEqual([
      'consulta Hugo 2026-10-14 -',
      'consulta Ana 2026-10-14 16:00',
      'consulta Bia 2026-10-15 09:00',
      'consulta Caio 2026-10-16 10:00',
      'consulta Duda 2026-10-20 08:00',
    ])
  })

  it('CA-522: aniversários entram no mesmo bloco, antes das consultas do mesmo dia', () => {
    const pacientes = [
      ficha('ana', 'Ana', { proximaConsulta: '2026-10-14T16:00' }),
      ficha('ivo', 'Ivo', { nascimento: '1990-10-14' }),
      ficha('juca', 'Juca', { nascimento: '1985-10-17' }),
      ficha('lia', 'Lia', { nascimento: '1990-10-21' }),
    ]
    expect(agendaDaSemana(pacientes, AGORA).map((i) => `${i.tipo} ${i.paciente.nome} ${i.dia}`)).toEqual([
      'aniversario Ivo 2026-10-14',
      'consulta Ana 2026-10-14',
      'aniversario Juca 2026-10-17',
    ])
  })

  it('CA-518: sem consulta nem aniversário na semana, a agenda é vazia', () => {
    expect(agendaDaSemana([ficha('ana', 'Ana', { proximaConsulta: '2026-11-01', nascimento: '1990-05-05' })], AGORA)).toEqual([])
    expect(agendaDaSemana([], AGORA)).toEqual([])
  })

  it('CA-523: perto da meia-noite, hoje é o dia de Brasília', () => {
    const tarde = agoraEmBrasilia(new Date('2026-10-16T02:30:00.000Z'))
    const pacientes = [ficha('ana', 'Ana', { proximaConsulta: '2026-10-15' }), ficha('bia', 'Bia', { proximaConsulta: '2026-10-16T08:00' })]
    const agenda = agendaDaSemana(pacientes, tarde)
    expect(agenda.map((i) => quando(i, tarde.dia))).toEqual(['hoje', 'amanhã às 08:00'])
  })

  it('CB-147: a consulta de 02/01 aparece no fim de dezembro', () => {
    const fimDoAno = agoraEmBrasilia(new Date('2026-12-29T15:00:00.000Z'))
    expect(agendaDaSemana([ficha('ana', 'Ana', { proximaConsulta: '2027-01-02T09:00' })], fimDoAno)).toHaveLength(1)
  })
})

describe('O link de cada paciente (D-147)', () => {
  let n = 0
  const link = (casoId: string, pacienteId: string | null, criadoEm: string): Acompanhamento => {
    n += 1
    return criarAcompanhamento({ casoId, pacienteId, nome: 'x', missoes: [] }, { agora: () => criadoEm, gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) })
  }

  it('D-147: o paciente do plano primeiro; o do link só quando o plano não tem paciente ou não existe', () => {
    const casos = [
      { id: 'c1', pacienteId: 'p-bia' },
      { id: 'c2', pacienteId: 'p2' },
      { id: 'c4', pacienteId: null },
    ]
    // O plano foi trocado de Ana para Bia depois de gerar o link: vale Bia.
    expect(pacienteDoAcompanhamento(link('c1', 'p-ana', '2026-10-01T00:00:00.000Z'), casos)).toBe('p-bia')
    expect(pacienteDoAcompanhamento(link('c2', null, '2026-10-01T00:00:00.000Z'), casos)).toBe('p2')
    expect(pacienteDoAcompanhamento(link('c3', 'p7', '2026-10-01T00:00:00.000Z'), casos)).toBe('p7')
    expect(pacienteDoAcompanhamento(link('c4', 'p8', '2026-10-01T00:00:00.000Z'), casos)).toBe('p8')
    expect(pacienteDoAcompanhamento(link('c5', null, '2026-10-01T00:00:00.000Z'), casos)).toBeNull()
  })

  it('CB-145: com dois links, vale o criado por último', () => {
    const velho = link('c1', 'p1', '2026-09-01T00:00:00.000Z')
    const novo = link('c2', 'p1', '2026-10-01T00:00:00.000Z')
    const doPlano = link('c3', null, '2026-10-02T00:00:00.000Z')
    const mapa = ultimoLinkPorPaciente([velho, novo, doPlano], [{ id: 'c3', pacienteId: 'p2' }])
    expect(mapa.get('p1')?.id).toBe(novo.id)
    expect(mapa.get('p2')?.id).toBe(doPlano.id)
    expect(ultimoLinkPorPaciente([novo, velho], []).get('p1')?.id).toBe(novo.id)
  })
})
