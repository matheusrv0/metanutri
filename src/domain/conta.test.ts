import {
  descontoAnualPct,
  ehPacienteAtivo,
  estadoDoLimite,
  LIMITES_ATIVOS,
  mensalizadoDoAnual,
  nomeSugerido,
  pacientesAtivos,
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

  it('tem os cinco planos do plano de negócio, com os preços aprovados', () => {
    expect(PLANOS.map((p) => p.id)).toEqual(['free', 'estudante', 'solo', 'pro', 'clinica'])
    expect(planoPorId('solo')?.mensal).toBe(34.9)
    expect(planoPorId('solo')?.anual).toBe(299)
    expect(planoPorId('pro')?.mensal).toBe(64.9)
    expect(planoPorId('pro')?.anual).toBe(599)
    expect(planoPorId('clinica')?.mensal).toBe(149)
  })

  it('o destaque é o Solo, que é quem o plano de negócio quer vender', () => {
    expect(PLANOS.find((p) => p.destaque)?.id).toBe('solo')
  })

  it('cada plano diz quantos pacientes ativos aceita', () => {
    expect(planoPorId('free')?.limitePacientesAtivos).toBe(2)
    expect(planoPorId('estudante')?.limitePacientesAtivos).toBe(10)
    expect(planoPorId('solo')?.limitePacientesAtivos).toBe(25)
    expect(planoPorId('pro')?.limitePacientesAtivos).toBeNull()
  })

  it('só o Free carrega a marca no PDF, e só o Estudante exige comprovante', () => {
    expect(PLANOS.filter((p) => p.marcaNoPdf).map((p) => p.id)).toEqual(['free'])
    expect(PLANOS.filter((p) => p.exigeComprovante).map((p) => p.id)).toEqual(['estudante'])
  })

  it('o anual é sempre mais barato que doze meses do mensal', () => {
    for (const plano of PLANOS.filter((p) => p.mensal > 0 && p.anual > 0)) {
      expect(plano.anual).toBeLessThan(plano.mensal * 12)
    }
  })

  it('calcula o mês equivalente do plano anual', () => {
    const solo = planoPorId('solo')
    if (!solo) throw new Error('O plano Solo precisa existir.')
    expect(mensalizadoDoAnual(solo)).toBeCloseTo(24.92, 2)
  })

  it('calcula o desconto do anual, e zero quando o plano não tem anual', () => {
    const solo = planoPorId('solo')
    const clinica = planoPorId('clinica')
    const estudante = planoPorId('estudante')
    if (!solo || !clinica || !estudante) throw new Error('Os três planos precisam existir.')
    expect(descontoAnualPct(solo)).toBe(29)
    expect(descontoAnualPct(clinica)).toBe(0)
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

describe('Paciente ativo, que é a unidade de cobrança', () => {
  const agora = new Date('2026-09-26T12:00:00Z')

  it('conta quem teve plano ou missão dentro dos 30 dias', () => {
    expect(ehPacienteAtivo('2026-09-25T12:00:00Z', agora)).toBe(true)
    expect(ehPacienteAtivo('2026-08-28T12:00:00Z', agora)).toBe(true)
  })

  it('não conta quem passou dos 30 dias', () => {
    expect(ehPacienteAtivo('2026-08-26T11:00:00Z', agora)).toBe(false)
  })

  it('paciente que nunca teve atividade não conta', () => {
    expect(ehPacienteAtivo(null, agora)).toBe(false)
    expect(ehPacienteAtivo(undefined, agora)).toBe(false)
  })

  it('data quebrada não conta e não estoura', () => {
    expect(ehPacienteAtivo('nem data isso é', agora)).toBe(false)
  })

  it('data no futuro não conta: é sujeira, não atividade', () => {
    expect(ehPacienteAtivo('2026-10-01T12:00:00Z', agora)).toBe(false)
  })

  it('soma só os ativos da lista', () => {
    const datas = ['2026-09-20T12:00:00Z', '2026-01-01T12:00:00Z', null, '2026-09-26T09:00:00Z']
    expect(pacientesAtivos(datas, agora)).toBe(2)
  })
})

describe('Limite do plano', () => {
  it('avisa quantos ainda cabem', () => {
    const free = planoPorId('free')
    if (!free) throw new Error('O plano Free precisa existir.')
    expect(estadoDoLimite(free, 1)).toEqual({ ativos: 1, limite: 2, excedeu: false, restantes: 1 })
  })

  it('marca que excedeu quando passa do limite', () => {
    const free = planoPorId('free')
    if (!free) throw new Error('O plano Free precisa existir.')
    expect(estadoDoLimite(free, 3).excedeu).toBe(true)
    expect(estadoDoLimite(free, 3).restantes).toBe(0)
  })

  it('plano ilimitado nunca excede', () => {
    const pro = planoPorId('pro')
    if (!pro) throw new Error('O plano Pro precisa existir.')
    expect(estadoDoLimite(pro, 900)).toEqual({ ativos: 900, limite: null, excedeu: false, restantes: null })
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
