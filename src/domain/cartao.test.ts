import {
  ACEITE_FALTANDO,
  campoDoErroDoToken,
  CAMPOS_NAO_CARREGARAM,
  CONFIRA_O_CARTAO,
  cpfValido,
  ehCredito,
  errosDoCartao,
  FALHA_DESCONHECIDA,
  mascararCpf,
  mensagemDaRecusa,
  nomeValido,
  PAGAMENTO_INDISPONIVEL,
  RECUSA_PADRAO,
  SERVIDOR_FORA,
  USE_CREDITO,
} from './cartao.ts'

describe('CPF do titular (CA-370)', () => {
  it.each(['123.456.789-09', '12345678909', '529.982.247-25'])('%s é válido', (cpf) => {
    expect(cpfValido(cpf)).toBe(true)
  })

  it.each(['123.456.789-00', '111.111.111-11', '1234567890', '', '123.456.789-0a'])('"%s" não é válido', (cpf) => {
    expect(cpfValido(cpf)).toBe(false)
  })

  it('ganha pontos e traço enquanto digita, e para em 11 números', () => {
    expect(mascararCpf('123')).toBe('123')
    expect(mascararCpf('1234')).toBe('123.4')
    expect(mascararCpf('1234567')).toBe('123.456.7')
    expect(mascararCpf('1234567890')).toBe('123.456.789-0')
    expect(mascararCpf('12345678909')).toBe('123.456.789-09')
    expect(mascararCpf('123456789091234')).toBe('123.456.789-09')
    expect(mascararCpf('abc')).toBe('')
  })
})

describe('nome impresso no cartão', () => {
  it.each(['APRO', 'Ana P. Souza', "Ana D'Ávila", 'João-Pedro Lima'])('"%s" serve', (nome) => {
    expect(nomeValido(nome)).toBe(true)
  })

  it.each(['A', '', '   ', 'Ana 2', '.Ana'])('"%s" não serve', (nome) => {
    expect(nomeValido(nome)).toBe(false)
  })
})

describe('erros do formulário (CA-370)', () => {
  const VAZIOS = { numero: 'vazio', validade: 'vazio', codigo: 'vazio' } as const
  const VALIDOS = { numero: 'valido', validade: 'valido', codigo: 'valido' } as const

  it('tudo vazio: um erro por campo, na ordem da tela', () => {
    const erros = errosDoCartao({ seguros: VAZIOS, nome: '', cpf: '' })
    expect(erros).toEqual({
      numero: 'Digite o número do cartão.',
      validade: 'Digite a validade, como 11/30.',
      codigo: 'Digite o código de segurança.',
      nome: 'Digite o nome como está impresso no cartão.',
      cpf: 'Digite o CPF do titular do cartão.',
    })
    expect(Object.keys(erros)).toEqual(['numero', 'validade', 'codigo', 'nome', 'cpf'])
  })

  it('inválidos: os campos seguros recusados, nome com número e CPF com dígito errado', () => {
    expect(errosDoCartao({ seguros: { numero: 'invalido', validade: 'valido', codigo: 'invalido' }, nome: 'Ana 2', cpf: '123.456.789-00' })).toEqual({
      numero: 'Confira o número do cartão.',
      codigo: 'Confira o código de segurança.',
      nome: 'Use só letras no nome.',
      cpf: 'Confira o CPF: os dígitos não batem.',
    })
  })

  it('tudo certo: nenhum erro', () => {
    expect(errosDoCartao({ seguros: VALIDOS, nome: 'APRO', cpf: '123.456.789-09' })).toEqual({})
  })
})

describe('só cartão de crédito (CA-369, D-67)', () => {
  it('crédito passa; débito e pré-pago travam', () => {
    expect(ehCredito('credit_card')).toBe(true)
    expect(ehCredito('debit_card')).toBe(false)
    expect(ehCredito('prepaid_card')).toBe(false)
  })

  it('sem o tipo ainda (antes dos primeiros números, ou a operadora não disse), deixa seguir: o banco confere', () => {
    expect(ehCredito(null)).toBe(true)
  })

  it('CA-369, CA-370, CA-374, CB-88 e CB-89: as frases fixas da spec', () => {
    expect(USE_CREDITO).toBe('Use um cartão de crédito.')
    expect(CAMPOS_NAO_CARREGARAM).toBe('Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site.')
    expect(PAGAMENTO_INDISPONIVEL).toBe('O pagamento não está disponível agora.')
    expect(SERVIDOR_FORA).toBe('Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos.')
    expect(ACEITE_FALTANDO).toBe('Marque a autorização da cobrança para assinar.')
  })
})

describe('o motivo da recusa em português (CA-373, CB-90)', () => {
  it('a recusa padrão é a frase da spec', () => {
    expect(RECUSA_PADRAO).toBe('O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.')
    expect(mensagemDaRecusa('cc_rejected_other_reason')).toBe(RECUSA_PADRAO)
    expect(mensagemDaRecusa('recusado')).toBe(RECUSA_PADRAO)
  })

  it('cada motivo conhecido do banco tem a sua frase, e todas dizem que nada foi cobrado', () => {
    for (const codigo of [
      'cc_rejected_bad_filled_card_number',
      'cc_rejected_bad_filled_date',
      'cc_rejected_bad_filled_security_code',
      'cc_rejected_bad_filled_other',
      'cc_rejected_insufficient_amount',
      'cc_rejected_call_for_authorize',
      'cc_rejected_card_disabled',
      'cc_rejected_high_risk',
      'cc_rejected_blacklist',
      'cc_rejected_max_attempts',
    ]) {
      expect(mensagemDaRecusa(codigo), codigo).toMatch(/Nada foi cobrado\.$/)
    }
    expect(mensagemDaRecusa('cc_rejected_insufficient_amount')).toBe('O cartão não tem limite para esta cobrança. Use outro cartão. Nada foi cobrado.')
  })

  it('foco 3: código desconhecido ou vazio vira a recusa padrão', () => {
    expect(mensagemDaRecusa('cc_rejected_um_motivo_novo')).toBe(RECUSA_PADRAO)
    expect(mensagemDaRecusa(null)).toBe(RECUSA_PADRAO)
    expect(mensagemDaRecusa(undefined)).toBe(RECUSA_PADRAO)
  })

  it('CB-90: código do cartão vencido ou já usado pede para conferir o cartão de novo', () => {
    expect(mensagemDaRecusa('token-invalido')).toBe(CONFIRA_O_CARTAO)
    expect(CONFIRA_O_CARTAO).toBe('Confira os dados do cartão e tente de novo. Nada foi cobrado.')
  })

  it('falha que não é do cartão não culpa o banco', () => {
    expect(mensagemDaRecusa('falha')).toBe(FALHA_DESCONHECIDA)
    expect(FALHA_DESCONHECIDA).not.toContain('banco')
  })
})

describe('o erro do gerador do código do cartão aponta o campo (CA-370)', () => {
  it.each([
    [['205'], 'numero'],
    [['E301'], 'numero'],
    [['208'], 'validade'],
    [['326'], 'validade'],
    [['E302'], 'codigo'],
    [['224'], 'codigo'],
    [['221'], 'nome'],
    [['324'], 'cpf'],
    [['324', '205'], 'numero'],
    [['999'], null],
    [[], null],
  ] as const)('%j → %s', (codigos, campo) => {
    expect(campoDoErroDoToken(codigos)).toBe(campo)
  })
})
