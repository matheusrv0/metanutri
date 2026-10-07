import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'
import {
  CONFERINDO_COBRANCA,
  depoisDeHoje,
  emReais,
  linhaDaCobranca,
  linhaDoCartao,
  nomeComCiclo,
  PREVIA_FALHOU,
  proximaCobrancaPrevista,
  recadoDaAssinatura,
  textoDoCancelamento,
  valorDoRecibo,
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

  it('foco 4: sem o cartão gravado (antes do 008), sem a linha do cartão, sem a da cobrança', () => {
    const antiga: Assinatura = { ...PAGA, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    expect(linhaDoCartao(antiga)).toBeNull()
    expect(linhaDaCobranca(antiga, AGORA)).toBeNull()
  })

  it('M2: a próxima cobrança gravada que já passou não aparece: a linha fica só com o valor', () => {
    const depois = new Date('2026-11-02T15:00:00.000Z')
    expect(linhaDaCobranca(PAGA, depois)).toBe('Próxima cobrança de R$ 34,90')
    expect(linhaDaCobranca(PAGA, new Date('2026-11-02T14:59:59.000Z'))).toBe('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')
    expect(linhaDaCobranca({ ...PAGA, valorCentavos: 0 }, depois)).toBeNull()
  })

  it('M2: a cancelada com o "vale até" já passado não mostra a data', () => {
    const cancelada: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }
    expect(linhaDaCobranca(cancelada, new Date('2026-11-02T03:00:00.000Z'))).toBeNull()
  })

  it('M2: sem "agora", vale o relógio de agora', () => {
    expect(linhaDaCobranca({ ...PAGA, proximaCobranca: '2000-01-02T15:00:00.000Z' })).toBe('Próxima cobrança de R$ 34,90')
    expect(linhaDaCobranca({ ...PAGA, proximaCobranca: '2999-01-02T15:00:00.000Z' })).toBe('Próxima cobrança em 2 de janeiro de 2999, R$ 34,90')
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

  it('CA-393: o recado da recusa diz o dia da cobrança recusada', () => {
    const recusada: Assinatura = { ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'recusa', encerradaEm: '2026-11-06T13:00:00.000Z' }
    expect(recadoDaAssinatura(recusada)).toBe('O banco recusou a cobrança de 6 de novembro de 2026. A assinatura foi encerrada e a conta voltou ao Free.')
  })

  it('CA-393: sem a data, o recado sem data', () => {
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'recusa' })).toBe(
      'O banco recusou a cobrança. A assinatura foi encerrada e a conta voltou ao Free.',
    )
  })

  it('a cancelada pela pessoa ou pela operadora não ganha recado (D-79)', () => {
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'pessoa' })).toBeNull()
    expect(recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'operadora' })).toBeNull()
  })

  it('R12: a marca da recusa numa linha ativa não vira recado', () => {
    expect(recadoDaAssinatura({ ...PAGA, encerradaPor: 'recusa', encerradaEm: '2026-11-06T13:00:00.000Z' })).toBeNull()
  })

  it('CA-395: sem cobrança ainda, nada é cobrado e a conta volta ao Free na hora', () => {
    expect(textoDoCancelamento(PAGA, { cobrada: false, expiraEm: null })).toBe('Ainda não houve cobrança. Cancelando agora, nada é cobrado e a conta volta ao Free na hora.')
  })

  it('CA-396: com cobrança, até quando vale', () => {
    expect(textoDoCancelamento(PAGA, { cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' })).toBe(
      'O plano Solo continua até 1 de novembro de 2026, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.',
    )
  })

  it('cobrada sem data à frente: Free na hora', () => {
    expect(textoDoCancelamento(PAGA, { cobrada: true, expiraEm: null })).toBe('Cancelando agora, a conta volta ao Free na hora e nada mais é cobrado.')
  })

  it('pendente e pausada: o texto de sempre, sem prévia', () => {
    expect(textoDoCancelamento({ ...PAGA, plano: 'free', status: 'pendente' }, null)).toBe('A assinatura do plano Solo para e nada mais é cobrado. Você continua no plano Free.')
    expect(textoDoCancelamento({ ...PAGA, plano: 'free', status: 'pausada' }, null)).toBe('A assinatura do plano Solo para e nada mais é cobrado. Você continua no plano Free.')
  })

  it('CA-381: nenhum texto da recusa ou do cancelamento cita o processador', () => {
    const textos = [
      CONFERINDO_COBRANCA,
      PREVIA_FALHOU,
      recadoDaAssinatura({ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'recusa', encerradaEm: '2026-11-06T13:00:00.000Z' }) ?? '',
      textoDoCancelamento(PAGA, { cobrada: false, expiraEm: null }),
      textoDoCancelamento(PAGA, { cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }),
      textoDoCancelamento(PAGA, { cobrada: true, expiraEm: null }),
      textoDoCancelamento({ ...PAGA, status: 'pendente' }, null),
    ]
    for (const t of textos) expect(t).not.toMatch(/mercado ?pago/i)
  })
})
