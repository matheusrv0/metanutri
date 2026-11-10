// @vitest-environment node
// As regras dos avisos ao paciente (spec lado-do-paciente, D-1228 a D-1232): quando sai o lembrete, o resumo da semana e
// o aviso de plano atualizado, a janela de Brasília e o limite por endereço. Puro: o relógio chega de fora.
import { describe, expect, it } from 'vitest'
import {
  agendarPlanoAtualizado,
  avaliarLembrete,
  avaliarPlanoAtualizado,
  avaliarResumo,
  cabeNoEndereco,
  dentroDaJanela,
  emBrasilia,
  instanteEmBrasilia,
  porPrioridade,
  proximaJanela,
  proximoAviso,
  somarDias,
  type EstadoDoLembrete,
  type EstadoDoResumo,
} from '../../supabase/functions/_shared/avisos/regras.ts'
import type { MarcacaoDia } from '../../supabase/functions/_shared/adesao.ts'

/** Novembro de 2026: dia 1 é um domingo. */
const dia = (n: number): string => `2026-11-${String(n).padStart(2, '0')}`
const marcou = (...dias: number[]): MarcacaoDia[] => dias.map((n) => ({ dia: dia(n), feitas: ['agua'] }))
/** O instante de Brasília (UTC−3) do dia `n` de novembro, na hora dada. */
const as = (n: number, hora: number, minuto = 0): Date => instanteEmBrasilia(dia(n), hora, minuto)

describe('o relógio de Brasília (CB-1206, CB-1215)', () => {
  it('CB-1215: Brasília é UTC−3, sem horário de verão', () => {
    expect(emBrasilia(new Date('2026-11-04T02:30:00Z'))).toEqual({ dia: '2026-11-03', hora: 23, minuto: 30, diaDaSemana: 2 })
    expect(instanteEmBrasilia('2026-11-03', 8).toISOString()).toBe('2026-11-03T11:00:00.000Z')
  })

  it('CB-1206: o dia das regras é o de Brasília, não o do aparelho nem o UTC', () => {
    // 22h em Manaus (UTC−4) já é 23h em Brasília, e 2h do dia seguinte em UTC.
    expect(emBrasilia(new Date('2026-11-04T02:00:00Z')).dia).toBe('2026-11-03')
  })

  it('somarDias atravessa o mês', () => {
    expect(somarDias('2026-10-30', 3)).toBe('2026-11-02')
    expect(somarDias('2026-11-02', -3)).toBe('2026-10-30')
  })

  it('CA-2251: a janela é das 8h às 21h de Brasília', () => {
    expect(dentroDaJanela(as(3, 7, 59))).toBe(false)
    expect(dentroDaJanela(as(3, 8))).toBe(true)
    expect(dentroDaJanela(as(3, 20, 59))).toBe(true)
    expect(dentroDaJanela(as(3, 21))).toBe(false)
  })

  it('CA-2251: fora da janela, o envio vai para as 8h seguintes', () => {
    expect(proximaJanela(as(3, 7))).toEqual(as(3, 8))
    expect(proximaJanela(as(3, 12, 10))).toEqual(as(3, 12, 10))
    expect(proximaJanela(as(3, 21, 30))).toEqual(as(4, 8))
  })
})

const lembrete = (sobre: Partial<EstadoDoLembrete> = {}): EstadoDoLembrete => ({
  hoje: dia(4),
  marcacoes: marcou(1),
  aceitoEm: as(1, 9).toISOString(),
  planoEm: null,
  ultimoAcesso: dia(2),
  lembretes: [],
  ...sobre,
})

