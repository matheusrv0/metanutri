import {
  acrescentarPergunta,
  BLOCOS_ANAMNESE,
  blocosDaFicha,
  CHAVE_ROTEIRO,
  dicaDaPergunta,
  gravarRoteiro,
  lerRoteiro,
  limparRoteiro,
  normalizarRespostas,
  numeroDaUrina,
  renomearPergunta,
  respostaDaUrina,
  responder,
  resumoDoBloco,
  ROTEIRO_PADRAO,
  ESCALA_DA_URINA,
  tipoDaPergunta,
  tirarPergunta,
  TRIMESTRES,
  type RespostaAnamnese,
} from './anamnese.ts'
import type { Armazenamento } from './persistencia.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const textos = (lista: readonly { texto: string }[]) => lista.map((p) => p.texto)

describe('roteiro padrão (D-160, seção 2 da spec)', () => {
  it('CA-560 e CA-935: 10 blocos fixos, nesta ordem (spec conduta-da-nutricionista, D-299)', () => {
    expect(BLOCOS_ANAMNESE.map((b) => b.titulo)).toEqual([
      'Objetivo e queixa',
      'Rotina e sono',
      'Intestino',
      'Água',
      'Álcool e fumo',
      'Atividade física',
      'Preferências e aversões',
      'Intolerâncias e alergias',
      'Gestação',
      'Recordatório de 24 horas',
    ])
  })

  it('CA-934 e CA-935: as perguntas novas, com o tipo pelo id', () => {
    expect(ROTEIRO_PADRAO.perguntas.agua).toEqual([
      { id: 'agua-dia', texto: 'Quanta água bebe por dia' },
      { id: 'cor-da-urina', texto: 'Cor da urina' },
      { id: 'outras-bebidas', texto: 'Outras bebidas ao longo do dia' },
    ])
    expect(ROTEIRO_PADRAO.perguntas.intolerancias).toEqual([
      { id: 'intolerancias-alimentares', texto: 'Intolerâncias alimentares' },
      { id: 'alergias-alimentares', texto: 'Alergias alimentares' },
    ])
    expect(ROTEIRO_PADRAO.perguntas.gestacao).toEqual([
      { id: 'gestacao-trimestre', texto: 'Trimestre' },
      { id: 'gestacao-anotacoes', texto: 'Anotações da gestação' },
    ])
    expect(tipoDaPergunta('cor-da-urina')).toBe('cor-da-urina')
    expect(tipoDaPergunta('gestacao-trimestre')).toBe('trimestre')
    expect(tipoDaPergunta('agua-dia')).toBe('texto')
    expect(tipoDaPergunta('p-123')).toBe('texto')
    expect(dicaDaPergunta('cor-da-urina')).toBe('Escala de Armstrong: de 1 (quase transparente) a 8 (marrom); de 1 a 3, boa hidratação.')
    expect(dicaDaPergunta('alergias-alimentares')).toBe('Para o cobrir não sugerir o alimento, escreva-o também em Restrições e saúde.')
  })

  it('CA-934: a escala de Armstrong tem 8 cores, com número e nome, e a resposta fica legível', () => {
    expect(ESCALA_DA_URINA.map((c) => `${c.numero} · ${c.nome}`)).toEqual([
      '1 · Quase transparente',
      '2 · Amarelo muito claro',
      '3 · Amarelo-claro',
      '4 · Amarelo',
      '5 · Amarelo-escuro',
      '6 · Âmbar',
      '7 · Âmbar-escuro',
      '8 · Marrom',
    ])
    expect(respostaDaUrina(3)).toBe('3 · Amarelo-claro')
    expect(numeroDaUrina('3 · Amarelo-claro')).toBe(3)
    expect(numeroDaUrina(' 8 · Marrom ')).toBe(8)
    // CB-297: resposta que não é da escala (escrita como texto numa versão antiga) não vira número.
    expect(numeroDaUrina('clara')).toBeNull()
    expect(numeroDaUrina('9 · Roxo')).toBeNull()
    expect(numeroDaUrina('')).toBeNull()
  })

  it('CA-935: o trimestre é escolha única entre quatro respostas', () => {
    expect(TRIMESTRES).toEqual(['Não gestante', '1º trimestre', '2º trimestre', '3º trimestre'])
  })

  it('CA-562: o recordatório pergunta refeição por refeição', () => {
    expect(textos(ROTEIRO_PADRAO.perguntas.recordatorio)).toEqual(['Ao acordar', 'Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'])
  })

  it('seção 2: a consistência das fezes traz a dica da escala de Bristol; outra pergunta não tem dica', () => {
    expect(dicaDaPergunta('fezes')).toBe('Escala de Bristol: de 1 (bolinhas duras) a 7 (líquida); 3 e 4 são o esperado.')
    expect(dicaDaPergunta('queixa')).toBeUndefined()
    expect(dicaDaPergunta('constructor')).toBeUndefined()
  })

  it('as perguntas padrão têm ids únicos e nenhuma repete o Objetivo da identificação', () => {
    const todas = BLOCOS_ANAMNESE.flatMap((b) => ROTEIRO_PADRAO.perguntas[b.id])
    expect(new Set(todas.map((p) => p.id)).size).toBe(todas.length)
    expect(textos(ROTEIRO_PADRAO.perguntas.objetivo)).toEqual(['Queixa principal', 'Histórico do peso', 'Dietas que já fez', 'Suplementos que já usa', 'Doenças na família'])
    expect(textos(ROTEIRO_PADRAO.perguntas.rotina)).toContain('Óleo, sal e açúcar por mês em casa')
    expect(textos(ROTEIRO_PADRAO.perguntas.preferencias)).toContain('Apetite e mastigação')
  })
})

