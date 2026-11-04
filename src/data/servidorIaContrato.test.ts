// @vitest-environment node
// O contrato da função sugerir-plano (spec assistente-ia): o pedido limpo por lista branca, a resposta da IA conferida
// por código e os limites do mês de Brasília.
import {
  conferirResposta,
  inicioDoMesEmBrasilia,
  LIMITE_DE_SUGESTOES_IA,
  limparPedido,
  limparTexto,
  PRIMEIRO_ID_DE_MEU_ALIMENTO,
  renovaEm,
  REMOVIDO,
  textoCurto,
  type ContextoDaResposta,
  type PedidoDeSugestao,
} from '../../supabase/functions/_shared/iaContrato.ts'
import { montarMensagem } from '../../supabase/functions/_shared/iaPrompt.ts'
import { PRIMEIRO_ID_PROPRIO } from '../domain/busca.ts'
import { PEDIDO_BASE } from './servidorIaFalsos.test-utils.ts'


const limpo = (corpo: unknown): PedidoDeSugestao => {
  const lido = limparPedido(corpo)
  if (!lido.ok || lido.pedido.modo === 'uso') throw new Error(`pedido não passou: ${JSON.stringify(lido)}`)
  return lido.pedido
}

describe('D-1318: limites e o mês de Brasília', () => {
  it('CA-2307: Free 3, Estudante 5, Solo 20, Pro 40, Clínica 40', () => {
    expect(LIMITE_DE_SUGESTOES_IA).toEqual({ free: 3, estudante: 5, solo: 20, pro: 40, clinica: 40 })
  })

  it('CB-1314: o mês começa à meia-noite do dia 1º em Brasília e renova no 1º do mês seguinte', () => {
    // 1º/11, 00h30 em Brasília = 03h30 UTC: já é novembro.
    expect(inicioDoMesEmBrasilia(new Date('2026-11-01T03:30:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z')
    // 1º/11, 02h UTC = 31/10, 23h em Brasília: ainda é outubro.
    expect(inicioDoMesEmBrasilia(new Date('2026-11-01T02:00:00Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(renovaEm(new Date('2026-11-03T12:00:00Z'))).toBe('2026-12-01')
    expect(renovaEm(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
    expect(renovaEm(new Date('2027-01-01T02:59:00Z'))).toBe('2027-01-01')
  })
})

describe('D-1314 e CA-2311: a limpeza dos textos livres', () => {
  it.each([
    ['escreve para maria.souza+nutri@gmail.com', `escreve para ${REMOVIDO}`],
    ['site https://exemplo.com.br/x e www.blog.com', `site ${REMOVIDO} e ${REMOVIDO}`],
    ['CPF 123.456.789-09 ou 12345678909', `CPF ${REMOVIDO} ou ${REMOVIDO}`],
    ['mora no CEP 59000-000', `mora no CEP ${REMOVIDO}`],
    ['liga (84) 99876-5432 ou 84 3222-1100 ou +55 11 98765-4321', `liga ${REMOVIDO} ou ${REMOVIDO} ou ${REMOVIDO}`],
  ])('tira o contato de "%s"', (texto, esperado) => {
    expect(limparTexto(texto)).toBe(esperado)
  })

  it.each(['acorda 6h, dorme 23h', 'escritório, 8h às 17h', 'meta de 1.800 kcal', 'treina 5 vezes por semana às 18:30', 'levotiroxina 50 mcg em jejum', 'Pão 2 fatias, 50 g'])(
    'não mexe no texto comum "%s"',
    (texto) => {
      expect(limparTexto(texto)).toBe(texto)
    },
  )

  describe('CA-2384 e D-1331: os 21 jeitos de escrever contato da revisão não chegam à IA', () => {
    const mensagemCom = (extra: string): string => {
      const lido = limparPedido({ ...PEDIDO_BASE, rotina: { ...PEDIDO_BASE.rotina, extra } })
      if (!lido.ok || lido.pedido.modo === 'uso') throw new Error('pedido')
      return montarMensagem(lido.pedido)
    }
    it.each([
      ['zap +5511987654321', '5511987654321'],
      ['zap 5511987654321', '5511987654321'],
      ['wa.me/5511987654321', '5511987654321'],
      ['tel 11 9 8765 4321', '8765 4321'],
      ['tel (11) 98765-4321', '98765-4321'],
      ['tel 11987654321', '11987654321'],
      ['tel 98 76 54 32 1', '98 76 54 32 1'],
      ['fixo 3333-4444', '3333-4444'],
      ['email fulana@gmail.com', 'fulana@gmail.com'],
      ['email fulana @ gmail.com', 'gmail.com'],
      ['email fulana arroba gmail ponto com', 'fulana arroba gmail'],
      ['email fulana[at]gmail.com', 'fulana[at]gmail.com'],
      ['insta @fulana.nutri', '@fulana.nutri'],
      ['site instagram.com/fulana', 'instagram.com/fulana'],
      ['CPF 123.456.789-09', '123.456.789-09'],
      ['CPF 12345678909', '12345678909'],
      ['CPF 123 456 789 09', '123 456 789 09'],
      ['CPF 123.456.789/09', '123.456.789/09'],
      ['CEP 01310-100', '01310-100'],
      ['CEP 01.310-100', '01.310-100'],
      ['digitos largos ０１１９８７６５４３２１', '０１１９８７６５４３２１'],
    ])('"%s"', (escrito, trecho) => {
      const mensagem = mensagemCom(escrito)
      expect(mensagem).not.toContain(trecho)
      expect(mensagem).not.toContain(trecho.normalize('NFKC'))
      expect(mensagem).toContain(REMOVIDO)
    })

    it.each([
      'meta de 1.800 kcal',
      '2 colheres de sopa de aveia',
      'café às 06:30, almoço às 12:00 e jantar às 19:30',
      'escritório, 8h às 17h',
      'proteína de 1,1 a 1,5 g/kg',
      'treina 5 vezes por semana às 18:30',
      'comprou 1 arroba de carne no mês',
      'leva marmita (arroz, feijão e frango)',
    ])('o texto comum fica: "%s"', (texto) => {
      expect(limparTexto(texto)).toBe(texto)
    })
  })

  it('textoCurto: não texto vira vazio, tira controle, junta espaços e corta no limite', () => {
    expect(textoCurto(42, 10)).toBe('')
    expect(textoCurto('  um\n\tdois​  três ', 50)).toBe('um dois três')
    expect(textoCurto('abcdefghij-xyz', 10)).toBe('abcdefghij')
  })
})

describe('CA-2394 e D-1341: os formatos novos de contato da revisão (rodada 2) não chegam à IA', () => {
  const mensagemCom = (extra: string): string => {
    const lido = limparPedido({ ...PEDIDO_BASE, rotina: { ...PEDIDO_BASE.rotina, extra } })
    if (!lido.ok || lido.pedido.modo === 'uso') throw new Error('pedido')
    return montarMensagem(lido.pedido)
  }
  /** O "Algo mais" já limpo, como foi na mensagem: nele não pode haver 8 algarismos de qualquer sistema. */
  const algarismosDoAlgoMais = (mensagem: string): string =>
    ((mensagem.split(/\r?\n/).find((l) => l.startsWith('<rotina>')) ?? '').split('Algo mais: ')[1] ?? '').replace(/\P{Nd}/gu, '')

  it.each([
    ['tel 11–98765–4321 (travessão curto)', '98765'],
    ['tel 11—98765—4321 (travessão longo)', '98765'],
    ['tel 11,98765,4321', '98765'],
    ['tel 11_98765_4321', '98765'],
    ['tel 11·98765·4321', '98765'],
    ['tel onze nove oito sete seis cinco quatro três dois um', 'oito sete seis'],
    ['zap: nove oito sete seis cinco, quatro três dois um', 'oito sete seis'],
    ['tel ١١٩٨٧٦٥٤٣٢١ (algarismos arábicos)', '١١٩٨٧٦٥٤٣٢١'],
    ['tel ११९८७६५४३२१ (devanágari)', '११९८७६५४३२१'],
    ['email fulana(arroba)gmail(ponto)com', 'gmail'],
    ['email fulana at gmail dot com', 'gmail dot com'],
    ['email fulana arroba gmail', 'arroba gmail'],
    ['email fulana@gmail', 'fulana'],
    ['insta fulana.nutri', 'fulana.nutri'],
    ['insta: fulana_nutri', 'fulana_nutri'],
    ['site fulana.xyz', 'fulana.xyz'],
    ['site hxxp://fulana.example', 'fulana.example'],
    ['nasc 12 de março de 1990', 'março de 1990'],
  ])('"%s"', (escrito, trecho) => {
    const mensagem = mensagemCom(escrito)
    expect(mensagem).not.toContain(trecho)
    expect(algarismosDoAlgoMais(mensagem)).not.toMatch(/\p{Nd}{8}/u)
    expect(mensagem).toContain(REMOVIDO)
  })

  it.each([
    'meta de 1.800 kcal',
    'entre 1500 e 1800 kcal',
    'arroz 100, 150 e 200 g',
    'perfil lipídico alterado',
    'faz B12 1.000 mcg',
    'vitamina D 50.000 UI semanal',
    'vê receitas no instagram todo dia',
    'instalou o app de dieta',
    'comprou 1 arroba de carne no mês',
    'acorda às seis e dorme às onze',
    'desde março de 2024 sem glúten',
    'pesa 72,3 kg e mede 1,65 m',
  ])('o texto comum fica: "%s"', (texto) => {
    expect(limparTexto(texto)).toBe(texto)
  })
})

describe('CA-2395 e D-1343: "Meus alimentos" só com id de alimento próprio', () => {
  it('um id da Base MetaNutri mandado como alimento próprio sai; o de 900.000 em diante fica', () => {
    const proprio = { nome: 'Pão integral caseiro', grupo: 'Cereais', unidade: 'g', kcal: 250, p: 9, c: 48, g: 1.5 }
    const pedido = limpo({ ...PEDIDO_BASE, meusAlimentos: [{ id: 8, ...proprio }, { id: 899_999, ...proprio }, { id: 900_000, ...proprio }, { id: 900_012, ...proprio }] })
    expect(pedido.meusAlimentos.map((a) => a.id)).toEqual([900_000, 900_012])
    expect(PRIMEIRO_ID_DE_MEU_ALIMENTO).toBe(PRIMEIRO_ID_PROPRIO)
    expect(montarMensagem(pedido)).not.toMatch(/(?<!\d)8 \| Pão integral caseiro/)
  })
})

describe('CA-2390 e D-1337: a limpeza custa pouco em qualquer texto', () => {
  /** Folga larga para a máquina ocupada: sem a correção, cada caso levava segundos. */
  const POUCOS_MS = 50
  /** O menor de 3 tempos, depois de um aquecimento: tira o ruído da compilação das expressões e da coleta de lixo. */
  const medir = (fazer: () => unknown): number => {
    fazer()
    let menor = Number.POSITIVE_INFINITY
    for (let i = 0; i < 3; i++) {
      const inicio = performance.now()
      fazer()
      menor = Math.min(menor, performance.now() - inicio)
    }
    return menor
  }
  const SESSENTA_KB: readonly (readonly [string, string])[] = [
    ['letras', 'a'.repeat(60_000)],
    ['"a." repetido', 'a.'.repeat(30_000)],
    ['"a-." repetido', 'a-.'.repeat(20_000)],
    ['"a@" repetido', 'a@'.repeat(30_000)],
    ['"a@a." repetido', 'a@a.'.repeat(15_000)],
    ['algarismos com espaço', '1 '.repeat(30_000)],
    ['"a arroba " repetido', 'a arroba '.repeat(6_600)],
    ['"um, " repetido', 'um, '.repeat(15_000)],
    ['"uma dois um" sem fim', 'uma dois um sete '.repeat(3_500)],
    ['"insta a_" repetido', 'insta a_'.repeat(7_500)],
    ['"1–" e "1," repetidos', '1–1,'.repeat(15_000)],
    ['o caractere que a NFKC expande em 18', 'ﷺ'.repeat(20_000)],
  ]

  it.each(SESSENTA_KB)('60 KB de %s num campo: poucos milissegundos e o campo no limite', (_, texto) => {
    let lido: ReturnType<typeof limparPedido> | null = null
    const ms = medir(() => {
      lido = limparPedido({ ...PEDIDO_BASE, rotina: { ...PEDIDO_BASE.rotina, extra: texto } })
    })
    expect(ms).toBeLessThan(POUCOS_MS)
    const pedido = limpo({ ...PEDIDO_BASE, rotina: { ...PEDIDO_BASE.rotina, extra: texto } })
    expect([...pedido.rotina.extra].length).toBeLessThanOrEqual(300)
    expect(lido).not.toBeNull()
  })

  // Sem o corte prévio, o caractere que a NFKC expande vira 360 mil caracteres: esse caso só vale pelo textoCurto, acima.
  it.each(SESSENTA_KB.slice(0, -1))('limparTexto em 60 KB de %s também cresce em linha reta (e-mail e domínio ancorados)', (_, texto) => {
    expect(medir(() => limparTexto(texto))).toBeLessThan(POUCOS_MS * 4)
  })

  it('uma lista com milhares de itens para de ser lida no máximo', () => {
    const muitos = Array.from({ length: 12_000 }, (_, i) => `x${i}`)
    let pedido: PedidoDeSugestao | null = null
    const ms = medir(() => {
      pedido = limpo({ ...PEDIDO_BASE, restricoes: { avisos: muitos, textos: muitos, naoGosta: muitos, cuidados: muitos } })
    })
    expect(ms).toBeLessThan(POUCOS_MS)
    expect(pedido).not.toBeNull()
    const lido = limpo({ ...PEDIDO_BASE, restricoes: { avisos: muitos, textos: muitos, naoGosta: muitos, cuidados: muitos } })
    expect(lido.restricoes.avisos).toHaveLength(20)
    expect(lido.restricoes.naoGosta).toHaveLength(30)
    expect(lido.restricoes.naoGosta[0]).toBe('x0')
  })

  it('o corte antes de limpar não deixa meia palavra no fim', () => {
    // Limite 20, corte prévio em 40: o 40º caractere cai no meio do e-mail. Sem voltar ao espaço, "fulan" chegaria à IA,
    // porque o endereço web antes dele encolhe para "[removido]".
    expect(textoCurto(`https://x.com/${'a'.repeat(20)} fulana@gmail.com`, 20)).toBe(REMOVIDO)
    // Sem espaço nenhum, o corte é seco.
    expect(textoCurto('x'.repeat(30), 10)).toBe('x'.repeat(10))
  })
})

describe('limparPedido', () => {
  it('CA-2311: reescreve só o que é conhecido; o resto some', () => {
    const corpo = {
      ...PEDIDO_BASE,
      nome: 'Maria Souza',
      email: 'maria@x.com',
      pacienteId: 'pac-1',
      paciente: { ...PEDIDO_BASE.paciente, nome: 'Maria Souza', telefone: '84999998888', nascimento: '1992-01-01', responsavel: 'João' },
      rotina: { ...PEDIDO_BASE.rotina, trabalho: 'escritório; ligar 84 99999-8888', observacoes: 'segredo' },
    }
    const pedido = limpo(corpo)
    const texto = JSON.stringify(pedido)
    for (const proibido of ['Maria', 'maria@x.com', 'pac-1', '84999998888', '1992-01-01', 'João', 'segredo', '99999-8888']) expect(texto).not.toContain(proibido)
    expect(pedido.rotina.trabalho).toBe(`escritório; ligar ${REMOVIDO}`)
    expect(Object.keys(pedido).sort()).toEqual(['consentimento', 'lacunas', 'meusAlimentos', 'metas', 'modo', 'naoUsar', 'paciente', 'pedido', 'plano', 'refeicoes', 'restricoes', 'rotina', 'versao'].sort())
    expect(Object.keys(pedido.paciente).sort()).toEqual(
      ['atividade', 'doencas', 'estaturaCm', 'fase', 'idadeAnos', 'idadeMeses', 'medicamentos', 'objetivo', 'objetivoTexto', 'outrosDiagnosticos', 'pesoKg', 'sexo'].sort(),
    )
  })

  it('D-1314: peso arredondado a 0,5 kg; naoUsar sem repetir e em ordem; gestação só no sexo feminino', () => {
    const pedido = limpo(PEDIDO_BASE)
    expect(pedido.paciente.pesoKg).toBe(72.5)
    expect(pedido.naoUsar).toEqual([488, 512, 513])
    expect(limpo({ ...PEDIDO_BASE, paciente: { ...PEDIDO_BASE.paciente, sexo: 'M' } }).paciente.fase).toEqual({ tipo: 'nenhuma' })
  })

  it('corta textos e listas nos limites e tira números fora da faixa', () => {
    const pedido = limpo({
      ...PEDIDO_BASE,
      paciente: { ...PEDIDO_BASE.paciente, medicamentos: 'x'.repeat(500), estaturaCm: 900, pesoKg: -3 },
      rotina: { ...PEDIDO_BASE.rotina, extra: 'y'.repeat(900), orcamento: 'caro' },
      restricoes: { avisos: Array.from({ length: 50 }, (_, i) => `Aviso ${i}`), textos: [], naoGosta: [], cuidados: [] },
      meusAlimentos: Array.from({ length: 200 }, (_, i) => ({ id: 900_000 + i, nome: `Próprio ${i}`, grupo: 'x', unidade: 'g', kcal: 100, p: 1, c: 1, g: 1 })),
    })
    expect(pedido.paciente.medicamentos).toHaveLength(200)
    expect(pedido.paciente.estaturaCm).toBeNull()
    expect(pedido.paciente.pesoKg).toBeNull()
    expect(pedido.rotina.extra).toHaveLength(300)
    expect(pedido.rotina.orcamento).toBe('')
    expect(pedido.restricoes.avisos).toHaveLength(20)
    expect(pedido.meusAlimentos).toHaveLength(150)
  })

  it.each([
    ['não é objeto', 'texto'],
    ['sem versão 1', { ...PEDIDO_BASE, versao: 2 }],
    ['modo desconhecido', { ...PEDIDO_BASE, modo: 'apagar' }],
    ['sem refeição', { ...PEDIDO_BASE, refeicoes: [] }],
    ['com 9 refeições', { ...PEDIDO_BASE, refeicoes: Array.from({ length: 9 }, () => ({ nome: 'Lanche', horario: '10:00' })) }],
    ['horário fora de HH:MM', { ...PEDIDO_BASE, refeicoes: [{ nome: 'Almoço', horario: '25:00' }] }],
    ['abaixo de 2 anos', { ...PEDIDO_BASE, paciente: { ...PEDIDO_BASE.paciente, idadeAnos: 1 } }],
    ['sem sexo', { ...PEDIDO_BASE, paciente: { ...PEDIDO_BASE.paciente, sexo: null } }],
    ['meta de energia fora de 500 a 6000', { ...PEDIDO_BASE, metas: { ...PEDIDO_BASE.metas, kcal: 120 } }],
    ['ajustar sem plano', { ...PEDIDO_BASE, modo: 'ajustar', plano: [] }],
  ])('CA-2303: %s é pedido-invalido', (_, corpo) => {
    expect(limparPedido(corpo)).toEqual({ ok: false, codigo: 'pedido-invalido' })
  })

  it('CA-2304: sem consentimento true é sem-consentimento', () => {
    expect(limparPedido({ ...PEDIDO_BASE, consentimento: 'sim' })).toEqual({ ok: false, codigo: 'sem-consentimento' })
    expect(limparPedido({ ...PEDIDO_BASE, consentimento: undefined })).toEqual({ ok: false, codigo: 'sem-consentimento' })
  })

  it('CA-2306: o modo uso não precisa de mais nada', () => {
    expect(limparPedido({ versao: 1, modo: 'uso' })).toEqual({ ok: true, pedido: { modo: 'uso' } })
  })

  it('modo ajustar: o plano só com ids e gramas, nas refeições do pedido, e as lacunas limpas', () => {
    const pedido = limpo({
      ...PEDIDO_BASE,
      modo: 'ajustar',
      plano: [
        { refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150, nome: 'Arroz' },
        { refeicao: 5, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 },
        { refeicao: 0, opcao: 'substituto2', item: 0, alimentoId: 3, gramas: 150 },
      ],
      lacunas: { energiaPct: 118, macros: ['Carboidrato 68% (meta até 65%)'], abaixo: [{ nutriente: 'Cálcio', pct: 64, candidatos: [{ alimentoId: 448, gramas: 170, coberturaPct: 38 }, { alimentoId: 'x' }] }], acima: [] },
    })
    expect(pedido.plano).toEqual([{ refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 }])
    expect(pedido.lacunas?.abaixo).toEqual([{ nutriente: 'Cálcio', pct: 64, candidatos: [{ alimentoId: 448, gramas: 170, coberturaPct: 38 }] }])
  })
})

describe('conferirResposta', () => {
  const GERAR: ContextoDaResposta = { modo: 'gerar', refeicoes: 2, idsPermitidos: new Set([3, 53, 488, 561, 900012]), plano: null }
  const resposta = (o: Readonly<Record<string, unknown>>) => JSON.stringify({ refeicoes: [], mudancas: [], pontosAConfirmar: [], ...o })

  it.each([
    ['texto que não é JSON', 'Aqui está o plano: {'],
    ['JSON sem as três listas', JSON.stringify({ refeicoes: [] })],
    ['chave a mais', resposta({ extra: 1 })],
    ['item sem gramas', resposta({ refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 3 }], opcao2: [] }] })],
    ['mudança com tipo desconhecido', resposta({ mudancas: [{ tipo: 'apagar', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo: '' }] })],
  ])('CA-2314: %s não passa', (_, texto) => {
    expect(conferirResposta(texto, GERAR).ok).toBe(false)
  })

  it('CA-2317: tira id fora do permitido (e conta), gramas fora de 1 a 1000 e refeição que não existe', () => {
    const r = conferirResposta(
      resposta({
        refeicoes: [
          { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }, { alimentoId: 777777, gramas: 30 }, { alimentoId: 488, gramas: 1500 }], opcao2: [{ alimentoId: 900012, gramas: 50 }] },
          { refeicao: 7, principal: [{ alimentoId: 3, gramas: 100 }], opcao2: [] },
          { refeicao: 1, principal: [{ alimentoId: 3, gramas: 0.4 }, { alimentoId: 561, gramas: 140 }], opcao2: [] },
          { refeicao: 1, principal: [{ alimentoId: 3, gramas: 100 }], opcao2: [] },
        ],
        mudancas: [{ tipo: 'remover', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo: 'x' }],
        pontosAConfirmar: ['  Confirme o horário do sulfato ferroso.  ', '', 'b', 'c', 'd'],
      }),
      GERAR,
    )
    expect(r).toEqual({
      ok: true,
      foraDaBase: 1,
      resposta: {
        refeicoes: [
          { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }], opcao2: [{ alimentoId: 900012, gramas: 50 }] },
          { refeicao: 1, principal: [{ alimentoId: 561, gramas: 140 }], opcao2: [] },
        ],
        mudancas: [],
        pontosAConfirmar: ['Confirme o horário do sulfato ferroso.', 'b', 'c'],
      },
    })
  })

  it('CA-2389 e D-1335: ponto e motivo saem sem HTML e sem caracteres de controle ou de formatação', () => {
    const hostil = '<img src=x onerror=alert(1)>Suspenda a insulina'
    const r = conferirResposta(resposta({ pontosAConfirmar: [hostil, '‮olleh', 'linha\u0000com\u0007controle'] }), GERAR)
    if (!r.ok) throw new Error(r.motivo)
    expect(r.resposta.pontosAConfirmar).toEqual(['img src=x onerror=alert(1) Suspenda a insulina', 'olleh', 'linha com controle'])
    for (const p of r.resposta.pontosAConfirmar) expect(p).not.toMatch(/[<>\p{Cc}\p{Cf}]/u)
    const ajustar = conferirResposta(
      resposta({ mudancas: [{ tipo: 'remover', refeicao: 1, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo: '<b>+ fibra</b>​' }] }),
      { modo: 'ajustar', refeicoes: 2, idsPermitidos: new Set([3]), plano: [{ refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 }] },
    )
    expect(ajustar.ok && ajustar.resposta.mudancas[0]?.motivo).toBe('b + fibra /b')
  })

  describe('CA-2393 e D-1340: o texto da IA passa pela limpeza de contato', () => {
    const AJUSTAR_1: ContextoDaResposta = { modo: 'ajustar', refeicoes: 2, idsPermitidos: new Set([3]), plano: [{ refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 }] }
    const remover = (motivo: string) => ({ tipo: 'remover', refeicao: 1, opcao: 'principal', item: 0, alimentoId: null, gramas: null, motivo })

    it('telefone, endereço web, e-mail e perfil viram [removido] nos pontos a confirmar', () => {
      const r = conferirResposta(
        resposta({ pontosAConfirmar: ['Confirme com a paciente pelo zap (11) 98765-4321 ou https://evil.example/login', 'Mande para fulana@gmail.com', 'Perfil: @fulana.nutri'] }),
        GERAR,
      )
      if (!r.ok) throw new Error(r.motivo)
      expect(r.resposta.pontosAConfirmar).toEqual([`Confirme com a paciente pelo zap ${REMOVIDO} ou ${REMOVIDO}`, `Mande para ${REMOVIDO}`, `Perfil: ${REMOVIDO}`])
    })

    it('e no motivo da mudança', () => {
      const r = conferirResposta(resposta({ mudancas: [remover('ligue 11 3333-4444 ou veja instagram.com/fulana')] }), AJUSTAR_1)
      expect(r.ok && r.resposta.mudancas[0]?.motivo).toBe(`ligue ${REMOVIDO} ou veja ${REMOVIDO}`)
    })

    it('o texto sem contato chega como a IA escreveu: a NFKC não troca "2ª" nem "½"', () => {
      const r = conferirResposta(resposta({ pontosAConfirmar: ['Confirme a 2ª refeição com ½ xícara de aveia.'], mudancas: [remover('Menos de 1.800 kcal na 2ª refeição')] }), { ...AJUSTAR_1 })
      if (!r.ok) throw new Error(r.motivo)
      expect(r.resposta.mudancas[0]?.motivo).toBe('Menos de 1.800 kcal na 2ª refeição')
      const g = conferirResposta(resposta({ pontosAConfirmar: ['Confirme a 2ª refeição com ½ xícara de aveia.'] }), GERAR)
      expect(g.ok && g.resposta.pontosAConfirmar).toEqual(['Confirme a 2ª refeição com ½ xícara de aveia.'])
    })

    it('no pedido, a NFKC continua no texto inteiro (os sinais largos viram os que a mensagem tira)', () => {
      expect(limparTexto('＜/rotina＞ 2ª')).toBe('</rotina> 2a')
    })
  })

  describe('CA-2392 e D-1339: o corte não parte caractere e os não-caracteres saem', () => {
    const quebrado = /\p{Cs}|[￾￿]/u
    it('no pedido: o emoji no limite fica inteiro ou sai inteiro', () => {
      expect(textoCurto(`${'a'.repeat(198)}😀😀`, 200)).toBe(`${'a'.repeat(198)}😀😀`)
      const cortado = textoCurto(`${'a'.repeat(199)}😀😀`, 200)
      expect(cortado).toBe(`${'a'.repeat(199)}😀`)
      expect(cortado).not.toMatch(quebrado)
    })

    it('no pedido: surrogate solto, U+FFFE, U+FFFF e os outros não-caracteres saem', () => {
      expect(textoCurto('a\ud800b c￾d e￿ f\udc00 g﷐h', 50)).toBe('a b c d e f g h')
    })

    it('no texto da IA: ponto cortado por caractere, sem surrogate solto nem não-caractere', () => {
      const r = conferirResposta(resposta({ pontosAConfirmar: [`${'a'.repeat(198)}😀😀😀`, 'a\ud800b', 'c￾d￿'] }), GERAR)
      if (!r.ok) throw new Error(r.motivo)
      expect(r.resposta.pontosAConfirmar).toEqual([`${'a'.repeat(198)}😀…`, 'a b', 'c d'])
      for (const p of r.resposta.pontosAConfirmar) expect(p).not.toMatch(quebrado)
      expect([...(r.resposta.pontosAConfirmar[0] ?? '')]).toHaveLength(200)
    })
  })

  it('CA-2317: no máximo 10 itens por opção; ponto até 200 e motivo até 90 caracteres', () => {
    const muitos = Array.from({ length: 14 }, () => ({ alimentoId: 3, gramas: 10 }))
    const r = conferirResposta(resposta({ refeicoes: [{ refeicao: 0, principal: muitos, opcao2: [] }], pontosAConfirmar: ['p'.repeat(400)] }), GERAR)
    if (!r.ok) throw new Error(r.motivo)
    expect(r.resposta.refeicoes[0]?.principal).toHaveLength(10)
    expect(r.resposta.pontosAConfirmar[0]).toHaveLength(200)
  })

  describe('modo ajustar', () => {
    const AJUSTAR: ContextoDaResposta = {
      modo: 'ajustar',
      refeicoes: 2,
      idsPermitidos: new Set([3, 4, 448, 561]),
      plano: [
        { refeicao: 1, opcao: 'principal', item: 0, alimentoId: 3, gramas: 150 },
        { refeicao: 1, opcao: 'principal', item: 1, alimentoId: 561, gramas: 60 },
      ],
    }
    const m = (o: Readonly<Record<string, unknown>>) => ({ tipo: 'trocar', refeicao: 1, opcao: 'principal', item: 0, alimentoId: 4, gramas: null, motivo: '+ fibra', ...o })

    it('CA-2317: fica só a mudança com os campos do tipo e o item que existe; no máximo 8; refeições vazias', () => {
      const r = conferirResposta(
        resposta({
          refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 3, gramas: 100 }], opcao2: [] }],
          mudancas: [
            m({}),
            m({ tipo: 'gramas', item: 1, alimentoId: 99, gramas: 140, motivo: 'm'.repeat(200) }),
            m({ tipo: 'adicionar', item: null, alimentoId: 448, gramas: 170 }),
            m({ tipo: 'remover', item: 1, alimentoId: 3, gramas: 10 }),
            m({ item: 7 }),
            m({ alimentoId: 123456 }),
            m({ tipo: 'gramas', item: 0, gramas: 5000 }),
            m({ tipo: 'adicionar', alimentoId: null, gramas: 100 }),
          ],
        }),
        AJUSTAR,
      )
      if (!r.ok) throw new Error(r.motivo)
      expect(r.resposta.refeicoes).toEqual([])
      expect(r.resposta.mudancas.map((x) => [x.tipo, x.item, x.alimentoId, x.gramas])).toEqual([
        ['trocar', 0, 4, null],
        ['gramas', 1, null, 140],
        ['adicionar', null, 448, 170],
        ['remover', 1, null, null],
      ])
      expect(r.resposta.mudancas[1]?.motivo).toHaveLength(90)
      expect(r.foraDaBase).toBe(1)
      const nove = conferirResposta(resposta({ mudancas: Array.from({ length: 9 }, () => m({})) }), AJUSTAR)
      expect(nove.ok && nove.resposta.mudancas).toHaveLength(8)
    })
  })
})
