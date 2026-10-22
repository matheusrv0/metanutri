import {
  acrescentarPergunta,
  BLOCOS_ANAMNESE,
  blocosDaFicha,
  CHAVE_ROTEIRO,
  dicaDaPergunta,
  ESCALA_DA_URINA,
  gravarRoteiro,
  lerRoteiro,
  limparRoteiro,
  normalizarRespostas,
  numeroDaUrina,
  opcoesDaPergunta,
  regraDoBloco,
  renomearPergunta,
  respostaDaUrina,
  responder,
  resumoDoBloco,
  ROTEIRO_PADRAO,
  tipoDaPergunta,
  tirarPergunta,
  type RespostaAnamnese,
} from './anamnese.ts'
import type { Armazenamento } from './persistencia.ts'
import type { PerfilDaFicha } from './regrasDaFicha.ts'

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
const perfil = (p: Partial<PerfilDaFicha> = {}): PerfilDaFicha => ({ sexo: 'F', idadeAnos: 30, momento: null, temPlano: false, ...p })
const ids = (roteiro = ROTEIRO_PADRAO, respostas: readonly RespostaAnamnese[] = [], quem: PerfilDaFicha | null = null) =>
  blocosDaFicha(roteiro, respostas, quem).map((b) => b.id)

describe('roteiro padrão (spec ficha-unica, D-347 e seção 2)', () => {
  it('CA-1047: os blocos na ordem do PCN, com o Retorno antes de todos', () => {
    expect(BLOCOS_ANAMNESE.map((b) => b.titulo)).toEqual([
      'Retorno',
      'Motivo da consulta',
      'Saúde',
      'Gestação',
      'Lactação',
      'Saúde da mulher',
      'Digestão',
      'Rotina e sono',
      'Atividade física',
      'Hidratação',
      'Álcool e tabagismo',
      'Alimentação',
      'Infância',
      'Pessoa idosa',
      'Recordatório de 24 horas',
    ])
  })

  it('seção 2: as perguntas de cada bloco, em tema curto', () => {
    expect(textos(ROTEIRO_PADRAO.perguntas.motivo)).toEqual(['Queixa principal', 'Histórico do peso', 'Dietas que já fez'])
    expect(textos(ROTEIRO_PADRAO.perguntas.saude)).toEqual(['Suplementos em uso', 'Cirurgias e internações', 'Doenças na família'])
    expect(textos(ROTEIRO_PADRAO.perguntas.gestacao)).toEqual(['Náusea ou vômito', 'Desejos', 'Diabetes gestacional ou pressão alta'])
    expect(textos(ROTEIRO_PADRAO.perguntas.digestao)).toEqual(['Frequência de evacuação', 'Consistência das fezes', 'Gases, estufamento ou azia', 'Apetite', 'Mastigação e deglutição'])
    expect(textos(ROTEIRO_PADRAO.perguntas.atividade)).toEqual(['Prática de exercício', 'Tipo de atividade', 'Vezes por semana', 'Minutos por vez', 'Horário do exercício'])
    expect(textos(ROTEIRO_PADRAO.perguntas.agua)).toEqual(['Água por dia', 'Cor da urina', 'Outras bebidas'])
    expect(textos(ROTEIRO_PADRAO.perguntas['alcool-fumo'])).toEqual(['Álcool', 'Tabagismo'])
    expect(textos(ROTEIRO_PADRAO.perguntas.alimentacao)).toEqual(['Alimentos de que gosta', 'Alimentos de que não gosta', 'Vontade de doce ou salgado', 'Quem prepara as refeições e onde come'])
    expect(textos(ROTEIRO_PADRAO.perguntas.idoso)).toEqual(['Perda de peso sem querer', 'Quedas', 'Com quem mora'])
    expect(textos(ROTEIRO_PADRAO.perguntas.recordatorio)).toEqual(['Ao acordar', 'Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'])
  })

  it('CA-1054: nada se pergunta duas vezes; ids únicos; os campos da ficha não estão no roteiro', () => {
    const todas = BLOCOS_ANAMNESE.flatMap((b) => ROTEIRO_PADRAO.perguntas[b.id])
    expect(new Set(todas.map((p) => p.id)).size).toBe(todas.length)
    const rotulos = todas.map((p) => p.texto.toLowerCase())
    for (const repetido of ['objetivo', 'alergia', 'intolerância', 'medicamento', 'ocupação', 'trimestre', 'óleo, sal']) {
      expect(rotulos.filter((r) => r.includes(repetido)), repetido).toEqual([])
    }
    expect(rotulos.filter((r) => r.includes('azia'))).toHaveLength(1)
    expect(rotulos.filter((r) => r.includes('suplement'))).toEqual(['suplementos em uso'])
  })

  it('CA-1063: as perguntas de escolha e de número, pelo id', () => {
    expect(tipoDaPergunta('cor-da-urina')).toBe('cor-da-urina')
    expect(tipoDaPergunta('fezes')).toBe('escolha')
    expect(opcoesDaPergunta('fezes')).toHaveLength(7)
    expect(opcoesDaPergunta('fezes')[3]).toBe('4 · Salsicha lisa e macia')
    expect(opcoesDaPergunta('retorno-seguir')).toEqual(['Fácil', 'Médio', 'Difícil'])
    expect(opcoesDaPergunta('menstruacao')).toEqual(['Regular', 'Irregular', 'Não menstrua', 'Menopausa'])
    expect(opcoesDaPergunta('fluxo-intenso')).toEqual(['Sim', 'Não'])
    expect(opcoesDaPergunta('atividade-pratica')).toEqual(['Sim', 'Não'])
    expect(tipoDaPergunta('atividade-vezes')).toBe('numero')
    expect(tipoDaPergunta('atividade-minutos')).toBe('numero')
    expect(tipoDaPergunta('agua-dia')).toBe('texto')
    expect(tipoDaPergunta('p-123')).toBe('texto')
  })

  it('CA-934: a escala de Armstrong tem 8 cores, com número e nome, e a resposta fica legível', () => {
    expect(ESCALA_DA_URINA.map((c) => `${c.numero} · ${c.nome}`)).toEqual([
      '1 · Quase incolor',
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
    expect(numeroDaUrina('clara')).toBeNull()
    expect(numeroDaUrina('9 · Roxo')).toBeNull()
  })

  it('as dicas; a de suplementos diz onde fica a prescrição e muda na gestação; a de mastigação, a partir de 60 anos', () => {
    expect(dicaDaPergunta('fezes')).toBe('Escala de Bristol: de 1 (bolinhas duras) a 7 (líquida); 3 e 4 são o esperado.')
    expect(dicaDaPergunta('suplementos-uso')).toBe('O que o paciente já toma. A suplementação que você prescreve fica em Conduta.')
    expect(dicaDaPergunta('suplementos-uso', perfil({ momento: 'gestante' }))).toBe(
      'O que o paciente já toma. A suplementação que você prescreve fica em Conduta. Na gestação, anote ferro e ácido fólico.',
    )
    expect(dicaDaPergunta('mastigacao', perfil({ idadeAnos: 68 }))).toBe('Prótese, dificuldade para mastigar ou engasgos.')
    expect(dicaDaPergunta('mastigacao', perfil({ idadeAnos: 35 }))).toBeUndefined()
    expect(dicaDaPergunta('queixa')).toBeUndefined()
    expect(dicaDaPergunta('constructor')).toBeUndefined()
  })
})

describe('Quem vê cada bloco (spec ficha-unica, R2 a R13)', () => {
  it('CA-1048: homem de 35 anos', () => {
    expect(ids(ROTEIRO_PADRAO, [], perfil({ sexo: 'M', idadeAnos: 35 }))).toEqual([
      'motivo',
      'saude',
      'digestao',
      'rotina',
      'atividade',
      'agua',
      'alcool-fumo',
      'alimentacao',
      'recordatorio',
    ])
  })

  it('CA-1049: mulher de 28 anos gestante', () => {
    const blocos = ids(ROTEIRO_PADRAO, [], perfil({ idadeAnos: 28, momento: 'gestante' }))
    expect(blocos).toContain('gestacao')
    for (const fora of ['lactacao', 'saude-mulher', 'infancia', 'idoso']) expect(blocos).not.toContain(fora)
  })

  it('CA-1050: menina de 6 anos, com o tempo de tela', () => {
    const quem = perfil({ idadeAnos: 6 })
    const blocos = ids(ROTEIRO_PADRAO, [], quem)
    expect(blocos).toContain('infancia')
    for (const fora of ['alcool-fumo', 'gestacao', 'lactacao', 'saude-mulher', 'idoso']) expect(blocos).not.toContain(fora)
    const rotina = blocosDaFicha(ROTEIRO_PADRAO, [], quem).find((b) => b.id === 'rotina')
    expect(rotina?.perguntas.map((q) => q.texto)).toContain('Tempo de tela por dia')
    const adulto = blocosDaFicha(ROTEIRO_PADRAO, [], perfil({ idadeAnos: 30 })).find((b) => b.id === 'rotina')
    expect(adulto?.perguntas.map((q) => q.texto)).not.toContain('Tempo de tela por dia')
  })

  it('CA-1051: mulher de 68 anos', () => {
    const blocos = ids(ROTEIRO_PADRAO, [], perfil({ idadeAnos: 68 }))
    expect(blocos).toContain('saude-mulher')
    expect(blocos).toContain('idoso')
    for (const fora of ['gestacao', 'lactacao', 'infancia']) expect(blocos).not.toContain(fora)
  })

  it('lactante tem Lactação e Saúde da mulher', () => {
    const blocos = ids(ROTEIRO_PADRAO, [], perfil({ idadeAnos: 30, momento: 'lactante' }))
    expect(blocos).toContain('lactacao')
    expect(blocos).toContain('saude-mulher')
    expect(blocos).not.toContain('gestacao')
  })

  it('CA-1052: sem sexo ou sem data de nascimento, só os blocos de todos', () => {
    for (const quem of [perfil({ sexo: null }), perfil({ idadeAnos: null })]) {
      expect(ids(ROTEIRO_PADRAO, [], quem)).toEqual(['motivo', 'saude', 'digestao', 'rotina', 'atividade', 'agua', 'alimentacao', 'recordatorio'])
    }
  })

  it('CA-1064: o Retorno só aparece para quem já tem plano', () => {
    expect(ids(ROTEIRO_PADRAO, [], perfil({ temPlano: true }))[0]).toBe('retorno')
    expect(ids(ROTEIRO_PADRAO, [], perfil())).not.toContain('retorno')
  })

  it('CA-1053: bloco fora da regra com resposta fica, com o aviso; "Não gestante" antigo não segura o bloco', () => {
    const homem = perfil({ sexo: 'M', idadeAnos: 35 })
    const respondeu = responder([], { id: 'gestacao-enjoo', texto: 'Náusea ou vômito' }, 'gestacao', 'Sim, de manhã')
    const gestacao = blocosDaFicha(ROTEIRO_PADRAO, respondeu, homem).find((b) => b.id === 'gestacao')
    expect(gestacao?.aviso).toBe('Este bloco vale só para gestante. As respostas continuam guardadas.')
    const antiga: RespostaAnamnese = { perguntaId: 'gestacao-trimestre', blocoId: 'gestacao', pergunta: 'Trimestre', resposta: 'Não gestante' }
    expect(ids(ROTEIRO_PADRAO, [antiga], homem)).not.toContain('gestacao')
    const semPerfil = blocosDaFicha(ROTEIRO_PADRAO, respondeu, perfil({ sexo: null })).find((b) => b.id === 'gestacao')
    expect(semPerfil?.aviso).toBe('Preencha sexo e data de nascimento. As respostas continuam guardadas.')
  })

  it('D-356: com "Não" em Prática de exercício, só ela aparece; resposta antiga nas outras fica', () => {
    const nao = responder([], { id: 'atividade-pratica', texto: 'Prática de exercício' }, 'atividade', 'Não')
    const atividade = (respostas: readonly RespostaAnamnese[]) => blocosDaFicha(ROTEIRO_PADRAO, respostas, perfil())?.find((b) => b.id === 'atividade')
    expect(atividade(nao)?.perguntas.map((q) => q.id)).toEqual(['atividade-pratica'])
    const comTipo = responder(nao, { id: 'atividade-tipo', texto: 'Tipo de atividade' }, 'atividade', 'Caminhada')
    expect(atividade(comTipo)?.perguntas.map((q) => q.id)).toEqual(['atividade-pratica', 'atividade-tipo'])
    expect(atividade([])?.perguntas).toHaveLength(5)
  })

  it('CA-1060: a etiqueta da regra de cada bloco condicional', () => {
    expect(regraDoBloco('gestacao')).toBe('gestante')
    expect(regraDoBloco('idoso')).toBe('idoso')
    expect(regraDoBloco('motivo')).toBeUndefined()
  })
})

describe('ler e gravar o roteiro da conta (D-161, CB-160, CB-161, CB-162)', () => {
  it('sem nada guardado, ou sem armazenamento, vale o padrão', () => {
    expect(lerRoteiro(new Memoria())).toEqual(ROTEIRO_PADRAO)
    expect(lerRoteiro(null)).toEqual(ROTEIRO_PADRAO)
    expect(gravarRoteiro(null, ROTEIRO_PADRAO)).toBe(false)
  })

  it('grava na versão 3 e lê de volta', () => {
    const arm = new Memoria()
    const meu = renomearPergunta(ROTEIRO_PADRAO, 'agua', 'agua-dia', 'Litros de água por dia')
    expect(gravarRoteiro(arm, meu)).toBe(true)
    expect(JSON.parse(arm.getItem(CHAVE_ROTEIRO) ?? '{}')).toMatchObject({ formato: 1, versao: 3 })
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
      JSON.stringify({ formato: 1, versao: 3, blocos: { agua: [{ id: 'a1', texto: 'Água?' }, { id: 7, texto: 'x' }, { texto: 'sem id' }, 'lixo'], especialidade: [{ id: 'g', texto: 'Semanas' }] } }),
    )
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.agua).toEqual([{ id: 'a1', texto: 'Água?' }])
    expect(lido.perguntas.digestao).toEqual(ROTEIRO_PADRAO.perguntas.digestao)
    expect(Object.keys(lido.perguntas)).toEqual(BLOCOS_ANAMNESE.map((b) => b.id))
    expect(ids(lido)).not.toContain('especialidade')
  })

  it('CA-589: o bloco que esta versão não conhece continua guardado depois de ler, editar e salvar', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 3, blocos: { especialidade: [{ id: 'g', texto: 'Semanas' }], __proto__: [] } }))
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
})

