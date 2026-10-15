import {
  acrescentarPergunta,
  BLOCOS_ANAMNESE,
  blocosDaFicha,
  CHAVE_ROTEIRO,
  gravarRoteiro,
  lerRoteiro,
  normalizarRespostas,
  renomearPergunta,
  responder,
  resumoDoBloco,
  ROTEIRO_PADRAO,
  tirarPergunta,
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
  it('CA-560: 8 blocos fixos, nesta ordem', () => {
    expect(BLOCOS_ANAMNESE.map((b) => b.titulo)).toEqual([
      'Objetivo e queixa',
      'Rotina e sono',
      'Intestino',
      'Água',
      'Álcool e fumo',
      'Atividade física',
      'Preferências e aversões',
      'Recordatório de 24 horas',
    ])
  })

  it('CA-562: o recordatório pergunta refeição por refeição', () => {
    expect(textos(ROTEIRO_PADRAO.perguntas.recordatorio)).toEqual(['Ao acordar', 'Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'])
  })

  it('as perguntas padrão têm ids únicos e nenhuma repete o Objetivo da identificação', () => {
    const todas = BLOCOS_ANAMNESE.flatMap((b) => ROTEIRO_PADRAO.perguntas[b.id])
    expect(new Set(todas.map((p) => p.id)).size).toBe(todas.length)
    expect(textos(ROTEIRO_PADRAO.perguntas.objetivo)).toEqual(['Queixa principal', 'Histórico do peso', 'Dietas que já fez'])
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

  it('CB-162: bloco desconhecido é ignorado; bloco que falta usa o padrão; pergunta estragada sai', () => {
    const arm = new Memoria()
    arm.setItem(
      CHAVE_ROTEIRO,
      JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'a1', texto: 'Água?' }, { id: 7, texto: 'x' }, { texto: 'sem id' }, 'lixo'], gestacao: [{ id: 'g', texto: 'Semanas' }] } }),
    )
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua).toEqual([{ id: 'a1', texto: 'Água?' }])
    expect(lido.perguntas.intestino).toEqual(ROTEIRO_PADRAO.perguntas.intestino)
    expect(Object.keys(lido.perguntas)).toEqual(BLOCOS_ANAMNESE.map((b) => b.id))
  })

  it('CB-161: pergunta com texto vazio sai ao gravar; bloco esvaziado continua vazio', () => {
    const arm = new Memoria()
    let roteiro = acrescentarPergunta(ROTEIRO_PADRAO, 'agua', 'nova')
    roteiro = { perguntas: { ...roteiro.perguntas, 'alcool-fumo': [] } }
    gravarRoteiro(arm, roteiro)
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua.map((p) => p.id)).not.toContain('nova')
    expect(lido.perguntas['alcool-fumo']).toEqual([])
  })

  it('id repetido no roteiro fica só na primeira vez, na ordem dos blocos', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'x', texto: 'A' }], intestino: [{ id: 'x', texto: 'B' }, { id: 'x', texto: 'C' }] } }))
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.intestino).toEqual([{ id: 'x', texto: 'B' }])
    expect(lido.perguntas.agua).toEqual([])
  })
})

describe('editar o roteiro (CA-565)', () => {
  it('acrescentar, renomear e tirar mexem só no bloco pedido', () => {
    let r = acrescentarPergunta(ROTEIRO_PADRAO, 'agua', 'p-1')
    expect(r.perguntas.agua.at(-1)).toEqual({ id: 'p-1', texto: '' })
    r = renomearPergunta(r, 'agua', 'p-1', 'Chá por dia')
    expect(r.perguntas.agua.at(-1)).toEqual({ id: 'p-1', texto: 'Chá por dia' })
    r = tirarPergunta(r, 'agua', 'agua-dia')
    expect(r.perguntas.agua.map((p) => p.id)).toEqual(['outras-bebidas', 'p-1'])
    expect(r.perguntas.intestino).toBe(ROTEIRO_PADRAO.perguntas.intestino)
    expect(ROTEIRO_PADRAO.perguntas.agua).toHaveLength(2)
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
    expect(
      normalizarRespostas([boa, { ...boa, resposta: 'outra' }, { perguntaId: 'x', blocoId: 'gestacao', pergunta: 'a', resposta: 'b' }, { perguntaId: 3 }, null, { ...boa, perguntaId: 'y', resposta: '' }]),
    ).toEqual([boa])
  })

  it('CA-560: os blocos da ficha dizem quantas perguntas têm resposta', () => {
    const respostas = responder([], queixa, 'objetivo', 'Dor')
    const blocos = blocosDaFicha(ROTEIRO_PADRAO, respostas)
    expect(blocos.map((b) => b.id)).toEqual(BLOCOS_ANAMNESE.map((b) => b.id))
    const objetivo = blocos[0]
    expect(objetivo?.respondidas).toBe(1)
    expect(objetivo?.perguntas[0]).toEqual({ id: 'queixa', texto: 'Queixa principal', resposta: 'Dor', foraDoRoteiro: false })
    expect(objetivo ? resumoDoBloco(objetivo) : '').toBe('1 de 3 respondida')
    const agua = blocos[3]
    expect(agua ? resumoDoBloco(agua) : '').toBe('Sem respostas')
    const dois = blocosDaFicha(ROTEIRO_PADRAO, responder(respostas, { id: 'dietas', texto: 'Dietas que já fez' }, 'objetivo', 'Low carb'))[0]
    expect(dois ? resumoDoBloco(dois) : '').toBe('2 de 3 respondidas')
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
    expect(objetivo?.perguntas.map((p) => p.texto)).toEqual(['Histórico do peso', 'Dietas que já fez', 'Queixa principal'])
    expect(objetivo?.perguntas.at(-1)).toEqual({ id: 'queixa', texto: 'Queixa principal', resposta: 'Dor', foraDoRoteiro: true })
    expect(objetivo ? resumoDoBloco(objetivo) : '').toBe('1 de 3 respondida')
  })

  it('CB-161: bloco sem pergunta some, a não ser que tenha resposta fora do roteiro', () => {
    const vazio = { perguntas: { ...ROTEIRO_PADRAO.perguntas, 'alcool-fumo': [] } }
    expect(blocosDaFicha(vazio, []).map((b) => b.id)).not.toContain('alcool-fumo')
    const comResposta = responder([], { id: 'fumo', texto: 'Fumo' }, 'alcool-fumo', 'Não fuma')
    const bloco = blocosDaFicha(vazio, comResposta).find((b) => b.id === 'alcool-fumo')
    expect(bloco?.perguntas).toEqual([{ id: 'fumo', texto: 'Fumo', resposta: 'Não fuma', foraDoRoteiro: true }])
  })
})
