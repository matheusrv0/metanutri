// @vitest-environment node
// O código do app autenticador que os testes de banco calculam para o administrador de teste (spec
// seguranca-lote-5, D-260). Conferido aqui, sem rede, com os vetores da RFC 6238 (SHA-1).
import { codigoDoApp, deBase32 } from '../../testes/seguranca/totp.ts'

/** "12345678901234567890" em base32: a chave dos vetores da RFC 6238. */
const CHAVE_DA_RFC = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('D-260: o código do app autenticador nos testes de banco', () => {
  it('lê a chave em base32, com ou sem espaços, em maiúsculas ou minúsculas', () => {
    expect(new TextDecoder().decode(deBase32(CHAVE_DA_RFC))).toBe('12345678901234567890')
    expect(deBase32('gezd gnbv')).toEqual(deBase32('GEZDGNBV'))
  })

  it('recusa chave com caractere fora do base32', () => {
    expect(() => deBase32('GEZD1')).toThrow()
  })

  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('RFC 6238: em %i s, o código de 8 dígitos é %s', async (segundos, esperado) => {
    expect(await codigoDoApp(CHAVE_DA_RFC, segundos * 1000, 8)).toBe(esperado)
  })

  it('por padrão, 6 dígitos: os últimos 6 do mesmo cálculo', async () => {
    expect(await codigoDoApp(CHAVE_DA_RFC, 59_000)).toBe('287082')
  })
})