describe('o lembrete (D-1228)', () => {
  it('CA-2244: última marcação no dia 1 e o link não aberto no dia 4: às 18h do dia 4 sai o A3, com 3 dias', () => {
    expect(avaliarLembrete(lembrete())).toEqual({ tipo: 'A3', dias: 3 })
  })

  it('CA-2244: abriu o link no dia 4: o A3 não sai', () => {
    expect(avaliarLembrete(lembrete({ ultimoAcesso: dia(4) }))).toBeNull()
  })

  it('CA-2244: marcou no dia 3: o A3 não sai no dia 4', () => {
    expect(avaliarLembrete(lembrete({ marcacoes: marcou(1, 3) }))).toBeNull()
  })

  it('CA-2244: só o terceiro dia sem marcar: no dia 3 ainda não', () => {
    expect(avaliarLembrete(lembrete({ hoje: dia(3) }))).toBeNull()
  })

  it('CA-2245: o A3 no dia 4 e nenhuma marcação depois: o A4 sai no dia 8, e nunca antes', () => {
    const lembretes = [{ tipo: 'A3' as const, dia: dia(4) }]
    for (const n of [5, 6, 7]) expect(avaliarLembrete(lembrete({ hoje: dia(n), lembretes, ultimoAcesso: null }))).toBeNull()
    expect(avaliarLembrete(lembrete({ hoje: dia(8), lembretes, ultimoAcesso: null }))).toEqual({ tipo: 'A4', dias: 7 })
  })

  it('CA-2245: abriu o link nos dias 4 e 5: o A3 sai no dia 6 dizendo 5 dias, e o A4 no dia 9', () => {
    expect(avaliarLembrete(lembrete({ hoje: dia(4), ultimoAcesso: dia(4) }))).toBeNull()
    expect(avaliarLembrete(lembrete({ hoje: dia(5), ultimoAcesso: dia(5) }))).toBeNull()
    expect(avaliarLembrete(lembrete({ hoje: dia(6), ultimoAcesso: dia(5) }))).toEqual({ tipo: 'A3', dias: 5 })
    const lembretes = [{ tipo: 'A3' as const, dia: dia(6) }]
    expect(avaliarLembrete(lembrete({ hoje: dia(8), ultimoAcesso: dia(5), lembretes }))).toBeNull()
    expect(avaliarLembrete(lembrete({ hoje: dia(9), ultimoAcesso: dia(5), lembretes }))).toEqual({ tipo: 'A4', dias: 8 })
  })

  it('CA-2245: o A3 só diz de 3 a 6 dias; quem abriu todos os dias até o sétimo não recebe A3', () => {
    expect(avaliarLembrete(lembrete({ hoje: dia(7), ultimoAcesso: dia(6) }))).toEqual({ tipo: 'A3', dias: 6 })
    expect(avaliarLembrete(lembrete({ hoje: dia(8), ultimoAcesso: dia(7) }))).toBeNull()
  })

  it('CA-2245: depois do A4, nenhum lembrete até a próxima marcação; depois dela, a conta recomeça', () => {
    const lembretes = [
      { tipo: 'A3' as const, dia: dia(4) },
      { tipo: 'A4' as const, dia: dia(8) },
    ]
    for (const n of [9, 12, 20]) expect(avaliarLembrete(lembrete({ hoje: dia(n), lembretes, ultimoAcesso: null }))).toBeNull()
    expect(avaliarLembrete(lembrete({ hoje: dia(24), marcacoes: marcou(1, 21), lembretes, ultimoAcesso: null }))).toEqual({ tipo: 'A3', dias: 3 })
  })

  it('CA-2246: plano atualizado no dia 10: nenhum lembrete nos dias 10 e 11, e os 3 dias contam a partir do dia 10', () => {
    const base = { marcacoes: marcou(1), planoEm: as(10, 15).toISOString(), ultimoAcesso: null }
    expect(avaliarLembrete(lembrete({ ...base, hoje: dia(10) }))).toBeNull()
    expect(avaliarLembrete(lembrete({ ...base, hoje: dia(11) }))).toBeNull()
    expect(avaliarLembrete(lembrete({ ...base, hoje: dia(12) }))).toBeNull()
    expect(avaliarLembrete(lembrete({ ...base, hoje: dia(13) }))).toEqual({ tipo: 'A3', dias: 3 })
  })

  it('D-1228: a conta começa do aceite, quando ele é o mais recente', () => {
    const base = { marcacoes: [], aceitoEm: as(5, 20).toISOString(), ultimoAcesso: null }
    expect(avaliarLembrete(lembrete({ ...base, hoje: dia(7) }))).toBeNull()
    expect(avaliarLembrete(lembrete({ ...base, hoje: dia(8) }))).toEqual({ tipo: 'A3', dias: 3 })
  })

  it('CB-1207: marcou às 18h01, depois do lembrete: a conta recomeça com a marcação', () => {
    // O A3 saiu no dia 4 às 18h; às 18h01 ele marcou. O A3 do dia 4 não conta para a pausa nova.
    const lembretes = [{ tipo: 'A3' as const, dia: dia(4) }]
    const marcacoes = marcou(1, 4)
    expect(avaliarLembrete(lembrete({ hoje: dia(6), marcacoes, lembretes, ultimoAcesso: null }))).toBeNull()
    expect(avaliarLembrete(lembrete({ hoje: dia(7), marcacoes, lembretes, ultimoAcesso: null }))).toEqual({ tipo: 'A3', dias: 3 })
  })

  it('CA-2250: de manhã, a regra prevê o lembrete do dia sem olhar a abertura (ela só se sabe às 18h)', () => {
    expect(avaliarLembrete(lembrete({ ultimoAcesso: dia(4) }), { ignorarAcesso: true })).toEqual({ tipo: 'A3', dias: 3 })
  })
})

