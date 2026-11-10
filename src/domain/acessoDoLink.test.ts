import { describe, expect, it } from 'vitest'
import { diaEMes, textoDoAcesso } from './acessoDoLink.ts'

const HOJE = '2026-11-03'

describe('CA-2239: o último acesso na linha da nutricionista', () => {
  it('CA-2239: "Abriu hoje · marcou há 5 dias"', () => {
    expect(textoDoAcesso({ ultimoAcesso: '2026-11-03', marcacoes: [{ dia: '2026-10-29', feitas: ['agua'] }] }, HOJE)).toBe('Abriu hoje · marcou há 5 dias')
  })

  it('CA-2239: "Abriu ontem · marcou ontem" e "Abriu há 2 dias · nunca marcou"', () => {
    expect(textoDoAcesso({ ultimoAcesso: '2026-11-02', marcacoes: [{ dia: '2026-11-02', feitas: ['agua'] }] }, HOJE)).toBe('Abriu ontem · marcou ontem')
    expect(textoDoAcesso({ ultimoAcesso: '2026-11-01', marcacoes: [] }, HOJE)).toBe('Abriu há 2 dias · nunca marcou')
  })

  it('CA-2239: sem acesso e sem marcação, "Nunca abriu"', () => {
    expect(textoDoAcesso({ ultimoAcesso: null, marcacoes: [] }, HOJE)).toBe('Nunca abriu')
    expect(textoDoAcesso({ marcacoes: [] }, HOJE)).toBe('Nunca abriu')
  })

  it('DP-LP-30: o link de antes do 017, com marcação e sem acesso guardado, diz só quando marcou', () => {
    expect(textoDoAcesso({ ultimoAcesso: null, marcacoes: [{ dia: '2026-11-03', feitas: ['agua'] }] }, HOJE)).toBe('Marcou hoje')
  })

  it('o dia marcado vazio não conta como marcação', () => {
    expect(textoDoAcesso({ ultimoAcesso: '2026-11-03', marcacoes: [{ dia: '2026-11-03', feitas: [] }] }, HOJE)).toBe('Abriu hoje · nunca marcou')
  })
})

describe('diaEMes', () => {
  it('o dia de Brasília: 3/11, ou 03/11 com o zero', () => {
    expect(diaEMes('2026-11-03T13:15:00.000Z')).toBe('3/11')
    expect(diaEMes('2026-11-01T13:15:00.000Z', true)).toBe('01/11')
    // 01h UTC do dia 4 ainda é dia 3 em Brasília.
    expect(diaEMes('2026-11-04T01:00:00.000Z')).toBe('3/11')
    expect(diaEMes(null)).toBe('')
  })
})
