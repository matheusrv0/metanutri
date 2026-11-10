// @vitest-environment node
// Os tetos do Resend grátis (spec lado-do-paciente, D-1237, DP-LP-11 e DP-LP-12): 70 por dia para as funções, 45 deles
// avisos; 1.900 avisos e 2.100 no total por mês. A fila sai por prioridade e o que não cabe é adiado ou descartado.
import { describe, expect, it } from 'vitest'
import { cortarNoTeto, inicioDoDiaDoTeto, inicioDoMesDoTeto, lerTetos, TETOS_PADRAO, type Contagem } from '../../supabase/functions/_shared/avisos/tetos.ts'
import type { TipoDeEmail } from '../../supabase/functions/_shared/avisos/tipos.ts'

const ambiente = (valores: Record<string, string>) => (nome: string) => valores[nome]
const ZERO: Contagem = { dia: 0, mes: 0, avisosDia: 0, avisosMes: 0 }
const fila = (...tipos: TipoDeEmail[]) => tipos.map((tipo, id) => ({ tipo, id }))
const ids = (itens: readonly { readonly id: number }[]) => itens.map((i) => i.id)

describe('lerTetos (CA-2274)', () => {
  it('DP-LP-11: sem variável, os tetos do grátis: 70, 45, 2.100 e 1.900', () => {
    expect(lerTetos(ambiente({}))).toEqual({ dia: 70, avisosDia: 45, mes: 2100, avisosMes: 1900, conta: 30 })
    expect(TETOS_PADRAO).toEqual({ dia: 70, avisosDia: 45, mes: 2100, avisosMes: 1900, conta: 30 })
  })

  it('CA-2274: os segredos trocados valem na próxima chamada, sem código novo', () => {
    expect(lerTetos(ambiente({ TETO_DIA: '1500', TETO_MES: '45000' }))).toEqual({ dia: 1500, avisosDia: 1475, mes: 45000, avisosMes: 44800, conta: 600 })
    expect(lerTetos(ambiente({ TETO_DIA: '100', TETO_AVISOS_DIA: '60', TETO_MES: '3000', TETO_AVISOS_MES: '2500', TETO_CONTA_DIA: '25' }))).toEqual({
      dia: 100,
      avisosDia: 60,
      mes: 3000,
      avisosMes: 2500,
      conta: 25,
    })
  })

  it('valor estranho volta ao padrão', () => {
    expect(lerTetos(ambiente({ TETO_DIA: 'muito', TETO_MES: '-3', TETO_AVISOS_DIA: '' }))).toEqual(TETOS_PADRAO)
  })
})

describe('o dia e o mês do teto são os do Resend (UTC)', () => {
  it('CA-2271: o dia do teto vira à meia-noite UTC, às 21h de Brasília', () => {
    expect(inicioDoDiaDoTeto(new Date('2026-11-03T23:59:00Z')).toISOString()).toBe('2026-11-03T00:00:00.000Z')
    expect(inicioDoDiaDoTeto(new Date('2026-11-04T00:00:01Z')).toISOString()).toBe('2026-11-04T00:00:00.000Z')
    expect(inicioDoMesDoTeto(new Date('2026-11-30T23:00:00Z')).toISOString()).toBe('2026-11-01T00:00:00.000Z')
  })
})