const resumo = (sobre: Partial<EstadoDoResumo> = {}): EstadoDoResumo => ({
  hoje: dia(12),
  marcacoes: marcou(5, 6, 8, 9, 10),
  missoes: 4,
  aceitoEm: as(5, 9, 43).toISOString(),
  diaDaSemana: 4,
  resumos: [],
  ...sobre,
})

describe('o resumo da semana (D-1229)', () => {
  it('CA-2247: aceite numa quinta: o A2 sai na quinta seguinte, com os 7 dias de quinta a quarta', () => {
    // 5/11/2026 é quinta; 12/11, a quinta seguinte.
    const r = avaliarResumo(resumo())
    expect(r).toMatchObject({ tipo: 'A2', dias: 5 })
    if (r === null || !('semana' in r)) throw new Error('o resumo devia sair')
    expect(r.semana.map((d) => d.dia)).toEqual([dia(5), dia(6), dia(7), dia(8), dia(9), dia(10), dia(11)])
    expect(r.semana.map((d) => d.feitas)).toEqual([1, 1, 0, 1, 1, 1, 0])
  })

  it('CA-2247: em outro dia da semana, e no próprio dia do aceite, não sai', () => {
    expect(avaliarResumo(resumo({ hoje: dia(11) }))).toBeNull()
    expect(avaliarResumo(resumo({ hoje: dia(5), aceitoEm: as(5, 7).toISOString() }))).toBeNull()
  })

  it('CA-2247: já saiu hoje: não sai de novo (a chamada repetida)', () => {
    expect(avaliarResumo(resumo({ resumos: [{ dia: dia(12), estado: 'enviado', dias: 5 }] }))).toBeNull()
  })

  it('D-1237: o resumo adiado pelo teto sai no dia seguinte', () => {
    const resumos = [{ dia: dia(12), estado: 'adiado' as const, dias: null }]
    expect(avaliarResumo(resumo({ hoje: dia(13), resumos }))).toMatchObject({ tipo: 'A2' })
    // Já saiu depois de adiado: não sai mais nesta semana.
    expect(avaliarResumo(resumo({ hoje: dia(14), resumos: [...resumos, { dia: dia(13), estado: 'entregue', dias: 4 }] }))).toBeNull()
  })

  it('CA-2248: 3 resumos seguidos com zero dia: o quarto não sai, e o estado é "pausado"', () => {
    const resumos = [19, 26, 33].map((n) => ({ dia: somarDias(dia(1), n - 1), estado: 'entregue' as const, dias: 0 }))
    const quarto = resumo({ hoje: somarDias(dia(1), 39), marcacoes: marcou(1), resumos })
    expect(avaliarResumo(quarto)).toEqual({ pausado: true })
  })

  it('CA-2248: depois de marcar de novo, o próximo dia do resumo volta a mandar', () => {
    const resumos = [19, 26, 33].map((n) => ({ dia: somarDias(dia(1), n - 1), estado: 'entregue' as const, dias: 0 }))
    const marcacoes = [...marcou(1), { dia: somarDias(dia(1), 35), feitas: ['agua'] }]
    expect(avaliarResumo(resumo({ hoje: somarDias(dia(1), 39), marcacoes, resumos }))).toMatchObject({ tipo: 'A2', dias: 1 })
  })

  it('CA-2248: dois zeros e um com dia marcado no meio não pausam', () => {
    const resumos = [
      { dia: somarDias(dia(1), 18), estado: 'entregue' as const, dias: 0 },
      { dia: somarDias(dia(1), 25), estado: 'entregue' as const, dias: 2 },
      { dia: somarDias(dia(1), 32), estado: 'entregue' as const, dias: 0 },
    ]
    expect(avaliarResumo(resumo({ hoje: somarDias(dia(1), 39), marcacoes: marcou(1), resumos }))).toMatchObject({ tipo: 'A2', dias: 0 })
  })
})

