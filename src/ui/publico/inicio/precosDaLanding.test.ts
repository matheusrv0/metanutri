// CA-1677 a CA-1679 e CA-1681 (spec landing-v3, D-666 a D-671): os cartões de "Planos e preços" saem de PLANOS, e o
// plano indicado pela régua segue os limites de pacientes ativos.
import { PLANOS, type PlanoAssinatura } from '@/domain/conta.ts'
import { cartoesDosPlanos, extrasDosPlanos, planoIndicado, REGUA_DE_PACIENTES, textoDaAcao, veredito } from './precosDaLanding.ts'

describe('cartoesDosPlanos', () => {
  it('CA-1677: Free, Solo e Pro com o nome, a descrição, os limites e "Todas as funções", de PLANOS', () => {
    expect(cartoesDosPlanos().map((c) => [c.id, c.nome, c.descricao, c.itens])).toEqual([
      ['free', 'Free', 'Para testar com um paciente real, sem cartão.', ['2 pacientes ativos', '2 links do paciente', 'Todas as funções']],
      ['solo', 'Solo', 'Para quem está começando a atender.', ['25 pacientes ativos', '25 links do paciente', 'Todas as funções']],
      ['pro', 'Pro', 'Para quem já tem agenda cheia.', ['Pacientes ilimitados', 'Links do paciente ilimitados', 'Todas as funções']],
    ])
  })

  it('CA-1677 e CA-1678: os preços nos dois ciclos; o Free não troca', () => {
    const [free, solo, pro] = cartoesDosPlanos()
    expect(free?.mensal).toEqual({ valor: '0', falado: 'R$ 0', periodo: 'Sem cartão de crédito', detalhe: null })
    expect(free?.anual).toBeNull()
    expect(solo?.mensal).toEqual({ valor: '34,90', falado: 'R$ 34,90', periodo: 'por mês', detalhe: 'ou R$ 299 por ano' })
    expect(solo?.anual).toEqual({ valor: '299', falado: 'R$ 299', periodo: 'por ano', detalhe: 'R$ 24,92 por mês · economize R$ 119,80' })
    expect(pro?.mensal).toEqual({ valor: '64,90', falado: 'R$ 64,90', periodo: 'por mês', detalhe: 'ou R$ 599 por ano' })
    expect(pro?.anual).toEqual({ valor: '599', falado: 'R$ 599', periodo: 'por ano', detalhe: 'R$ 49,92 por mês · economize R$ 179,80' })
  })

  it('mudou o plano em conta.ts, a landing acompanha', () => {
    const outros: PlanoAssinatura[] = PLANOS.map((p) => (p.id === 'solo' ? { ...p, mensal: 39.9, anual: 349, limitePacientesAtivos: 30, limiteLinksPaciente: 30, recursos: ['30 pacientes ativos', '30 links do paciente'] } : p))
    const solo = cartoesDosPlanos(outros)[1]
    expect(solo?.mensal.valor).toBe('39,90')
    expect(solo?.anual?.detalhe).toBe('R$ 29,08 por mês · economize R$ 129,80')
    expect(solo?.itens[0]).toBe('30 pacientes ativos')
    expect(planoIndicado(30, outros)).toBe('solo')
  })
})

describe('textoDaAcao', () => {
  it('CA-1678 e CA-1680: "Começar grátis" no Free; "Assinar o Solo", e "anual" no ciclo anual', () => {
    const [free, solo, pro] = cartoesDosPlanos()
    if (!free || !solo || !pro) throw new Error('sem os planos')
    expect(textoDaAcao(free, 'anual')).toBe('Começar grátis')
    expect(textoDaAcao(solo, 'mensal')).toBe('Assinar o Solo')
    expect(textoDaAcao(pro, 'anual')).toBe('Assinar o Pro anual')
  })
})

describe('planoIndicado e veredito', () => {
  it('CA-1679: até 2, o Free; até 25, o Solo; acima, o Pro (os limites de PLANOS)', () => {
    expect([1, 2, 3, 12, 25, 26, 60].map((n) => planoIndicado(n))).toEqual(['free', 'free', 'solo', 'solo', 'solo', 'pro', 'pro'])
  })

  it('CA-1676 e CA-1679: o veredito no singular, no plural e no fim da régua', () => {
    expect(veredito(1)).toBe('Para 1 paciente ativo, o plano indicado é o Free.')
    expect(veredito(12)).toBe('Para 12 pacientes ativos, o plano indicado é o Solo.')
    expect(veredito(60)).toBe('Para 60 ou mais pacientes ativos, o plano indicado é o Pro.')
  })

  it('a régua vai de 1 a 60 e abre em 12', () => {
    expect(REGUA_DE_PACIENTES).toEqual({ minimo: 1, maximo: 60, aoAbrir: 12 })
  })
})

describe('extrasDosPlanos', () => {
  it('CA-1681: o Estudante com o comprovante e o "o que vier antes"; a Clínica pelo resumo de PLANOS', () => {
    expect(extrasDosPlanos()).toEqual({
      estudante: {
        nome: 'Estudante',
        texto:
          'Grátis por 12 meses ou até a formatura, o que vier antes, com o e-mail da faculdade e o comprovante de matrícula. Na formatura, os pacientes continuam na conta.',
        acao: 'Criar conta de estudante',
      },
      clinica: { nome: 'Clínica', texto: 'Condições combinadas por e-mail.', acao: 'Fale com a gente' },
    })
  })
})