describe('cortarNoTeto', () => {
  it('D-1237: tudo cabe: sai na ordem da prioridade', () => {
    const r = cortarNoTeto(fila('A2', 'S1', 'A3', 'N1', 'A1'), ZERO, TETOS_PADRAO)
    expect(ids(r.vao)).toEqual([1, 3, 4, 2, 0])
    expect(r.adiados).toEqual([])
  })

  it('CA-2271: com 70 no dia, nada mais sai: A1, A2 e N1 ficam adiados; o lembrete não fica para depois; o serviço é barrado', () => {
    const r = cortarNoTeto(fila('S2', 'N1', 'A1', 'A3', 'A4', 'A2'), { dia: 70, mes: 70, avisosDia: 40, avisosMes: 40 }, TETOS_PADRAO)
    expect(r.vao).toEqual([])
    expect(ids(r.barrados)).toEqual([0])
    expect(ids(r.adiados)).toEqual([1, 2, 5])
    expect(ids(r.descartados)).toEqual([3, 4])
  })

  it('CA-2271: perto do teto, sai até completar 70, pela prioridade', () => {
    const r = cortarNoTeto(fila('A2', 'A1', 'S2'), { dia: 68, mes: 68, avisosDia: 10, avisosMes: 10 }, TETOS_PADRAO)
    expect(ids(r.vao)).toEqual([2, 1])
    expect(ids(r.adiados)).toEqual([0])
  })

  it('CA-2272: com 45 avisos no dia, os avisos param e o serviço continua até 70', () => {
    const r = cortarNoTeto(fila('A1', 'S2', 'A2', 'S4', 'N1'), { dia: 50, mes: 50, avisosDia: 45, avisosMes: 45 }, TETOS_PADRAO)
    expect(ids(r.vao)).toEqual([1, 3, 4])
    expect(ids(r.adiados)).toEqual([0, 2])
  })

  it('CA-2273: com 1.900 no mês, os avisos param até o mês virar', () => {
    const r = cortarNoTeto(fila('A2', 'S2', 'N1'), { dia: 0, mes: 1900, avisosDia: 0, avisosMes: 1900 }, TETOS_PADRAO)
    expect(ids(r.vao)).toEqual([1, 2])
    expect(ids(r.adiados)).toEqual([0])
  })

  it('CA-2273: com 2.100 no mês, só S1 e S3 saem', () => {
    const r = cortarNoTeto(fila('S1', 'S2', 'S3', 'S4', 'N1', 'A1'), { dia: 0, mes: 2100, avisosDia: 0, avisosMes: 1900 }, TETOS_PADRAO)
    expect(ids(r.vao)).toEqual([0, 2])
    expect(ids(r.barrados)).toEqual([1, 3])
    expect(ids(r.adiados)).toEqual([4, 5])
  })

  it('CA-2271: S1 e S3 também param no teto do dia', () => {
    const r = cortarNoTeto(fila('S1', 'S3'), { dia: 70, mes: 2100, avisosDia: 0, avisosMes: 0 }, TETOS_PADRAO)
    expect(ids(r.barrados)).toEqual([0, 1])
  })

  it('CA-2299: a conta que chegou ao teto dela não manda mais; as outras continuam', () => {
    const daConta = (tipo: TipoDeEmail, id: number, nutricionistaId: string) => ({ tipo, id, nutricionistaId })
    const r = cortarNoTeto(
      [daConta('S2', 0, 'abusiva'), daConta('A2', 1, 'abusiva'), daConta('A3', 2, 'abusiva'), daConta('S2', 3, 'ana'), daConta('A1', 4, 'abusiva')],
      { ...ZERO, dia: 30, mes: 30, porConta: new Map([['abusiva', 30]]) },
      TETOS_PADRAO,
    )
    expect(ids(r.vao)).toEqual([3])
    expect(ids(r.barrados)).toEqual([0])
    expect(ids(r.adiados)).toEqual([4, 1])
    expect(ids(r.descartados)).toEqual([2])
    expect(ids(r.pelaConta).sort()).toEqual([0, 1, 2, 4])
  })

  it('CA-2299: o teto da conta conta dentro da mesma chamada', () => {
    const r = cortarNoTeto(
      [0, 1, 2].map((id) => ({ tipo: 'A2' as const, id, nutricionistaId: 'ana' })),
      { ...ZERO, porConta: new Map([['ana', 28]]) },
      TETOS_PADRAO,
    )
    expect(ids(r.vao)).toEqual([0, 1])
    expect(ids(r.pelaConta)).toEqual([2])
  })

  it('a conta anda dentro da mesma chamada', () => {
    const r = cortarNoTeto(fila('A2', 'A2', 'A2'), { dia: 0, mes: 0, avisosDia: 43, avisosMes: 43 }, TETOS_PADRAO)
    expect(ids(r.vao)).toEqual([0, 1])
    expect(ids(r.adiados)).toEqual([2])
  })
})