describe('o aviso de plano atualizado (D-1230)', () => {
  it('CA-2249: sai 30 minutos depois da última atualização', () => {
    expect(agendarPlanoAtualizado(as(3, 10, 15))).toEqual(as(3, 10, 45))
  })

  it('CA-2249: duas atualizações em 20 minutos: a segunda empurra o horário, e sai um só', () => {
    const primeira = agendarPlanoAtualizado(as(3, 10, 15))
    const segunda = agendarPlanoAtualizado(as(3, 10, 35))
    expect(avaliarPlanoAtualizado({ agora: primeira, a1Para: segunda.toISOString(), enviosDeHoje: [] })).toBe('esperar')
    expect(avaliarPlanoAtualizado({ agora: as(3, 11, 15), a1Para: segunda.toISOString(), enviosDeHoje: [] })).toBe('mandar')
  })

  it('CA-2249: atualização às 22h: sai às 8h do dia seguinte', () => {
    expect(agendarPlanoAtualizado(as(3, 22))).toEqual(as(4, 8))
    expect(agendarPlanoAtualizado(as(3, 20, 40))).toEqual(as(4, 8))
  })

  it('CA-2249: o S2 no mesmo dia cancela o A1', () => {
    expect(avaliarPlanoAtualizado({ agora: as(3, 11), a1Para: as(3, 10, 45).toISOString(), enviosDeHoje: ['S2'] })).toBe('cancelar')
  })

  it('D-1230: um por dia: com um A1 já enviado hoje, o segundo é cancelado', () => {
    expect(avaliarPlanoAtualizado({ agora: as(3, 15), a1Para: as(3, 14, 45).toISOString(), enviosDeHoje: ['A1'] })).toBe('cancelar')
  })

  it('CA-2251: vencido fora da janela, espera a janela', () => {
    expect(avaliarPlanoAtualizado({ agora: as(3, 21, 5), a1Para: as(3, 20, 50).toISOString(), enviosDeHoje: [] })).toBe('esperar')
  })

  it('sem A1 agendado, nada', () => {
    expect(avaliarPlanoAtualizado({ agora: as(3, 11), a1Para: null, enviosDeHoje: [] })).toBe('esperar')
  })
})

