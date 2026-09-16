import {
  descontoAnualPct,
  LIMITES_ATIVOS,
  mensalizadoDoAnual,
  nomeSugerido,
  planoPorId,
  PLANOS,
  SENHA_MINIMA,
  validarCadastro,
  validarEntrada,
} from './conta.ts'

describe('Planos de assinatura', () => {
  it('tem um plano grátis e um único destaque', () => {
    expect(PLANOS.some((p) => p.mensal === 0)).toBe(true)
    expect(PLANOS.filter((p) => p.destaque)).toHaveLength(1)
  })

  it('o plano principal respeita o teto de R$ 20 combinado na entrevista', () => {
    const destaque = PLANOS.find((p) => p.destaque)
    expect(destaque?.mensal).toBeLessThanOrEqual(20)
  })

  it('o anual é sempre mais barato que doze meses do mensal', () => {
    for (const plano of PLANOS.filter((p) => p.mensal > 0)) {
      expect(plano.anual).toBeLessThan(plano.mensal * 12)
    }
  })

  it('calcula o mês equivalente do plano anual', () => {
    const profissional = planoPorId('profissional')
    if (!profissional) throw new Error('O plano profissional precisa existir.')
    expect(mensalizadoDoAnual(profissional)).toBeCloseTo(15.17, 2)
  })

  it('calcula o desconto do anual, e zero quando não há', () => {
    const profissional = planoPorId('profissional')
    const estudante = planoPorId('estudante')
    if (!profissional || !estudante) throw new Error('Os dois planos precisam existir.')
    expect(descontoAnualPct(profissional)).toBe(20)
    expect(descontoAnualPct(estudante)).toBe(0)
  })

  it('plano que não existe devolve nulo em vez de estourar', () => {
    // @ts-expect-error id fora do tipo, que é o caso de um endereço adulterado
    expect(planoPorId('ouro')).toBeNull()
  })

  it('enquanto não há cobrança, nenhum limite é aplicado', () => {
    expect(LIMITES_ATIVOS).toBe(false)
  })
})

describe('Validação do formulário de conta', () => {
  it('aceita e-mail e senha válidos', () => {
    expect(validarEntrada('maria@exemplo.com', 'senhaforte1')).toBeNull()
  })

  it('recusa e-mail sem arroba ou sem domínio', () => {
    expect(validarEntrada('maria', 'senhaforte1')).toBe('email-invalido')
    expect(validarEntrada('maria@exemplo', 'senhaforte1')).toBe('email-invalido')
  })

  it(`recusa senha com menos de ${SENHA_MINIMA} caracteres`, () => {
    expect(validarEntrada('maria@exemplo.com', '1234567')).toBe('senha-curta')
  })

  it('no cadastro, cobra a confirmação igual', () => {
    expect(validarCadastro('maria@exemplo.com', 'senhaforte1', 'senhaforte2')).toBe('senha-diferente')
    expect(validarCadastro('maria@exemplo.com', 'senhaforte1', 'senhaforte1')).toBeNull()
  })

  it('espaço em volta do e-mail não invalida', () => {
    expect(validarEntrada('  maria@exemplo.com  ', 'senhaforte1')).toBeNull()
  })
})

describe('nomeSugerido', () => {
  it('monta um nome a partir do e-mail', () => {
    expect(nomeSugerido('maria.silva@gmail.com')).toBe('Maria Silva')
    expect(nomeSugerido('joao_costa@uol.com.br')).toBe('Joao Costa')
  })

  it('e-mail sem nada aproveitável não vira nome vazio', () => {
    expect(nomeSugerido('@exemplo.com')).toBe('Você')
  })
})
