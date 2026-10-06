import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'
import {
  depoisDeHoje,
  emReais,
  linhaDaCobranca,
  linhaDoCartao,
  nomeComCiclo,
  proximaCobrancaPrevista,
  recadoDaAssinatura,
  valorDoRecibo,
  valeAteSeCancelar,
} from './assinaturaTextos.ts'

const PAGA: Assinatura = {
  ...SEM_ASSINATURA,
  plano: 'solo',
  planoPedido: 'solo',
  status: 'ativa',
  ciclo: 'mensal',
  valorCentavos: 3490,
  cartaoBandeira: 'Mastercard',
  cartaoFinal: '6351',
  proximaCobranca: '2026-11-02T15:00:00.000Z',
}
/** Um mês antes da próxima cobrança de PAGA. */
const AGORA = new Date('2026-10-02T15:00:00.000Z')

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

  it('CA-376 e CA-389: a bandeira e o final (para o mini cartão), a próxima cobrança com o valor, e nenhum recado', () => {
    expect(linhaDoCartao(PAGA)).toBe('Mastercard final 6351')
    expect(linhaDaCobranca(PAGA, AGORA)).toBe('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')
    expect(recadoDaAssinatura(PAGA)).toBeNull()
  })

  it('foco 4: sem o cartão gravado (antes do 008), sem a linha do cartão, sem a da cobrança e sem data para o cancelamento', () => {
    const antiga: Assinatura = { ...PAGA, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    expect(linhaDoCartao(antiga)).toBeNull()
    expect(linhaDaCobranca(antiga, AGORA)).toBeNull()
    expect(valeAteSeCancelar(antiga, AGORA)).toBeNull()
  })

  it('CA-377: se cancelar agora, vale até a véspera da próxima cobrança', () => {
    expect(valeAteSeCancelar(PAGA, AGORA)).toBe('1 de novembro de 2026')
  })

  it('M2: a próxima cobrança gravada que já passou não aparece: a linha fica só com o valor', () => {
    const depois = new Date('2026-11-02T15:00:00.000Z')
    expect(linhaDaCobranca(PAGA, depois)).toBe('Próxima cobrança de R$ 34,90')
    expect(linhaDaCobranca(PAGA, new Date('2026-11-02T14:59:59.000Z'))).toBe('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')
    expect(linhaDaCobranca({ ...PAGA, valorCentavos: 0 }, depois)).toBeNull()
  })

  it('M2: se cancelar agora, o "vale até" que já passou vira nulo (a confirmação fala do fim do período, sem data)', () => {
    // O fim do período de PAGA é 1/11 às 23h59min59s em Brasília (02h59min59s UTC de 2/11).
    expect(valeAteSeCancelar(PAGA, new Date('2026-11-02T02:59:58.000Z'))).toBe('1 de novembro de 2026')
    expect(valeAteSeCancelar(PAGA, new Date('2026-11-02T02:59:59.000Z'))).toBeNull()
    expect(valeAteSeCancelar(PAGA, new Date('2026-12-01T00:00:00.000Z'))).toBeNull()
  })

  it('M2: a cancelada com o "vale até" já passado não mostra a data', () => {
    const cancelada: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }
    expect(linhaDaCobranca(cancelada, new Date('2026-11-02T03:00:00.000Z'))).toBeNull()
  })

  it('M2: sem "agora", vale o relógio de agora', () => {
    expect(linhaDaCobranca({ ...PAGA, proximaCobranca: '2000-01-02T15:00:00.000Z' })).toBe('Próxima cobrança de R$ 34,90')
    expect(valeAteSeCancelar({ ...PAGA, proximaCobranca: '2000-01-02T15:00:00.000Z' })).toBeNull()
    expect(linhaDaCobranca({ ...PAGA, proximaCobranca: '2999-01-02T15:00:00.000Z' })).toBe('Próxima cobrança em 2 de janeiro de 2999, R$ 34,90')
    expect(valeAteSeCancelar({ ...PAGA, proximaCobranca: '2999-01-02T15:00:00.000Z' })).toBe('1 de janeiro de 2999')
  })

  it('CA-378 e CA-390: a cancelada no prazo diz uma vez até quando vale e o que vem depois; o "cancelada" fica só no selo', () => {
    const cancelada: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }
    expect(linhaDaCobranca(cancelada, AGORA)).toBe('Vale até 1 de novembro de 2026. Depois, a conta volta ao Free.')
    expect(recadoDaAssinatura(cancelada)).toBeNull()
  })

  it('D-79: o recado de "Seu plano" só existe quando acrescenta algo ao que o cartão do plano já mostra', () => {
    expect(recadoDaAssinatura(SEM_ASSINATURA)).toBeNull()
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'pro', status: 'cancelada' })).toBeNull()
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'pendente' })).toBe('O banco ainda está confirmando o pagamento. Até lá, vale o Free.')
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'pausada' })).toBe('A assinatura está pausada. Até ela voltar, vale o Free.')
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'estudante', status: 'vencida' })).toBe('Seu plano venceu e a conta voltou ao Free.')
  })

  it('CA-366 e D-79: a próxima cobrança prevista e o que vem depois de hoje, sem repetir o valor que está logo acima', () => {
    expect(proximaCobrancaPrevista('mensal', new Date('2026-10-02T15:00:00Z'))).toBe('2026-11-02T15:00:00.000Z')
    expect(depoisDeHoje('mensal', '2026-11-02T15:00:00.000Z')).toBe('Depois, o mesmo valor todo dia 2, a partir de 2 de novembro. Cancele quando quiser.')
    expect(depoisDeHoje('anual', '2027-10-02T15:00:00.000Z')).toBe('Depois, o mesmo valor todo ano, em 2 de outubro. Cancele quando quiser.')
  })

  it('CA-372: o valor do recibo, por mês ou por ano', () => {
    expect(valorDoRecibo(34.9, 'mensal')).toBe('R$ 34,90 por mês')
    expect(valorDoRecibo(299, 'anual')).toBe('R$ 299,00 por ano')
  })
})
