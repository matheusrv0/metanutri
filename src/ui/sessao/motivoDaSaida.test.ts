import { CHAVE_SAIDA, esquecerSaida, gravarSaida, lerSaida, textoDaSaida } from './motivoDaSaida.ts'

const AGORA = new Date(2026, 9, 27, 16, 5).getTime()

describe('o motivo da saída por tempo (spec separacao-site-app, DP-SA-5 e DP-SA-19)', () => {
  beforeEach(() => localStorage.clear())

  it('fica fora do espaço da conta, só com a hora e se ficou algo para enviar (D-526: o texto não muda com o motivo)', () => {
    gravarSaida(localStorage, { ate: AGORA, pendente: false })
    expect(CHAVE_SAIDA).toBe('metanutri:sessao:saida')
    expect(JSON.parse(localStorage.getItem(CHAVE_SAIDA) ?? 'null')).toEqual({ ate: AGORA, pendente: false })
    expect(lerSaida(localStorage)).toEqual({ ate: AGORA, pendente: false })
  })

  it('DP-SA-19: ler não apaga (todas as abas mostram "Entre de novo"); esquecer apaga', () => {
    gravarSaida(localStorage, { ate: AGORA, pendente: true })
    expect(lerSaida(localStorage)).toEqual({ ate: AGORA, pendente: true })
    expect(lerSaida(localStorage)).toEqual({ ate: AGORA, pendente: true })
    esquecerSaida(localStorage)
    expect(lerSaida(localStorage)).toBeNull()
  })

  it('marca estragada não vale', () => {
    for (const valor of ['{', 'null', '{"ate":"ontem","pendente":false}', '{"ate":1,"pendente":"sim"}']) {
      localStorage.setItem(CHAVE_SAIDA, valor)
      expect(lerSaida(localStorage), valor).toBeNull()
    }
  })

  it('CB-500: sem armazenamento, nada quebra', () => {
    expect(lerSaida(null)).toBeNull()
    expect(() => gravarSaida(null, { ate: AGORA, pendente: false })).not.toThrow()
    expect(() => esquecerSaida(null)).not.toThrow()
  })
})

describe('o texto de "Entre de novo" (D-526)', () => {
  it('CA-1447: em dia, a hora do último uso', () => {
    expect(textoDaSaida({ ate: new Date(2026, 9, 27, 15, 42).getTime(), pendente: false }, AGORA)).toBe('Sua sessão terminou. Tudo até as 15:42 está salvo.')
  })

  it('CB-516: noutro dia, "ontem às" ou a data', () => {
    expect(textoDaSaida({ ate: new Date(2026, 9, 26, 15, 42).getTime(), pendente: false }, AGORA)).toBe('Sua sessão terminou. Tudo até ontem às 15:42 está salvo.')
    expect(textoDaSaida({ ate: new Date(2026, 9, 25, 15, 42).getTime(), pendente: false }, AGORA)).toBe('Sua sessão terminou. Tudo até 25/10 às 15:42 está salvo.')
  })

  it('CA-1448: com pendência, pede para entrar e enviar', () => {
    expect(textoDaSaida({ ate: AGORA, pendente: true }, AGORA)).toBe('Sua sessão terminou. Entre para enviar o que ficou neste navegador.')
  })

  it('nenhum texto fala em segurança nem explica o motivo', () => {
    for (const pendente of [false, true]) expect(textoDaSaida({ ate: AGORA, pendente }, AGORA)).not.toMatch(/segurança|minutos|horas/i)
  })
})