describe('ler e gravar o roteiro da conta (D-161, CB-160, CB-161, CB-162)', () => {
  it('sem nada guardado, ou sem armazenamento, vale o padrão', () => {
    expect(lerRoteiro(new Memoria())).toEqual(ROTEIRO_PADRAO)
    expect(lerRoteiro(null)).toEqual(ROTEIRO_PADRAO)
    expect(gravarRoteiro(null, ROTEIRO_PADRAO)).toBe(false)
  })

  it('grava e lê de volta', () => {
    const arm = new Memoria()
    const meu = renomearPergunta(ROTEIRO_PADRAO, 'agua', 'agua-dia', 'Litros de água por dia')
    expect(gravarRoteiro(arm, meu)).toBe(true)
    expect(lerRoteiro(arm)).toEqual(meu)
  })

  it('CB-162: JSON que não se lê vale o padrão', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, '{não é json')
    expect(lerRoteiro(arm)).toEqual(ROTEIRO_PADRAO)
    arm.setItem(CHAVE_ROTEIRO, '[1,2]')
    expect(lerRoteiro(arm)).toEqual(ROTEIRO_PADRAO)
  })

  it('CB-162: bloco desconhecido não aparece; bloco que falta usa o padrão; pergunta estragada sai', () => {
    const arm = new Memoria()
    arm.setItem(
      CHAVE_ROTEIRO,
      JSON.stringify({ formato: 1, versao: 2, blocos: { agua: [{ id: 'a1', texto: 'Água?' }, { id: 7, texto: 'x' }, { texto: 'sem id' }, 'lixo'], especialidade: [{ id: 'g', texto: 'Semanas' }] } }),
    )
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua).toEqual([{ id: 'a1', texto: 'Água?' }])
    expect(lido.perguntas.intestino).toEqual(ROTEIRO_PADRAO.perguntas.intestino)
    expect(Object.keys(lido.perguntas)).toEqual(BLOCOS_ANAMNESE.map((b) => b.id))
    expect(blocosDaFicha(lido, []).map((b) => b.id)).not.toContain('especialidade')
  })

  it('CA-589: o bloco que esta versão não conhece continua guardado depois de ler, editar e salvar', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 2, blocos: { especialidade: [{ id: 'g', texto: 'Semanas' }], __proto__: [] } }))
    const editado = acrescentarPergunta(lerRoteiro(arm), 'agua', 'nova')
    gravarRoteiro(arm, renomearPergunta(editado, 'agua', 'nova', 'Chá por dia'))
    const guardado = JSON.parse(arm.getItem(CHAVE_ROTEIRO) ?? '{}') as { blocos: Record<string, unknown> }
    expect(guardado.blocos['especialidade']).toEqual([{ id: 'g', texto: 'Semanas' }])
    expect(lerRoteiro(arm).perguntas.agua.at(-1)).toEqual({ id: 'nova', texto: 'Chá por dia' })
    expect(Object.getPrototypeOf(lerRoteiro(arm).outros)).toBe(Object.prototype)
  })

  it('CB-161: pergunta com texto vazio sai ao gravar; bloco esvaziado continua vazio', () => {
    const arm = new Memoria()
    let roteiro = acrescentarPergunta(ROTEIRO_PADRAO, 'agua', 'nova')
    roteiro = { ...roteiro, perguntas: { ...roteiro.perguntas, 'alcool-fumo': [] } }
    gravarRoteiro(arm, roteiro)
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua.map((p) => p.id)).not.toContain('nova')
    expect(lido.perguntas['alcool-fumo']).toEqual([])
    expect(limparRoteiro(roteiro)).toEqual(lido)
  })

  it('id repetido no roteiro fica só na primeira vez, na ordem dos blocos', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 2, blocos: { agua: [{ id: 'x', texto: 'A' }], intestino: [{ id: 'x', texto: 'B' }, { id: 'x', texto: 'C' }] } }))
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.intestino).toEqual([{ id: 'x', texto: 'B' }])
    expect(lido.perguntas.agua).toEqual([])
  })
})

