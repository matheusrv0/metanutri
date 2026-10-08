import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { avisarAoFechar } from './avisarAoFechar.ts'

const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }

describe('avisar ao fechar a aba (spec dados-na-nuvem, DP-27 e DP-28)', () => {
  it('avisa quando há mudança que não chegou à nuvem', () => {
    expect(avisarAoFechar({ ...PRONTA, pendente: true })).toBe(true)
    expect(avisarAoFechar({ ...PRONTA, salvando: true })).toBe(true)
    expect(avisarAoFechar({ ...PRONTA, pendente: true, trava: 'sem-internet' })).toBe(true)
  })

  it('não avisa sem pendência, nem quando a própria trava de espaço pede para recarregar', () => {
    expect(avisarAoFechar(PRONTA)).toBe(false)
    expect(avisarAoFechar({ ...PRONTA, pendente: true, trava: 'sem-espaco' })).toBe(false)
  })
})