describe('roteiro salvo na versão 1 ou 2 vira a 3 (spec ficha-unica, D-350, CA-1061)', () => {
  const guardado = (blocos: Record<string, unknown>, versao?: number) => {
    const arm = new Memoria()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify(versao === undefined ? { formato: 1, blocos } : { formato: 1, versao, blocos }))
    return arm
  }
  const v2 = (mudancas: Record<string, unknown>) => ({
    objetivo: [
      { id: 'queixa', texto: 'Queixa principal' },
      { id: 'historico-peso', texto: 'Histórico do peso' },
      { id: 'dietas', texto: 'Dietas que já fez' },
      { id: 'suplementos-uso', texto: 'Suplementos que já usa' },
      { id: 'doencas-familia', texto: 'Doenças na família' },
    ],
    'alcool-fumo': [
      { id: 'alcool', texto: 'Bebida alcoólica: o quê e quanto' },
      { id: 'fumo', texto: 'Fumo' },
    ],
    preferencias: [
      { id: 'gosta', texto: 'Alimentos de que gosta' },
      { id: 'nao-gosta', texto: 'Alimentos de que não gosta' },
      { id: 'vontades', texto: 'Vontade de doce ou salgado' },
      { id: 'apetite', texto: 'Apetite e mastigação' },
    ],
    intolerancias: [
      { id: 'intolerancias-alimentares', texto: 'Intolerâncias alimentares' },
      { id: 'alergias-alimentares', texto: 'Alergias alimentares' },
    ],
    ...mudancas,
  })

  it('CA-1061: a pergunta própria vai para o bloco novo, a renomeada fica com o texto, a tirada continua fora', () => {
    const lido = lerRoteiro(
      guardado(
        v2({
          objetivo: [
            { id: 'queixa', texto: 'Queixa principal' },
            { id: 'historico-peso', texto: 'Histórico do peso' },
            { id: 'suplementos-uso', texto: 'Suplementos que já usa' },
            { id: 'doencas-familia', texto: 'Doenças na família' },
          ],
          'alcool-fumo': [
            { id: 'alcool', texto: 'Bebida alcoólica: o quê e quanto' },
            { id: 'fumo', texto: 'Cigarro' },
          ],
          preferencias: [
            { id: 'gosta', texto: 'Alimentos de que gosta' },
            { id: 'nao-gosta', texto: 'Alimentos de que não gosta' },
            { id: 'vontades', texto: 'Vontade de doce ou salgado' },
            { id: 'apetite', texto: 'Apetite e mastigação' },
            { id: 'p-1', texto: 'Come assistindo TV' },
          ],
        }),
        2,
      ),
    )
    expect(textos(lido.perguntas.motivo)).toEqual(['Queixa principal', 'Histórico do peso'])
    expect(textos(lido.perguntas['alcool-fumo'])).toEqual(['Álcool', 'Cigarro'])
    expect(lido.perguntas.alimentacao.at(-1)).toEqual({ id: 'p-1', texto: 'Come assistindo TV' })
    // As perguntas novas entram; as substituídas por campo da ficha saem.
    expect(textos(lido.perguntas.saude)).toEqual(['Suplementos em uso', 'Cirurgias e internações', 'Doenças na família'])
    expect(lido.perguntas.digestao.map((q) => q.id)).toContain('mastigacao')
    const todos = BLOCOS_ANAMNESE.flatMap((b) => lido.perguntas[b.id].map((q) => q.id))
    for (const saiu of ['intolerancias-alimentares', 'alergias-alimentares', 'gestacao-trimestre', 'oleo-sal-acucar', 'atividade-frequencia']) expect(todos).not.toContain(saiu)
  })

  it('a pergunta própria de cada bloco antigo vai para o bloco novo dele', () => {
    const lido = lerRoteiro(
      guardado({
        intestino: [{ id: 'p-int', texto: 'Usa laxante' }],
        agua: [
          { id: 'agua-dia', texto: 'Quanta água bebe por dia' },
          { id: 'p-agua', texto: 'Garrafinha' },
        ],
        gestacao: [
          { id: 'gestacao-trimestre', texto: 'Trimestre' },
          { id: 'gestacao-anotacoes', texto: 'Anotações da gestação' },
          { id: 'p-gest', texto: 'Pré-natal em dia' },
        ],
      }, 2),
    )
    expect(lido.perguntas.digestao.at(-1)).toEqual({ id: 'p-int', texto: 'Usa laxante' })
    expect(lido.perguntas.agua.at(-1)).toEqual({ id: 'p-agua', texto: 'Garrafinha' })
    expect(lido.perguntas.gestacao.map((q) => q.id)).toEqual(['gestacao-enjoo', 'gestacao-desejos', 'gestacao-intercorrencias', 'p-gest'])
  })

  it('"Anotações da gestação" renomeada fica como pergunta da conta', () => {
    const lido = lerRoteiro(guardado({ gestacao: [{ id: 'gestacao-anotacoes', texto: 'Pré-natal' }] }, 2))
    expect(lido.perguntas.gestacao.at(-1)).toEqual({ id: 'gestacao-anotacoes', texto: 'Pré-natal' })
  })

  it('roteiro da versão 1, sem a cor da urina, a recebe; tirada na versão 2, continua fora', () => {
    expect(lerRoteiro(guardado({ agua: [{ id: 'agua-dia', texto: 'Água' }] })).perguntas.agua.map((q) => q.id)).toEqual(['agua-dia', 'cor-da-urina'])
    expect(lerRoteiro(guardado({ agua: [{ id: 'agua-dia', texto: 'Água' }] }, 2)).perguntas.agua.map((q) => q.id)).toEqual(['agua-dia'])
  })

  it('CB-348: roteiro da versão 3 salvo por uma versão antiga (sem versão, com os blocos novos) é lido como versão 3', () => {
    const arm = guardado({ motivo: [{ id: 'queixa', texto: 'Queixa' }], objetivo: [{ id: 'queixa', texto: 'Queixa principal' }] })
    const lido = lerRoteiro(arm)
    expect(lido.perguntas.motivo).toEqual([{ id: 'queixa', texto: 'Queixa' }])
    expect(lido.outros).toHaveProperty('objetivo')
  })

  it('abrir não grava nada', () => {
    const arm = guardado(v2({}), 2)
    const antes = arm.getItem(CHAVE_ROTEIRO)
    lerRoteiro(arm)
    expect(arm.getItem(CHAVE_ROTEIRO)).toBe(antes)
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
    expect(r.perguntas.digestao).toBe(ROTEIRO_PADRAO.perguntas.digestao)
  })
})