describe('roteiro salvo antes da conduta da parceira (spec conduta-da-nutricionista, CA-936 e CB-296)', () => {
  const antigo = (blocos: Record<string, unknown>) => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos }))
    return arm
  }

  it('CA-936: ganha os blocos novos e a cor da urina depois de "Quanta água bebe por dia", sem perder as edições', () => {
    const arm = antigo({
      agua: [
        { id: 'agua-dia', texto: 'Litros por dia' },
        { id: 'outras-bebidas', texto: 'Outras bebidas ao longo do dia' },
        { id: 'p-1', texto: 'Chá por dia' },
      ],
      intestino: [{ id: 'evacuacao', texto: 'Vai ao banheiro todo dia?' }],
    })
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua.map((p) => p.texto)).toEqual(['Litros por dia', 'Cor da urina', 'Outras bebidas ao longo do dia', 'Chá por dia'])
    expect(lido.perguntas.intestino).toEqual([{ id: 'evacuacao', texto: 'Vai ao banheiro todo dia?' }])
    expect(lido.perguntas.intolerancias).toEqual(ROTEIRO_PADRAO.perguntas.intolerancias)
    expect(lido.perguntas.gestacao).toEqual(ROTEIRO_PADRAO.perguntas.gestacao)
    // Abrir não grava nada.
    expect(JSON.parse(arm.getItem(CHAVE_ROTEIRO) ?? '{}')).not.toHaveProperty('versao')
  })

  it('CA-936: sem "Quanta água bebe por dia", a cor da urina vai para o fim da Água; sem o bloco Água, vale o padrão', () => {
    expect(lerRoteiro(antigo({ agua: [{ id: 'p-9', texto: 'Garrafinha?' }] })).perguntas.agua.map((p) => p.id)).toEqual(['p-9', 'cor-da-urina'])
    expect(lerRoteiro(antigo({ intestino: [] })).perguntas.agua).toEqual(ROTEIRO_PADRAO.perguntas.agua)
  })

  it('CA-936: a cor da urina não se repete, nem quando já está em outro bloco', () => {
    const lido = lerRoteiro(antigo({ agua: [{ id: 'agua-dia', texto: 'Água' }], intestino: [{ id: 'cor-da-urina', texto: 'Cor da urina' }] }))
    expect(lido.perguntas.agua.map((p) => p.id)).toEqual(['agua-dia'])
    expect(lido.perguntas.intestino.map((p) => p.id)).toEqual(['cor-da-urina'])
  })

  it('CA-936: depois de salvo, tirar a cor da urina vale e ela não volta', () => {
    const arm = antigo({ agua: [{ id: 'agua-dia', texto: 'Água' }] })
    gravarRoteiro(arm, tirarPergunta(lerRoteiro(arm), 'agua', 'cor-da-urina'))
    expect(JSON.parse(arm.getItem(CHAVE_ROTEIRO) ?? '{}')).toMatchObject({ formato: 1, versao: 2 })
    expect(lerRoteiro(arm).perguntas.agua.map((p) => p.id)).toEqual(['agua-dia'])
    expect(limparRoteiro(lerRoteiro(arm)).perguntas.agua.map((p) => p.id)).toEqual(['agua-dia'])
  })

  it('CB-296: um roteiro gravado por versão antiga (sem versão) recebe a cor da urina de novo; os blocos novos ficam', () => {
    const arm = antigo({ agua: [{ id: 'agua-dia', texto: 'Água' }], gestacao: [{ id: 'gestacao-trimestre', texto: 'Trimestre da gestação' }] })
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua.map((p) => p.id)).toEqual(['agua-dia', 'cor-da-urina'])
    expect(lido.perguntas.gestacao).toEqual([{ id: 'gestacao-trimestre', texto: 'Trimestre da gestação' }])
  })
})

