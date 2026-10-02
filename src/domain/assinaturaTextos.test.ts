import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'
import {
  depoisDeHoje,
  emReais,
  fraseDaAssinaturaAtiva,
  linhaDaCobranca,
  linhaDoCartao,
  nomeComCiclo,
  proximaCobrancaPrevista,
  recadoDaAssinatura,
  valeAteSeCancelar,
} from './assinaturaTextos.ts'

const PAGA: Assinatura = {
  ...SEM_ASSINATURA,
  plano: 'solo',
  planoPedido: 'solo',
  status: 'ativa',
  ciclo: 'mensal',
  valorCentavos: 3490,
  precoTravado: true,
  cartaoBandeira: 'Mastercard',
  cartaoFinal: '6351',
  proximaCobranca: '2026-11-02T15:00:00.000Z',
}

describe('textos da assinatura (spec checkout-proprio)', () => {
  it('dinheiro em reais, com vírgula e ponto de milhar', () => {
    expect(emReais(34.9)).toBe('R$ 34,90')
    expect(emReais(1299)).toBe('R$ 1.299,00')
  })

  it('o plano com o ciclo', () => {
    expect(nomeComCiclo('solo', 'mensal')).toBe('Solo, mensal')
    expect(nomeComCiclo('pro', 'anual')).toBe('Pro, anual')
    expect(nomeComCiclo('pro', null)).toBe('Pro')
  })

  it('CA-376: a bandeira, o final, e a próxima cobrança com o valor', () => {
    expect(linhaDoCartao(PAGA)).toBe('Mastercard final 6351')
    expect(linhaDaCobranca(PAGA)).toBe('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')
    expect(recadoDaAssinatura(PAGA)).toBe('Sua assinatura está em dia.')
  })

  it('foco 4: sem o cartão gravado (antes do 008), sem a linha do cartão, sem a da cobrança e sem data para o cancelamento', () => {
    const antiga: Assinatura = { ...PAGA, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    expect(linhaDoCartao(antiga)).toBeNull()
    expect(linhaDaCobranca(antiga)).toBeNull()
    expect(valeAteSeCancelar(antiga)).toBeNull()
  })

  it('CA-377: se cancelar agora, vale até a véspera da próxima cobrança', () => {
    expect(valeAteSeCancelar(PAGA)).toBe('1 de novembro de 2026')
  })

  it('CA-378: a cancelada no prazo diz até quando vale', () => {
    const cancelada: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }
    expect(linhaDaCobranca(cancelada)).toBe('Cancelada, vale até 1 de novembro de 2026')
    expect(recadoDaAssinatura(cancelada)).toBe('A assinatura foi cancelada e não cobra mais. O plano pago vale até o fim do período já pago.')
  })

  it('CA-366: a próxima cobrança prevista e o que vem depois de hoje', () => {
    expect(proximaCobrancaPrevista('mensal', new Date('2026-10-02T15:00:00Z'))).toBe('2026-11-02T15:00:00.000Z')
    expect(depoisDeHoje(34.9, 'mensal', '2026-11-02T15:00:00.000Z')).toBe('Depois, R$ 34,90 todo dia 2. Cancele quando quiser.')
    expect(depoisDeHoje(299, 'anual', '2027-10-02T15:00:00.000Z')).toBe('Depois, R$ 299,00 todo ano, em 2 de outubro. Cancele quando quiser.')
  })

  it('CA-372: a frase da assinatura ativa', () => {
    expect(fraseDaAssinaturaAtiva('solo', 'mensal', 'maria@exemplo.com', '2026-11-02T15:00:00.000Z')).toBe(
      'Plano Solo, mensal. O recibo vai para maria@exemplo.com e a próxima cobrança é em 2 de novembro de 2026.',
    )
  })
})