describe('respostas da ficha (D-163)', () => {
  const queixa = ROTEIRO_PADRAO.perguntas.motivo[0] ?? { id: '', texto: '' }

  it('CA-561 e CA-1065: responder guarda a resposta com o texto da pergunta e o dia; resposta vazia sai', () => {
    let r = responder([], queixa, 'motivo', 'Cansaço à tarde', '2026-10-21')
    expect(r).toEqual([{ perguntaId: 'queixa', blocoId: 'motivo', pergunta: 'Queixa principal', resposta: 'Cansaço à tarde', respondidaEm: '2026-10-21' }])
    r = responder(r, queixa, 'motivo', 'Cansaço à tarde e sono ', '2026-10-22')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ resposta: 'Cansaço à tarde e sono ', respondidaEm: '2026-10-22' })
    expect(responder(r, queixa, 'motivo', '   ')).toEqual([])
  })

  it('CA-588: respostas estragadas viram vazio, item ruim sai, id repetido fica uma vez', () => {
    expect(normalizarRespostas(undefined)).toEqual([])
    const boa: RespostaAnamnese = { perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Dor' }
    expect(normalizarRespostas([boa, { ...boa, resposta: 'outra' }, { perguntaId: 3 }, null, { ...boa, perguntaId: 'z', blocoId: 4 }])).toEqual([boa])
  })

  it('CA-589: resposta de bloco desconhecido e campo a mais ficam guardados, mas não aparecem na ficha', () => {
    const deOutroBloco = { perguntaId: 'semanas', blocoId: 'especialidade', pergunta: 'Semanas', resposta: '20' }
    const comExtra = { perguntaId: 'queixa', blocoId: 'motivo', pergunta: 'Queixa principal', resposta: 'Dor', fonte: 'questionario' }
    const lidas = normalizarRespostas([deOutroBloco, comExtra])
    expect(lidas).toEqual([deOutroBloco, comExtra])
    expect(blocosDaFicha(ROTEIRO_PADRAO, lidas, null).flatMap((b) => b.perguntas.map((p) => p.id))).not.toContain('semanas')
  })

  it('CA-1065: o resumo diz quantas têm resposta e o dia da última', () => {
    const respostas = responder(responder([], queixa, 'motivo', 'Dor', '2026-09-10'), { id: 'dietas', texto: 'Dietas que já fez' }, 'motivo', 'Low carb', '2026-10-21')
    const motivo = blocosDaFicha(ROTEIRO_PADRAO, respostas, null).find((b) => b.id === 'motivo')
    expect(motivo ? resumoDoBloco(motivo) : '').toBe('2 de 3 respondidas · 21/10/2026')
    expect(motivo ? resumoDoBloco(motivo, { total: 1, preenchidos: 1 }) : '').toBe('3 de 4 respondidas · 21/10/2026')
    const semData = blocosDaFicha(ROTEIRO_PADRAO, responder([], queixa, 'motivo', 'Dor'), null).find((b) => b.id === 'motivo')
    expect(semData ? resumoDoBloco(semData) : '').toBe('1 de 3 respondida')
    const agua = blocosDaFicha(ROTEIRO_PADRAO, [], null).find((b) => b.id === 'agua')
    expect(agua ? resumoDoBloco(agua) : '').toBe('Sem respostas')
  })

  it('CA-566: a pergunta renomeada mostra o texto novo com a resposta de antes', () => {
    const respostas = responder([], queixa, 'motivo', 'Dor')
    const roteiro = renomearPergunta(ROTEIRO_PADRAO, 'motivo', 'queixa', 'Por que veio')
    expect(blocosDaFicha(roteiro, respostas, null).find((b) => b.id === 'motivo')?.perguntas[0]).toEqual({ id: 'queixa', texto: 'Por que veio', resposta: 'Dor', foraDoRoteiro: false })
  })

  it('CA-568: pergunta tirada com resposta continua no bloco, fora do roteiro, no fim', () => {
    const respostas = responder([], queixa, 'motivo', 'Dor')
    const motivo = blocosDaFicha(tirarPergunta(ROTEIRO_PADRAO, 'motivo', 'queixa'), respostas, null).find((b) => b.id === 'motivo')
    expect(motivo?.perguntas.at(-1)).toEqual({ id: 'queixa', texto: 'Queixa principal', resposta: 'Dor', foraDoRoteiro: true })
  })

  it('CA-1061: a resposta antiga de pergunta que saiu aparece no bloco novo, fora do roteiro', () => {
    const antigas: RespostaAnamnese[] = [
      { perguntaId: 'alergias-alimentares', blocoId: 'intolerancias', pergunta: 'Alergias alimentares', resposta: 'Camarão' },
      { perguntaId: 'oleo-sal-acucar', blocoId: 'rotina', pergunta: 'Óleo, sal e açúcar por mês em casa', resposta: '2 latas de óleo' },
      { perguntaId: 'atividade-frequencia', blocoId: 'atividade', pergunta: 'Frequência e duração', resposta: '3 vezes, 1 hora' },
      { perguntaId: 'suplementos-uso', blocoId: 'objetivo', pergunta: 'Suplementos que já usa', resposta: 'Whey' },
    ]
    const blocos = blocosDaFicha(ROTEIRO_PADRAO, antigas, null)
    const do_ = (id: string) => blocos.find((b) => b.id === id)?.perguntas.filter((q) => q.resposta !== '').map((q) => `${q.texto}: ${q.resposta}${q.foraDoRoteiro ? ' (fora)' : ''}`)
    expect(do_('alimentacao')).toEqual(['Alergias alimentares: Camarão (fora)', 'Óleo, sal e açúcar por mês em casa: 2 latas de óleo (fora)'])
    expect(do_('atividade')).toEqual(['Frequência e duração: 3 vezes, 1 hora (fora)'])
    expect(do_('saude')).toEqual(['Suplementos em uso: Whey'])
  })

  it('CB-161: bloco sem pergunta some, a não ser que tenha resposta fora do roteiro', () => {
    const vazio = { ...ROTEIRO_PADRAO, perguntas: { ...ROTEIRO_PADRAO.perguntas, 'alcool-fumo': [] } }
    expect(ids(vazio)).not.toContain('alcool-fumo')
    const comResposta = responder([], { id: 'fumo', texto: 'Tabagismo' }, 'alcool-fumo', 'Não fuma')
    expect(blocosDaFicha(vazio, comResposta, null).find((b) => b.id === 'alcool-fumo')?.perguntas).toEqual([{ id: 'fumo', texto: 'Tabagismo', resposta: 'Não fuma', foraDoRoteiro: true }])
  })
})

