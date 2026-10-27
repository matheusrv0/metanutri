// CA-1477 e CB-549 (spec landing-escura, D-544): os preços da landing saem de PLANOS.
import { PLANOS, type PlanoAssinatura } from '@/domain/conta.ts'
import { precosDaLanding } from './precosDaLanding.ts'

describe('precosDaLanding', () => {
  it('o Solo em destaque e uma linha para Free, Pro, Estudante e Clínica, com os valores de hoje', () => {
    expect(precosDaLanding()).toEqual({
      destaque: {
        id: 'solo',
        nome: 'Solo',
        valor: '34,90',
        falado: 'Solo: R$ 34,90 por mês',
        itens: ['Solo: 25 pacientes ativos', '25 links do paciente', 'Adequação com o Cobrir, PDF e documentos em Word', 'Ou R$ 299 por ano'],
      },
      outros: [
        { nome: 'Free', texto: 'R$ 0 · 2 pacientes ativos, sem cartão' },
        { nome: 'Pro', texto: 'R$ 64,90 por mês · pacientes ilimitados' },
        { nome: 'Estudante', texto: 'Grátis até a formatura · uso não comercial' },
        { nome: 'Clínica', texto: 'Condições combinadas por e-mail' },
      ],
    })
  })

  it('mudou o plano em conta.ts, a landing acompanha', () => {
    const outros: PlanoAssinatura[] = PLANOS.map((p) =>
      p.id === 'solo' ? { ...p, mensal: 39.9, anual: 349, limitePacientesAtivos: 30, limiteLinksPaciente: 30 } : p.id === 'pro' ? { ...p, mensal: 70 } : p,
    )
    const precos = precosDaLanding(outros)
    expect(precos.destaque.valor).toBe('39,90')
    expect(precos.destaque.itens).toEqual(['Solo: 30 pacientes ativos', '30 links do paciente', 'Adequação com o Cobrir, PDF e documentos em Word', 'Ou R$ 349 por ano'])
    expect(precos.outros[1]).toEqual({ nome: 'Pro', texto: 'R$ 70 por mês · pacientes ilimitados' })
  })
})
