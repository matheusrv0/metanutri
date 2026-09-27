import {
  criarAcompanhamento,
  diaLocal,
  diasEntre,
  diasMarcadosNaSemana,
  estadoDoAcompanhamento,
  feitasNoDia,
  gerarToken,
  marcarMissao,
  regerarLink,
  missoesDoDia,
  progressoDoDia,
  ultimaAtividade,
  ultimaMarcacao,
  type Acompanhamento,
} from './acompanhamento.ts'
import type { Missao } from './missoes.ts'

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 07:00', origem: 'Refeição do plano' },
  { id: 'refeicao-2', texto: 'Almoço por volta das 12:00', origem: 'Refeição do plano' },
  { id: 'agua', texto: 'Beber cerca de 2,1 litros de água', origem: '35 ml por quilo' },
]

function novo(parcial: Partial<Acompanhamento> = {}): Acompanhamento {
  const base = criarAcompanhamento(
    { casoId: 'caso-1', pacienteId: 'pac-1', nome: 'Ana', missoes: MISSOES },
    { agora: () => '2026-09-20T10:00:00.000Z', gerarId: () => 'ac-1', aleatorio: (n) => new Uint8Array(n).fill(7) },
  )
  return { ...base, ...parcial }
}

describe('Criação do link do paciente', () => {
  it('guarda o caso, o nome e as missões congeladas', () => {
    const a = novo()
    expect(a.id).toBe('ac-1')
    expect(a.casoId).toBe('caso-1')
    expect(a.nome).toBe('Ana')
    expect(a.missoes).toHaveLength(3)
    expect(a.marcacoes).toEqual([])
  })

  it('tira o espaço sobrando do nome', () => {
    const a = criarAcompanhamento({ casoId: 'c', pacienteId: null, nome: '  Ana  ', missoes: MISSOES }, { gerarId: () => 'x' })
    expect(a.nome).toBe('Ana')
  })

  it('o token tem 12 caracteres e não usa letra que se confunde com número', () => {
    const token = gerarToken((n) => new Uint8Array(n).map((_, i) => i * 7))
    expect(token).toHaveLength(12)
    expect(token).not.toMatch(/[l10]/)
  })

  it('dois links seguidos não saem iguais', () => {
    let contador = 0
    const aleatorio = (n: number) => new Uint8Array(n).map(() => contador++)
    expect(gerarToken(aleatorio)).not.toBe(gerarToken(aleatorio))
  })
})

describe('Gerar o link de novo', () => {
  const outras: readonly Missao[] = [{ id: 'treino', texto: 'Treinar 30 minutos', origem: 'Combinado na consulta' }]

  it('troca o token: o link antigo para de valer', () => {
    const antigo = novo()
    const atualizado = regerarLink(antigo, { missoes: outras }, { aleatorio: (n) => new Uint8Array(n).fill(19) })
    expect(atualizado.token).not.toBe(antigo.token)
  })

  it('mantém o mesmo registro e o histórico de marcações', () => {
    const antigo = marcarMissao(novo(), '2026-09-21', 'agua', true)
    const atualizado = regerarLink(antigo, { missoes: outras })
    expect(atualizado.id).toBe(antigo.id)
    expect(atualizado.casoId).toBe(antigo.casoId)
    expect(atualizado.criadoEm).toBe(antigo.criadoEm)
    expect(atualizado.marcacoes).toEqual(antigo.marcacoes)
  })

  it('troca as missões pelas do plano de agora', () => {
    const atualizado = regerarLink(novo(), { missoes: outras })
    expect(atualizado.missoes).toEqual(outras)
  })

  it('missão antiga marcada não aparece mais, mas o dia continua contando', () => {
    const antigo = marcarMissao(novo(), '2026-09-26', 'agua', true)
    const atualizado = regerarLink(antigo, { missoes: outras })
    expect(missoesDoDia(atualizado, '2026-09-26').map((m) => m.id)).toEqual(['treino'])
    expect(diasMarcadosNaSemana(atualizado, '2026-09-26')).toBe(1)
  })

  it('atualiza o nome quando o plano mudou de nome', () => {
    expect(regerarLink(novo(), { nome: '  Ana Paula ', missoes: outras }).nome).toBe('Ana Paula')
    expect(regerarLink(novo(), { missoes: outras }).nome).toBe('Ana')
  })
})