describe('respostas de escolha (spec conduta-da-nutricionista, CA-937)', () => {
  it('a cor da urina e o trimestre ficam na ficha como as outras respostas, com o texto da pergunta', () => {
    const urina = ROTEIRO_PADRAO.perguntas.agua[1] ?? { id: '', texto: '' }
    const trimestre = ROTEIRO_PADRAO.perguntas.gestacao[0] ?? { id: '', texto: '' }
    let r = responder([], urina, 'agua', respostaDaUrina(3))
    r = responder(r, trimestre, 'gestacao', '2º trimestre')
    expect(r).toEqual([
      { perguntaId: 'cor-da-urina', blocoId: 'agua', pergunta: 'Cor da urina', resposta: '3 · Amarelo-claro' },
      { perguntaId: 'gestacao-trimestre', blocoId: 'gestacao', pergunta: 'Trimestre', resposta: '2º trimestre' },
    ])
    // CA-568: tirada do roteiro, a resposta continua no bloco, fora do roteiro.
    const semUrina = tirarPergunta(ROTEIRO_PADRAO, 'agua', 'cor-da-urina')
    const agua = blocosDaFicha(semUrina, r).find((b) => b.id === 'agua')
    expect(agua?.perguntas.at(-1)).toEqual({ id: 'cor-da-urina', texto: 'Cor da urina', resposta: '3 · Amarelo-claro', foraDoRoteiro: true })
  })
})

describe('editar o roteiro (CA-565)', () => {
  it('acrescentar, renomear e tirar mexem só no bloco pedido', () => {
    let r = acrescentarPergunta(ROTEIRO_PADRAO, 'agua', 'p-1')
    expect(r.perguntas.agua.at(-1)).toEqual({ id: 'p-1', texto: '' })
    r = renomearPergunta(r, 'agua', 'p-1', 'Chá por dia')
    expect(r.perguntas.agua.at(-1)).toEqual({ id: 'p-1', texto: 'Chá por dia' })
    r = tirarPergunta(r, 'agua', 'agua-dia')
    expect(r.perguntas.agua.map((p) => p.id)).toEqual(['cor-da-urina', 'outras-bebidas', 'p-1'])
    expect(r.perguntas.intestino).toBe(ROTEIRO_PADRAO.perguntas.intestino)
    expect(ROTEIRO_PADRAO.perguntas.agua).toHaveLength(3)
  })
})

