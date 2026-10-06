import { AGORA, conta, paga } from './negocio.test-utils.ts'
import {
  dataEmBrasilia,
  detalheDoPlano,
  diferencaEm30Dias,
  horaEmBrasilia,
  inteiro,
  marcaDoEixo,
  parteQuePaga,
  porcentagem,
  reais,
  seloDaSituacao,
  textoDoPlano,
  ultimoLogin,
} from './negocioTextos.ts'

describe('números', () => {
  it('reais, com o centavo arredondado só aqui', () => {
    expect(reais(123585)).toMatch(/^R\$\s1\.235,85$/)
    expect(reais((29900 / 12) * 6)).toMatch(/^R\$\s149,50$/)
    expect(reais(0)).toMatch(/^R\$\s0,00$/)
  })

  it('CA-346: diferença em 30 dias, com sinal', () => {
    expect(diferencaEm30Dias(20940)).toMatch(/^\+R\$\s209,40 em 30 dias$/)
    expect(diferencaEm30Dias(-3490)).toMatch(/^−R\$\s34,90 em 30 dias$/)
    expect(diferencaEm30Dias(0)).toBe('Igual a 30 dias atrás')
    expect(diferencaEm30Dias(0.4)).toBe('Igual a 30 dias atrás')
  })

  it('CA-347: parte das contas que pagam', () => {
    expect(parteQuePaga(25 / 312)).toBe('8% das contas pagam')
    expect(parteQuePaga(null)).toBe('Nenhuma conta ainda')
  })

  it('inteiro, porcentagem e marca do eixo', () => {
    expect(inteiro(1234)).toBe('1.234')
    expect(porcentagem(0.75)).toBe('75%')
    expect(marcaDoEixo(150000)).toBe('1.500')
    expect(marcaDoEixo(5000)).toBe('50')
  })

  it('CA-352: detalhe do plano com o preço de tabela', () => {
    expect(detalheDoPlano('pro', 'mensal')).toMatch(/^mensal · R\$\s64,90$/)
    expect(detalheDoPlano('solo', 'anual')).toMatch(/^anual · R\$\s299,00$/)
    expect(detalheDoPlano('clinica', 'mensal')).toMatch(/^mensal · R\$\s149,00$/)
  })
})

describe('datas em Brasília (CB-85)', () => {
  it('foco 1: 02h50 de 01/10 em UTC ainda é 30/09 em Brasília', () => {
    expect(dataEmBrasilia('2026-10-01T02:50:00Z')).toBe('30/09/2026')
    expect(dataEmBrasilia('não é data')).toBe('')
  })

  it('CA-363: hora da leitura', () => {
    expect(horaEmBrasilia(new Date('2026-10-02T17:32:00Z'))).toBe('14:32')
  })

  it('CA-359: último login em dias de calendário de Brasília', () => {
    expect(ultimoLogin(null, AGORA)).toBe('nunca')
    expect(ultimoLogin('2026-10-02T04:00:00Z', AGORA)).toBe('hoje')
    expect(ultimoLogin('2026-10-02T02:00:00Z', AGORA)).toBe('ontem')
    expect(ultimoLogin('2026-09-27T12:00:00Z', AGORA)).toBe('há 5 dias')
    expect(ultimoLogin('2026-09-02T12:00:00Z', AGORA)).toBe('há 30 dias')
    expect(ultimoLogin('2026-08-01T12:00:00Z', AGORA)).toBe('01/08/2026')
  })
})

describe('selos da lista (CA-357, CA-358)', () => {
  it('nutricionista', () => {
    expect(seloDaSituacao(conta('a'))).toEqual({ situacao: 'Nutricionista', selo: { texto: 'CRN-6 conferido', tom: 'sucesso' } })
    expect(seloDaSituacao(conta('b', { crnStatus: 'em_conferencia' })).selo).toEqual({ texto: 'CRN em conferência', tom: 'info' })
    expect(seloDaSituacao(conta('c', { crnStatus: 'nao_encontrado' })).selo).toEqual({ texto: 'CRN não encontrado', tom: 'aviso' })
  })

  it('estudante', () => {
    const estudante = { situacao: 'estudante', crnRegiao: null, crnStatus: null } as const
    expect(seloDaSituacao(conta('a', { ...estudante, pedidoStatus: 'aprovado' }))).toEqual({ situacao: 'Estudante', selo: { texto: 'Matrícula aprovada', tom: 'sucesso' } })
    expect(seloDaSituacao(conta('b', { ...estudante, pedidoStatus: 'em_analise' })).selo).toEqual({ texto: 'Comprovante em análise', tom: 'info' })
    expect(seloDaSituacao(conta('c', { ...estudante, pedidoStatus: 'recusado' })).selo).toEqual({ texto: 'Comprovante recusado', tom: 'aviso' })
    expect(seloDaSituacao(conta('d', { ...estudante, pedidoStatus: null })).selo).toEqual({ texto: 'Sem comprovante', tom: 'neutro' })
  })

  it('foco 4: conta sem situação, como a do dono', () => {
    expect(seloDaSituacao(conta('dono', { situacao: null, crnRegiao: null, crnStatus: null }))).toEqual({ situacao: 'Sem situação', selo: null })
  })

  it('plano pago ativo é o selo verde com o ciclo', () => {
    expect(textoDoPlano(conta('a', { assinatura: paga('pro', 'mensal', 6490) }), AGORA)).toEqual({ texto: 'Pro mensal', tom: 'sucesso', aviso: null })
    expect(textoDoPlano(conta('b', { assinatura: paga('solo', 'anual', 29900) }), AGORA).texto).toBe('Solo anual')
  })

  it('pendente e pausada mostram o plano e o aviso', () => {
    expect(textoDoPlano(conta('a', { assinatura: paga('solo', 'mensal', 3490, { status: 'pendente' }) }), AGORA)).toEqual({
      texto: 'Solo mensal',
      tom: null,
      aviso: { texto: 'Pagamento pendente', tom: 'aviso' },
    })
    // O webhook troca o plano para free quando a assinatura não está ativa.
    const pendenteFree = { plano: 'free', status: 'pendente', ciclo: null, valorCentavos: 3490, expiraEm: null, atualizadaEm: '2026-09-21T12:00:00Z' } as const
    expect(textoDoPlano(conta('b', { assinatura: pendenteFree }), AGORA)).toEqual({ texto: 'Free', tom: null, aviso: { texto: 'Pagamento pendente', tom: 'aviso' } })
    expect(textoDoPlano(conta('c', { assinatura: paga('pro', 'mensal', 6490, { status: 'pausada' }) }), AGORA).aviso).toEqual({ texto: 'Pausada', tom: 'aviso' })
  })

  it('Estudante dentro do prazo; o resto é Free', () => {
    const estudante = (expiraEm: string | null) =>
      conta('e', { assinatura: { plano: 'estudante', status: 'ativa', ciclo: null, valorCentavos: 0, expiraEm, atualizadaEm: '2026-09-01T00:00:00Z' } })
    expect(textoDoPlano(estudante('2027-07-01T00:00:00Z'), AGORA)).toEqual({ texto: 'Estudante', tom: null, aviso: null })
    expect(textoDoPlano(estudante('2026-09-01T00:00:00Z'), AGORA).texto).toBe('Free')
    expect(textoDoPlano(conta('f'), AGORA)).toEqual({ texto: 'Free', tom: null, aviso: null })
    expect(textoDoPlano(conta('g', { assinatura: paga('solo', 'mensal', 3490, { status: 'cancelada' }) }), AGORA).texto).toBe('Free')
  })
})
