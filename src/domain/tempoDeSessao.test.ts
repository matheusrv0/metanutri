import {
  AVISO_ANTES_MS,
  desvioDoRelogio,
  FAIXA_ANTES_MS,
  horaEMinuto,
  LIMITES_DA_SESSAO,
  limitesDa,
  lerToken,
  situacaoDaSessao,
  textoDaHora,
} from './tempoDeSessao.ts'

const MIN = 60_000
const HORA = 60 * MIN
/** 27/10/2026, 08:00 no relógio deste computador. */
const ENTRADA = new Date(2026, 9, 27, 8, 0).getTime()

/** Um token só no formato: o app não confere a assinatura, só lê o corpo. */
function token(corpo: Record<string, unknown>): string {
  const base64url = (texto: string) => btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(JSON.stringify(corpo))}.assinatura`
}

describe('os limites da sessão (spec separacao-site-app, D-514)', () => {
  it('nutricionista e estudante: 30 minutos sem uso e 12 horas no máximo', () => {
    expect(LIMITES_DA_SESSAO.comum).toEqual({ semUsoMs: 30 * MIN, totalMs: 12 * HORA })
    expect(limitesDa(false)).toBe(LIMITES_DA_SESSAO.comum)
  })

  it('CB-526: administrador, com ou sem o código do app: 15 minutos e 8 horas', () => {
    expect(LIMITES_DA_SESSAO.admin).toEqual({ semUsoMs: 15 * MIN, totalMs: 8 * HORA })
    expect(limitesDa(true)).toBe(LIMITES_DA_SESSAO.admin)
  })

  it('D-516: o aviso vem 2 minutos antes da saída sem uso; a faixa, 10 minutos antes do limite total', () => {
    expect(AVISO_ANTES_MS).toBe(2 * MIN)
    expect(FAIXA_ANTES_MS).toBe(10 * MIN)
  })
})

describe('a situação da sessão', () => {
  const situacao = (agora: number, uso = ENTRADA, admin = false) => situacaoDaSessao({ agora, uso, entrada: ENTRADA, admin })

  it('logo depois de entrar, segue, e a próxima mudança é o aviso dos 28 minutos', () => {
    expect(situacao(ENTRADA + MIN)).toEqual({
      saida: null,
      aviso: false,
      faixa: false,
      fimDoLimite: ENTRADA + 12 * HORA,
      fimSemUso: ENTRADA + 30 * MIN,
      proximaMudanca: ENTRADA + 28 * MIN,
    })
  })

  it('CA-1442 (a regra): aos 28 minutos sem uso, avisa; a próxima mudança é a saída', () => {
    const s = situacao(ENTRADA + 28 * MIN)
    expect(s).toMatchObject({ saida: null, aviso: true, faixa: false })
    expect(s.proximaMudanca).toBe(ENTRADA + 30 * MIN)
    expect(situacao(ENTRADA + 28 * MIN - 1).aviso).toBe(false)
  })

  it('CA-1440 (a regra): aos 30 minutos sem uso, sai por inatividade', () => {
    expect(situacao(ENTRADA + 30 * MIN - 1).saida).toBeNull()
    expect(situacao(ENTRADA + 30 * MIN)).toMatchObject({ saida: 'inatividade', aviso: false, faixa: false })
  })

  it('CA-1441 (a regra): o administrador avisa aos 13 minutos e sai aos 15', () => {
    expect(situacao(ENTRADA + 13 * MIN, ENTRADA, true).aviso).toBe(true)
    expect(situacao(ENTRADA + 15 * MIN, ENTRADA, true).saida).toBe('inatividade')
  })

  it('o uso empurra a saída sem uso: 29 minutos depois do último uso, só o aviso', () => {
    const uso = ENTRADA + 2 * HORA
    expect(situacao(uso + 29 * MIN, uso)).toMatchObject({ saida: null, aviso: true, fimSemUso: uso + 30 * MIN })
  })

  it('CA-1444 (a regra): faltando 10 minutos para as 12 horas, a faixa aparece, mesmo em uso', () => {
    const agora = ENTRADA + 12 * HORA - 10 * MIN
    expect(situacao(agora - 1, agora - 1).faixa).toBe(false)
    expect(situacao(agora, agora)).toMatchObject({ saida: null, aviso: false, faixa: true, fimDoLimite: ENTRADA + 12 * HORA })
    expect(situacao(agora, agora).proximaMudanca).toBe(ENTRADA + 12 * HORA)
  })

  it('CA-1443 (a regra): às 12 horas sai mesmo em uso; administrador, às 8 horas', () => {
    expect(situacao(ENTRADA + 12 * HORA, ENTRADA + 12 * HORA)).toMatchObject({ saida: 'limite', faixa: false })
    expect(situacao(ENTRADA + 8 * HORA - MIN, ENTRADA + 8 * HORA - MIN, true)).toMatchObject({ saida: null, faixa: true })
    expect(situacao(ENTRADA + 8 * HORA, ENTRADA + 8 * HORA, true).saida).toBe('limite')
  })

  it('o limite total não se estende: usar depois dele não muda nada', () => {
    expect(situacao(ENTRADA + 13 * HORA, ENTRADA + 13 * HORA).saida).toBe('limite')
  })

  it('aviso e faixa ao mesmo tempo: os dois aparecem', () => {
    const uso = ENTRADA + 11 * HORA + 25 * MIN
    expect(situacao(uso + 28 * MIN, uso)).toMatchObject({ saida: null, aviso: true, faixa: true })
  })

  it('CB-517: sem marca de uso, quem chama passa a hora da entrada como último uso', () => {
    expect(situacaoDaSessao({ agora: ENTRADA + 31 * MIN, uso: ENTRADA, entrada: ENTRADA, admin: false }).saida).toBe('inatividade')
  })

  it('já vencida, a próxima mudança é agora', () => {
    expect(situacao(ENTRADA + 31 * MIN).proximaMudanca).toBe(ENTRADA + 31 * MIN)
  })
})

describe('a hora da entrada e o desvio do relógio (DP-SA-4)', () => {
  it('a entrada é o menor timestamp do amr, e o emitido é o iat, em milissegundos', () => {
    const lido = lerToken(
      token({
        sub: 'u1',
        iat: 1_793_000_000,
        amr: [
          { method: 'totp', timestamp: 1_792_990_500 },
          { method: 'password', timestamp: 1_792_990_000 },
        ],
      }),
    )
    expect(lido).toEqual({ entrada: 1_792_990_000_000, emitido: 1_793_000_000_000 })
  })

  it('token sem amr, com amr estragado ou sem iat: o que falta volta nulo', () => {
    expect(lerToken(token({ iat: 1_793_000_000 }))).toEqual({ entrada: null, emitido: 1_793_000_000_000 })
    expect(lerToken(token({ amr: ['password'], iat: 'ontem' }))).toEqual({ entrada: null, emitido: null })
    expect(lerToken(token({ amr: [{ method: 'password', timestamp: '1' }] })).entrada).toBeNull()
  })

  it.each([undefined, null, '', 'sem.pontos', 'a.b.c', 'a.@@@.c', 42])('token ilegível (%j): nada se lê', (valor) => {
    expect(lerToken(valor)).toEqual({ entrada: null, emitido: null })
  })

  it('CA-1454: com o relógio do computador 3 horas adiantado, a saída pelo limite é 12 horas depois da entrada pela hora do servidor', () => {
    const entradaNoServidor = 1_793_000_000_000
    const adiantado = 3 * HORA
    // O token chega na hora da entrada; o computador marca 3 horas a mais.
    const desvio = desvioDoRelogio(entradaNoServidor, entradaNoServidor + adiantado)
    expect(desvio).toBe(-adiantado)
    const naHora = (relogioDoComputador: number) =>
      situacaoDaSessao({ agora: relogioDoComputador + desvio, uso: relogioDoComputador + desvio, entrada: entradaNoServidor, admin: false })
    expect(naHora(entradaNoServidor + adiantado + 12 * HORA - MIN).saida).toBeNull()
    expect(naHora(entradaNoServidor + adiantado + 12 * HORA).saida).toBe('limite')
  })

  it('CA-1454: com o relógio 5 horas atrasado, também', () => {
    const entradaNoServidor = 1_793_000_000_000
    const desvio = desvioDoRelogio(entradaNoServidor, entradaNoServidor - 5 * HORA)
    const agora = entradaNoServidor - 5 * HORA + 12 * HORA + desvio
    expect(situacaoDaSessao({ agora, uso: agora, entrada: entradaNoServidor, admin: false }).saida).toBe('limite')
  })
})

describe('o texto da hora (D-526, CB-516)', () => {
  const agora = new Date(2026, 9, 27, 16, 5).getTime()

  it('no mesmo dia: "as 15:42"', () => {
    expect(textoDaHora(new Date(2026, 9, 27, 15, 42).getTime(), agora)).toBe('as 15:42')
    expect(textoDaHora(new Date(2026, 9, 27, 7, 5).getTime(), agora)).toBe('as 07:05')
  })

  it('no dia anterior: "ontem às 15:42", inclusive na virada do mês', () => {
    expect(textoDaHora(new Date(2026, 9, 26, 15, 42).getTime(), agora)).toBe('ontem às 15:42')
    expect(textoDaHora(new Date(2026, 9, 31, 23, 59).getTime(), new Date(2026, 10, 1, 0, 10).getTime())).toBe('ontem às 23:59')
  })

  it('antes disso: "25/10 às 15:42"', () => {
    expect(textoDaHora(new Date(2026, 9, 25, 15, 42).getTime(), agora)).toBe('25/10 às 15:42')
    expect(textoDaHora(new Date(2026, 0, 3, 9, 0).getTime(), agora)).toBe('03/01 às 09:00')
  })

  it('a faixa usa só a hora e os minutos', () => {
    expect(horaEMinuto(new Date(2026, 9, 27, 21, 42).getTime())).toBe('21:42')
  })
})