describe('respostas da ficha (D-163)', () => {
  const queixa = ROTEIRO_PADRAO.perguntas.objetivo[0] ?? { id: '', texto: '' }

  it('CA-561: responder guarda a resposta com o texto da pergunta; resposta vazia sai', () => {
    let r = responder([], queixa, 'objetivo', 'Cansaço à tarde')
    expect(r).toEqual([{ perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Cansaço à tarde' }])
    r = responder(r, queixa, 'objetivo', 'Cansaço à tarde e sono ')
    expect(r).toHaveLength(1)
    expect(r[0]?.resposta).toBe('Cansaço à tarde e sono ')
    expect(responder(r, queixa, 'objetivo', '   ')).toEqual([])
  })

  it('CA-588: respostas estragadas viram vazio, item ruim sai, id repetido fica uma vez', () => {
    expect(normalizarRespostas(undefined)).toEqual([])
    expect(normalizarRespostas('texto')).toEqual([])
    const boa: RespostaAnamnese = { perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Dor' }
    expect(normalizarRespostas([boa, { ...boa, resposta: 'outra' }, { perguntaId: 3 }, null, { ...boa, perguntaId: 'z', blocoId: 4 }])).toEqual([boa])
  })

  it('CA-589: resposta de bloco desconhecido e campo a mais ficam guardados, mas não aparecem na ficha', () => {
    const deOutroBloco = { perguntaId: 'semanas', blocoId: 'especialidade', pergunta: 'Semanas', resposta: '20' }
    const comExtra = { perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Dor', fonte: 'questionario' }
    const lidas = normalizarRespostas([deOutroBloco, comExtra])
    expect(lidas).toEqual([deOutroBloco, comExtra])
    expect(blocosDaFicha(ROTEIRO_PADRAO, lidas).flatMap((b) => b.perguntas.map((p) => p.id))).not.toContain('semanas')
    const respondidas = responder(lidas, { id: 'agua-dia', texto: 'Quanta água bebe por dia' }, 'agua', '1 litro')
    expect(respondidas.slice(0, 2)).toEqual([deOutroBloco, comExtra])
  })

  it('CA-560: os blocos da ficha dizem quantas perguntas têm resposta', () => {
    const respostas = responder([], queixa, 'objetivo', 'Dor')
    const blocos = blocosDaFicha(ROTEIRO_PADRAO, respostas)
    expect(blocos.map((b) => b.id)).toEqual(BLOCOS_ANAMNESE.map((b) => b.id))
    const objetivo = blocos[0]
    expect(objetivo?.respondidas).toBe(1)
    expect(objetivo?.perguntas[0]).toEqual({ id: 'queixa', texto: 'Queixa principal', resposta: 'Dor', foraDoRoteiro: false })
    expect(objetivo ? resumoDoBloco(objetivo) : '').toBe('1 de 5 respondida')
    const agua = blocos[3]
    expect(agua ? resumoDoBloco(agua) : '').toBe('Sem respostas')
    const dois = blocosDaFicha(ROTEIRO_PADRAO, responder(respostas, { id: 'dietas', texto: 'Dietas que já fez' }, 'objetivo', 'Low carb'))[0]
    expect(dois ? resumoDoBloco(dois) : '').toBe('2 de 5 respondidas')
  })

  it('CA-566: a pergunta renomeada mostra o texto novo com a resposta de antes', () => {
    const respostas = responder([], queixa, 'objetivo', 'Dor')
    const roteiro = renomearPergunta(ROTEIRO_PADRAO, 'objetivo', 'queixa', 'Motivo da consulta')
    expect(blocosDaFicha(roteiro, respostas)[0]?.perguntas[0]).toEqual({ id: 'queixa', texto: 'Motivo da consulta', resposta: 'Dor', foraDoRoteiro: false })
  })

  it('CA-568: pergunta tirada com resposta continua no bloco, fora do roteiro, no fim', () => {
    const respostas = responder([], queixa, 'objetivo', 'Dor')
    const roteiro = tirarPergunta(ROTEIRO_PADRAO, 'objetivo', 'queixa')
    const objetivo = blocosDaFicha(roteiro, respostas)[0]
    expect(objetivo?.perguntas.map((p) => p.texto)).toEqual(['Histórico do peso', 'Dietas que já fez', 'Suplementos que já usa', 'Doenças na família', 'Queixa principal'])
    expect(objetivo?.perguntas.at(-1)).toEqual({ id: 'queixa', texto: 'Queixa principal', resposta: 'Dor', foraDoRoteiro: true })
    expect(objetivo ? resumoDoBloco(objetivo) : '').toBe('1 de 5 respondida')
  })

  it('CB-161: bloco sem pergunta some, a não ser que tenha resposta fora do roteiro', () => {
    const vazio = { ...ROTEIRO_PADRAO, perguntas: { ...ROTEIRO_PADRAO.perguntas, 'alcool-fumo': [] } }
    expect(blocosDaFicha(vazio, []).map((b) => b.id)).not.toContain('alcool-fumo')
    const comResposta = responder([], { id: 'fumo', texto: 'Fumo' }, 'alcool-fumo', 'Não fuma')
    const bloco = blocosDaFicha(vazio, comResposta).find((b) => b.id === 'alcool-fumo')
    expect(bloco?.perguntas).toEqual([{ id: 'fumo', texto: 'Fumo', resposta: 'Não fuma', foraDoRoteiro: true }])
  })
})
