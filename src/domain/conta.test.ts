import {
  codigoCompleto,
  comparativoDosPlanos,
  descontoAnualPct,
  ehCiclo,
  ehIdPlano,
  ehPacienteAtivo,
  estadoDoLimite,
  LIMITES_ATIVOS,
  mensalizadoDoAnual,
  MENSAGEM_ERRO,
  nomeSugerido,
  pacientesAtivos,
  planoPorId,
  planoSeguinte,
  podeGerarLink,
  PLANOS,
  PLANOS_COMPARADOS,
  SENHA_MINIMA,
  soDigitos,
  validarCadastro,
  validarEntrada,
  valorNoCiclo,
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

  it('Free e Estudante carregam marca no PDF; só o Estudante exige e-mail de faculdade', () => {
    // O Estudante entrou na lista em 27/09: conta de estágio sai marcada, como no
    // WebDiet, porque o documento não pode passar por atendimento profissional.
    expect(PLANOS.filter((p) => p.marcaNoPdf).map((p) => p.id)).toEqual(['free', 'estudante'])
    expect(PLANOS.filter((p) => p.exigeEmailDeFaculdade).map((p) => p.id)).toEqual(['estudante'])
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

  it('CA-129: cadastro pede nome, e-mail válido, senha de 8 e o aceite dos termos', () => {
    const certo = { nome: 'Maria', email: 'maria@exemplo.com', senha: 'senhaforte1', aceitouTermos: true }
    expect(validarCadastro(certo)).toBeNull()
    expect(validarCadastro({ ...certo, nome: '   ' })).toBe('nome-vazio')
    expect(validarCadastro({ ...certo, email: 'maria' })).toBe('email-invalido')
    expect(validarCadastro({ ...certo, senha: '1234567' })).toBe('senha-curta')
    expect(validarCadastro({ ...certo, aceitouTermos: false })).toBe('termos')
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

describe('Limite de links de missões (conta de estudante)', () => {
  it('o plano Estudante gera no máximo 3 links', () => {
    const estudante = planoPorId('estudante')
    if (!estudante) throw new Error('O plano Estudante precisa existir.')

    expect(estudante.limiteLinksPaciente).toBe(3)
    expect(podeGerarLink(estudante, 2)).toBe(true)
    expect(podeGerarLink(estudante, 3)).toBe(false)
  })

  it('só a conta de estudante é de uso não comercial', () => {
    expect(PLANOS.filter((p) => p.usoNaoComercial).map((p) => p.id)).toEqual(['estudante'])
  })

  it('plano ilimitado nunca trava', () => {
    const pro = planoPorId('pro')
    if (!pro) throw new Error('O plano Pro precisa existir.')
    expect(podeGerarLink(pro, 9999)).toBe(true)
  })

  it('o Free também tem teto de links, igual ao de pacientes', () => {
    const free = planoPorId('free')
    if (!free) throw new Error('O plano Free precisa existir.')
    expect(podeGerarLink(free, 2)).toBe(false)
  })
})

describe('Comparativo da página de preços', () => {
  const linhas = comparativoDosPlanos()

  it('compara quatro colunas, sem coluna de Estudante', () => {
    expect(PLANOS_COMPARADOS).toEqual(['free', 'solo', 'pro', 'clinica'])
  })

  it('toda linha tem um valor por coluna', () => {
    for (const linha of linhas) expect(linha.valores).toHaveLength(PLANOS_COMPARADOS.length)
  })

  it('os números vêm dos planos, não de texto solto na tela', () => {
    const pacientes = linhas.find((l) => l.rotulo === 'Pacientes ativos')
    const links = linhas.find((l) => l.rotulo === 'Links de missões')

    expect(pacientes?.valores).toEqual(['2', '25', 'Ilimitados', 'Ilimitados'])
    expect(links?.valores).toEqual(['2', '25', 'Ilimitados', 'Ilimitados'])
  })

  it('mudar o limite de um plano muda o comparativo junto', () => {
    const free = planoPorId('free')
    const pacientes = linhas.find((l) => l.rotulo === 'Pacientes ativos')
    expect(pacientes?.valores[0]).toBe(String(free?.limitePacientesAtivos))
  })

  it('o logo próprio é o inverso da marca no PDF', () => {
    const logo = linhas.find((l) => l.rotulo === 'Seu logo nos documentos')
    expect(logo?.valores).toEqual([false, true, true, true])
  })

  it('o que todo plano tem aparece marcado em todas as colunas', () => {
    const missoes = linhas.find((l) => l.rotulo === 'Missões diárias do paciente')
    expect(missoes?.valores).toEqual([true, true, true, true])
  })

  it('só a Clínica tem mais de um nutricionista', () => {
    const equipe = linhas.find((l) => l.rotulo.startsWith('Mais de um nutricionista'))
    expect(equipe?.valores).toEqual([false, false, false, 'Até 4'])
  })

  it('nenhuma linha fica sem rótulo', () => {
    for (const linha of linhas) expect(linha.rotulo.length).toBeGreaterThan(3)
  })
})

describe('Ciclo de cobrança (CA-159)', () => {
  it('reconhece só mensal e anual', () => {
    expect(ehCiclo('anual')).toBe(true)
    expect(ehCiclo('semestral')).toBe(false)
    expect(ehCiclo(undefined)).toBe(false)
  })

  it('o que se paga de uma vez: o mês no mensal, o ano no anual', () => {
    const solo = planoPorId('solo')
    if (!solo) throw new Error('Solo sumiu')
    expect(valorNoCiclo(solo, 'mensal')).toBe(34.9)
    expect(valorNoCiclo(solo, 'anual')).toBe(299)
  })

  it('plano sem anual cobra o mensal mesmo no anual', () => {
    const clinica = planoPorId('clinica')
    if (!clinica) throw new Error('Clínica sumiu')
    expect(valorNoCiclo(clinica, 'anual')).toBe(149)
  })

  it('reconhece id de plano e recusa o que não existe', () => {
    expect(ehIdPlano('pro')).toBe(true)
    expect(ehIdPlano('ouro')).toBe(false)
  })
})

describe('Plano seguinte, para o aviso de limite (CA-177)', () => {
  it.each([
    ['free', 'solo'],
    ['estudante', 'solo'],
    ['solo', 'pro'],
    ['pro', 'clinica'],
    ['clinica', null],
  ] as const)('%s sobe para %s', (atual, seguinte) => {
    expect(planoSeguinte(atual)).toBe(seguinte)
  })
})

describe('Mensagens de erro da conta', () => {
  it('toda mensagem existe e é frase de verdade', () => {
    for (const texto of Object.values(MENSAGEM_ERRO)) expect(texto.length).toBeGreaterThan(10)
  })

  it('CA-136: credencial errada não diz qual dos dois errou', () => {
    expect(MENSAGEM_ERRO['credencial-invalida']).toBe('E-mail ou senha não conferem.')
  })
})

describe('Código do e-mail (spec confirmacao-por-codigo)', () => {
  it('CA-408: código errado ou vencido diz o que fazer', () => {
    expect(MENSAGEM_ERRO['codigo-invalido']).toBe('Código errado ou vencido. Confira o último e-mail ou peça outro.')
  })

  it('CA-411: entrar sem confirmar pede a confirmação', () => {
    expect(MENSAGEM_ERRO['email-nao-confirmado']).toBe('Confirme seu e-mail antes de entrar.')
  })

  it.each([
    ['123456', '123456'],
    ['123 456', '123456'],
    ['123-456', '123456'],
    [' 12 34 56 ', '123456'],
    ['abc', ''],
    ['12345678901234', '1234567890'],
  ])('CB-100: "%s" vira "%s": só os dígitos contam', (colado, digitos) => {
    expect(soDigitos(colado)).toBe(digitos)
  })

  it('o código tem de 6 a 10 dígitos: o tamanho é configurável no projeto do Supabase', () => {
    expect(codigoCompleto('12345')).toBe(false)
    expect(codigoCompleto('123 456')).toBe(true)
    expect(codigoCompleto('12345678')).toBe(true)
  })
})