describe('Correção B: cada pergunta para quem vale (spec ficha-unica, seção 10)', () => {
  const perguntasDe = (bloco: string, quem: PerfilDaFicha | null, respostas: readonly RespostaAnamnese[] = []) =>
    blocosDaFicha(ROTEIRO_PADRAO, respostas, quem)
      .find((b) => b.id === bloco)
      ?.perguntas.map((q) => q.texto) ?? []

  it('CA-1271: o histórico do peso fala da vida adulta de 18 anos em diante e do crescimento abaixo (D-452)', () => {
    const adulta = 'Peso habitual, maior e menor peso na vida adulta.'
    const crescimento = 'Peso ao nascer e como o peso e a estatura vêm mudando (caderneta de saúde).'
    expect(dicaDaPergunta('historico-peso', perfil({ idadeAnos: 35 }))).toBe(adulta)
    expect(dicaDaPergunta('historico-peso', perfil({ idadeAnos: 18 }))).toBe(adulta)
    expect(dicaDaPergunta('historico-peso', perfil({ idadeAnos: 17 }))).toBe(crescimento)
    expect(dicaDaPergunta('historico-peso', perfil({ idadeAnos: 6 }))).toBe(crescimento)
    expect(dicaDaPergunta('historico-peso', perfil({ idadeAnos: null }))).toBe(adulta)
  })

  it('CA-1271: "Dietas que já fez" aparece de 12 anos em diante; respondida, continua (D-452)', () => {
    expect(perguntasDe('motivo', perfil({ idadeAnos: 6 }))).toEqual(['Queixa principal', 'Histórico do peso'])
    expect(perguntasDe('motivo', perfil({ idadeAnos: 11 }))).not.toContain('Dietas que já fez')
    expect(perguntasDe('motivo', perfil({ idadeAnos: 12 }))).toContain('Dietas que já fez')
    const dietas = responder([], { id: 'dietas', texto: 'Dietas que já fez' }, 'motivo', 'Sem glúten por conta da mãe')
    expect(perguntasDe('motivo', perfil({ idadeAnos: 6 }), dietas)).toContain('Dietas que já fez')
  })
})