describe('Marcar missão', () => {
  it('marca e desmarca', () => {
    const marcado = marcarMissao(novo(), '2026-09-21', 'agua', true)
    expect(feitasNoDia(marcado, '2026-09-21')).toEqual(['agua'])

    const desmarcado = marcarMissao(marcado, '2026-09-21', 'agua', false)
    expect(feitasNoDia(desmarcado, '2026-09-21')).toEqual([])
  })

  it('não duplica quando marca duas vezes', () => {
    const uma = marcarMissao(novo(), '2026-09-21', 'agua', true)
    const duas = marcarMissao(uma, '2026-09-21', 'agua', true)
    expect(feitasNoDia(duas, '2026-09-21')).toEqual(['agua'])
    expect(duas).toBe(uma)
  })

  it('desmarcar o que não estava marcado não muda nada', () => {
    const a = novo()
    expect(marcarMissao(a, '2026-09-21', 'agua', false)).toBe(a)
  })

  it('missão que não está no link é ignorada', () => {
    const a = novo()
    const adulterado = marcarMissao(a, '2026-09-21', 'correr-maratona', true)
    expect(adulterado).toBe(a)
    expect(adulterado.marcacoes).toEqual([])
  })

  it('o dia sem nenhuma missão marcada some do registro', () => {
    const marcado = marcarMissao(novo(), '2026-09-21', 'agua', true)
    const limpo = marcarMissao(marcado, '2026-09-21', 'agua', false)
    expect(limpo.marcacoes).toEqual([])
  })

  it('guarda os dias em ordem', () => {
    let a = novo()
    a = marcarMissao(a, '2026-09-23', 'agua', true)
    a = marcarMissao(a, '2026-09-21', 'agua', true)
    a = marcarMissao(a, '2026-09-22', 'agua', true)
    expect(a.marcacoes.map((m) => m.dia)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23'])
  })

  it('não altera o acompanhamento original', () => {
    const a = novo()
    marcarMissao(a, '2026-09-21', 'agua', true)
    expect(a.marcacoes).toEqual([])
  })
})

describe('Missões e progresso do dia', () => {
  it('devolve todas as missões, marcando as feitas', () => {
    const a = marcarMissao(novo(), '2026-09-21', 'refeicao-2', true)
    const dia = missoesDoDia(a, '2026-09-21')
    expect(dia.map((m) => m.feita)).toEqual([false, true, false])
  })

  it('calcula a porcentagem do dia', () => {
    const a = marcarMissao(novo(), '2026-09-21', 'refeicao-2', true)
    expect(progressoDoDia(a, '2026-09-21')).toEqual({ feitas: 1, total: 3, pct: 33 })
  })

  it('dia sem nada marcado é zero, não estoura', () => {
    expect(progressoDoDia(novo(), '2026-09-21')).toEqual({ feitas: 0, total: 3, pct: 0 })
  })

  it('plano sem missão nenhuma não divide por zero', () => {
    const vazio = novo({ missoes: [] })
    expect(progressoDoDia(vazio, '2026-09-21')).toEqual({ feitas: 0, total: 0, pct: 0 })
  })
})

describe('Dias marcados na semana', () => {
  const comDias = (dias: readonly string[]) => novo({ marcacoes: dias.map((dia) => ({ dia, feitas: ['agua'] })) })

  it('conta os dias dentro da janela de sete dias', () => {
    const a = comDias(['2026-09-20', '2026-09-21', '2026-09-24', '2026-09-26'])
    expect(diasMarcadosNaSemana(a, '2026-09-26')).toBe(4)
  })

  it('ignora o que passou de sete dias', () => {
    const a = comDias(['2026-09-19', '2026-09-26'])
    expect(diasMarcadosNaSemana(a, '2026-09-26')).toBe(1)
  })

  it('ignora dia no futuro', () => {
    const a = comDias(['2026-09-30'])
    expect(diasMarcadosNaSemana(a, '2026-09-26')).toBe(0)
  })

  it('dia registrado sem nenhuma missão feita não conta', () => {
    const a = novo({ marcacoes: [{ dia: '2026-09-26', feitas: [] }] })
    expect(diasMarcadosNaSemana(a, '2026-09-26')).toBe(0)
  })
})

describe('Estado do paciente, que é o que o nutricionista olha', () => {
  const comDias = (dias: readonly string[]) => novo({ marcacoes: dias.map((dia) => ({ dia, feitas: ['agua'] })) })

  it('em dia: quatro ou mais dias marcados na semana', () => {
    const a = comDias(['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'])
    expect(estadoDoAcompanhamento(a, '2026-09-26')).toBe('em-dia')
  })

  it('atenção: está marcando, mas abaixo da meta', () => {
    const a = comDias(['2026-09-25', '2026-09-26'])
    expect(estadoDoAcompanhamento(a, '2026-09-26')).toBe('atencao')
  })

  it('sumindo: quatro dias sem marcar nada', () => {
    const a = comDias(['2026-09-22'])
    expect(estadoDoAcompanhamento(a, '2026-09-26')).toBe('sumindo')
  })

  it('sumindo vence semana boa: quem ia bem e parou aparece como sumindo', () => {
    const a = comDias(['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22'])
    expect(estadoDoAcompanhamento(a, '2026-09-26')).toBe('sumindo')
  })

  it('link recém-criado sem marcação nenhuma ainda não é sumiço', () => {
    expect(estadoDoAcompanhamento(novo(), '2026-09-21')).toBe('nao-comecou')
  })

  it('link velho sem marcação nenhuma é sumiço', () => {
    expect(estadoDoAcompanhamento(novo(), '2026-09-26')).toBe('sumindo')
  })
})

describe('Última atividade, que é o que a cobrança olha', () => {
  it('usa a marcação mais recente', () => {
    const a = novo({ marcacoes: [{ dia: '2026-09-21', feitas: ['agua'] }, { dia: '2026-09-24', feitas: ['agua'] }] })
    expect(ultimaMarcacao(a)).toBe('2026-09-24')
    expect(ultimaAtividade(a)).toBe('2026-09-24T12:00:00.000Z')
  })

  it('sem marcação nenhuma, vale a data em que o link foi criado', () => {
    expect(ultimaMarcacao(novo())).toBeNull()
    expect(ultimaAtividade(novo())).toBe('2026-09-20T10:00:00.000Z')
  })
})

describe('Dia do calendário', () => {
  it('usa o fuso de quem está olhando, não UTC', () => {
    // 21h de Brasília: em UTC já virou o dia seguinte, e as missões de hoje sumiriam.
    const noite = new Date(2026, 8, 26, 21, 30)
    expect(diaLocal(noite)).toBe('2026-09-26')
  })

  it('preenche mês e dia com zero à esquerda', () => {
    expect(diaLocal(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05')
  })

  it('conta a distância entre dois dias', () => {
    expect(diasEntre('2026-09-20', '2026-09-26')).toBe(6)
    expect(diasEntre('2026-09-26', '2026-09-20')).toBe(-6)
  })

  it('atravessa a virada do mês sem errar', () => {
    expect(diasEntre('2026-09-28', '2026-10-02')).toBe(4)
  })

  it('data quebrada devolve NaN em vez de número errado', () => {
    expect(diasEntre('nem data', '2026-09-26')).toBeNaN()
  })
})