describe('o limite por endereço e a prioridade (D-1232, D-1237)', () => {
  const alvo = { linkId: 'l1', nutricionistaId: 'n1' }
  const aviso = (tipo: 'A1' | 'A2' | 'A3' | 'A4', n: number, sobre: Partial<{ linkId: string; nutricionistaId: string }> = {}) => ({ linkId: 'l1', nutricionistaId: 'n1', tipo, dia: dia(n), ...sobre })

  it('CA-2250: um aviso por dia por endereço', () => {
    expect(cabeNoEndereco([], alvo, dia(12))).toBe(true)
    expect(cabeNoEndereco([aviso('A2', 12)], alvo, dia(12))).toBe(false)
    expect(cabeNoEndereco([aviso('A2', 11)], alvo, dia(12))).toBe(true)
  })

  it('CA-2250: com 3 avisos na semana, o quarto não sai', () => {
    expect(cabeNoEndereco([aviso('A1', 6), aviso('A2', 8), aviso('A3', 10)], alvo, dia(12))).toBe(false)
    expect(cabeNoEndereco([aviso('A1', 5), aviso('A2', 8), aviso('A3', 10)], alvo, dia(12))).toBe(true)
  })

  it('o serviço não conta no limite dos avisos', () => {
    expect(cabeNoEndereco([{ ...aviso('A1', 12), tipo: 'S2' as const }], alvo, dia(12))).toBe(true)
  })

  it('CB-1210: o casal com um e-mail na mesma conta: o limite vale por link', () => {
    expect(cabeNoEndereco([aviso('A2', 12, { linkId: 'l2' })], alvo, dia(12))).toBe(true)
  })

  it('CB-1200: o mesmo endereço em outra conta divide o limite do endereço', () => {
    expect(cabeNoEndereco([aviso('A2', 12, { linkId: 'x9', nutricionistaId: 'outra' })], alvo, dia(12))).toBe(false)
  })

  it('D-1237: serviço > N1 > A1 > A3/A4 > A2, mantendo a ordem entre iguais', () => {
    const fila = [
      { tipo: 'A2' as const, id: 1 },
      { tipo: 'A3' as const, id: 2 },
      { tipo: 'S1' as const, id: 3 },
      { tipo: 'A1' as const, id: 4 },
      { tipo: 'N1' as const, id: 5 },
      { tipo: 'A4' as const, id: 6 },
      { tipo: 'S3' as const, id: 7 },
    ]
    expect(porPrioridade(fila).map((i) => i.id)).toEqual([3, 7, 5, 4, 2, 6, 1])
  })
})

describe('o próximo e-mail de um link (DP-LP-25)', () => {
  it('CA-2264: o resumo da semana é o próximo: quinta, às 8h', () => {
    const proximo = proximoAviso({
      agora: as(3, 10),
      marcacoes: marcou(2, 3),
      planoEm: null,
      ultimoAcesso: dia(3),
      a1Para: null,
      aceites: [{ tipo: 'semana', aceitoEm: instanteEmBrasilia('2026-10-22', 9, 43).toISOString(), diaDaSemana: 4, pausado: false }],
      lembretes: [],
    })
    expect(proximo).toEqual({ tipo: 'A2', quando: as(5, 8) })
  })

  it('o A1 agendado vem antes do resumo', () => {
    const proximo = proximoAviso({
      agora: as(3, 10),
      marcacoes: marcou(3),
      planoEm: as(3, 10).toISOString(),
      ultimoAcesso: dia(3),
      a1Para: as(3, 10, 30).toISOString(),
      aceites: [
        { tipo: 'semana', aceitoEm: as(1, 9).toISOString(), diaDaSemana: 4, pausado: false },
        { tipo: 'plano', aceitoEm: as(1, 9).toISOString(), diaDaSemana: 0, pausado: false },
      ],
      lembretes: [],
    })
    expect(proximo).toEqual({ tipo: 'A1', quando: as(3, 10, 30) })
  })

  it('o lembrete: às 18h do terceiro dia sem marcar', () => {
    const proximo = proximoAviso({
      agora: as(3, 10),
      marcacoes: marcou(2),
      planoEm: null,
      ultimoAcesso: dia(2),
      a1Para: null,
      aceites: [{ tipo: 'lembrete', aceitoEm: as(1, 9).toISOString(), diaDaSemana: 0, pausado: false }],
      lembretes: [],
    })
    expect(proximo).toEqual({ tipo: 'A3', quando: as(5, 18) })
  })

  it('resumo pausado e sem outro aviso: nenhum próximo', () => {
    expect(
      proximoAviso({
        agora: as(3, 10),
        marcacoes: [],
        planoEm: null,
        ultimoAcesso: null,
        a1Para: null,
        aceites: [{ tipo: 'semana', aceitoEm: as(1, 9).toISOString(), diaDaSemana: 4, pausado: true }],
        lembretes: [],
      }),
    ).toBeNull()
  })
})
