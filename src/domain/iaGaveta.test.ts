import { IA_DEMOROU, IA_INDISPONIVEL, IA_VAZIA, MUITAS_SUGESTOES, RECUSA_DA_IA, SEM_CONSENTIMENTO } from '../../supabase/functions/_shared/iaContrato.ts'
import { casoDaGestante, HOJE, pacienteDaGestante, planoDeAdulto, restricoesDoCaso } from './ia.test-utils.ts'
import {
  erroDaIa,
  fichaNaGaveta,
  itensDoQueAjustar,
  lacunasMarcadas,
  lerMetaDaGaveta,
  lerRespostaDaFuncao,
  metaNaTela,
  motivoDoAdequar,
  perguntasQueFaltam,
  refeicoesDaGaveta,
  responderNaFicha,
  SEM_CONEXAO_IA,
  novaMetaManual,
  textoDaMeta,
  textoDoSono,
} from './iaGaveta.ts'
import { criarPacienteVazio } from './pacientes.ts'

const vazio = () => ({ ...criarPacienteVazio('p1', '2026-11-03T12:00:00Z'), sexo: 'F' as const, nascimento: '1990-01-01' })
const agora = new Date('2026-11-03T12:00:00Z')

describe('spec assistente-ia, seção 6: as perguntas de "Falta na ficha"', () => {
  it('CA-2361 e CA-2362: a ficha vazia pergunta tudo, na ordem da spec; o exercício só com atividade', () => {
    const caso = casoDaGestante({ energia: { fator: 1.2, formula: 'mifflin', getManual: null } })
    expect(perguntasQueFaltam(vazio(), caso).map((p) => p.id)).toEqual([
      'gosta',
      'nao-gosta',
      'rotina-trabalho',
      'refeicoes-onde',
      'outros-nao-come',
      'sono-horario',
      'orcamento',
    ])
    const ativa = { ...vazio(), respostasAnamnese: [{ perguntaId: 'atividade-pratica', blocoId: 'atividade', pergunta: 'Prática de exercício', resposta: 'Sim' }] }
    expect(perguntasQueFaltam(ativa, caso).map((p) => p.id)).toContain('atividade-horario')
    expect(perguntasQueFaltam(vazio(), casoDaGestante({ energia: { fator: 1.55, formula: 'mifflin', getManual: null } })).map((p) => p.id)).toContain('atividade-horario')
  })

  it('CA-2362: a resposta que já está na ficha não volta; "Outros alimentos" some com restrição marcada', () => {
    expect(perguntasQueFaltam(pacienteDaGestante(), casoDaGestante()).map((p) => p.id)).toEqual([])
    const comRestricao = { ...vazio(), restricoesMarcadas: ['leite'] }
    expect(perguntasQueFaltam(comRestricao, casoDaGestante()).map((p) => p.id)).not.toContain('outros-nao-come')
  })

  it('D-1351: a resposta grava na ficha pelo `responder`, com o texto da pergunta e o dia; "Outros alimentos" no campo', () => {
    const p1 = responderNaFicha(vazio(), 'gosta', 'cuscuz, frango', HOJE)
    expect(p1.respostasAnamnese).toEqual([{ perguntaId: 'gosta', blocoId: 'alimentacao', pergunta: 'Alimentos de que gosta', resposta: 'cuscuz, frango', respondidaEm: HOJE }])
    expect(responderNaFicha(vazio(), 'outros-nao-come', 'Nenhum', HOJE).restricoes).toBe('Nenhum')
    const p2 = responderNaFicha(vazio(), 'orcamento', 'Econômico', HOJE)
    expect(p2.respostasAnamnese[0]).toMatchObject({ perguntaId: 'orcamento', blocoId: 'alimentacao', pergunta: 'Orçamento para a alimentação', resposta: 'Econômico' })
    const p3 = responderNaFicha(vazio(), 'sono-horario', textoDoSono('06:30', '23:00'), HOJE)
    expect(p3.respostasAnamnese[0]).toMatchObject({ perguntaId: 'sono-horario', blocoId: 'rotina', resposta: 'Acorda às 06:30, dorme às 23:00' })
  })

  it('D-1351: o horário de acordar e de dormir vira um texto só', () => {
    expect(textoDoSono('06:30', '23:00')).toBe('Acorda às 06:30, dorme às 23:00')
    expect(textoDoSono('06:30', '')).toBe('Acorda às 06:30')
    expect(textoDoSono('', '23:00')).toBe('Dorme às 23:00')
    expect(textoDoSono('', '')).toBe('')
  })
})

describe('spec assistente-ia, D-1303: o resto do pedido', () => {
  it('a ficha tem: fase, medidas, saúde, restrições, não gosta, objetivo e atividade', () => {
    const caso = casoDaGestante()
    const ficha = fichaNaGaveta(caso, pacienteDaGestante(), restricoesDoCaso(caso))
    expect(ficha.map((f) => f.rotulo)).toEqual(['Fase da vida', 'Medidas', 'Saúde', 'Restrições', 'Não gosta', 'Objetivo', 'Atividade'])
    expect(ficha[0]?.valor).toBe('Gestante, 24 semanas')
    expect(ficha[1]?.valor).toBe('72,3 kg · 165 cm')
    expect(ficha[2]?.valor).toContain('Anemia')
    expect(ficha[3]?.valor).toContain('Alergia: leite e derivados')
    expect(ficha[4]?.valor).toBe('fígado, jiló')
    expect(ficha[6]?.valor).toBe('Pouco ativo')
  })

  it('as refeições do plano, ou as 6 padrão', () => {
    expect(refeicoesDaGaveta(planoDeAdulto()).map((r) => r.nome)).toEqual(['Café da manhã', 'Almoço', 'Lanche da tarde', 'Jantar'])
    expect(refeicoesDaGaveta({ refeicoes: [] })).toHaveLength(6)
  })

  it('CA-2363: a linha da meta diz quando a sugestão segue a meta digitada', () => {
    expect(textoDaMeta(2100, 2100)).toBe('Calculada pela ficha. A sugestão segue esta meta.')
    expect(textoDaMeta(1800, 2100)).toBe('Calculada pela ficha: 2.100 kcal. A sugestão segue a sua.')
    expect(textoDaMeta(1800, null)).toBe('')
  })
})

describe('spec assistente-ia, CA-2370: o que ajustar', () => {
  const lacunas = {
    energiaPct: 122,
    macros: ['Carboidrato 68% (meta até 65%)'],
    abaixo: [{ nutriente: 'Cálcio', pct: 54, candidatos: [] }],
    acima: ['Sódio'],
  }

  it('as caixas são a energia fora de 90% a 110%, cada macro, cada nutriente abaixo e cada um acima', () => {
    expect(itensDoQueAjustar(lacunas).map((i) => [i.id, i.nome, i.valor])).toEqual([
      ['energia', 'Energia', '122% da meta'],
      ['macro:Carboidrato 68% (meta até 65%)', 'Carboidrato', '68% (meta até 65%)'],
      ['abaixo:Cálcio', 'Cálcio', '54%'],
      ['acima:Sódio', 'Sódio', 'acima do limite'],
    ])
    expect(itensDoQueAjustar({ ...lacunas, energiaPct: 100 }).map((i) => i.id)).not.toContain('energia')
  })

  it('o pedido leva só o que ficou marcado (a energia desmarcada não vai)', () => {
    const marcadas = lacunasMarcadas(lacunas, new Set(['energia', 'abaixo:Cálcio']))
    expect(marcadas).toEqual({ energiaPct: null, macros: ['Carboidrato 68% (meta até 65%)'], abaixo: [], acima: ['Sódio'] })
  })
})

describe('spec assistente-ia, CA-2374: uma frase por erro', () => {
  const uso = { usados: 20, limite: 20, renovaEm: '2026-12-01' }

  it('cada código da função vira a frase e a ação da gaveta', () => {
    expect(erroDaIa({ status: 429, codigo: 'limite-mes', erro: null }, uso, agora)).toEqual({ frase: 'As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro.', acao: 'ver-planos' })
    expect(erroDaIa({ status: 422, codigo: 'recusa', erro: null }, uso, agora)).toEqual({ frase: RECUSA_DA_IA, acao: 'voltar' })
    expect(erroDaIa({ status: 504, codigo: 'demorou', erro: null }, uso, agora)).toEqual({ frase: IA_DEMOROU, acao: 'tentar' })
    expect(erroDaIa({ status: 502, codigo: 'vazia', erro: null }, uso, agora)).toEqual({ frase: IA_VAZIA, acao: 'tentar' })
    for (const status of [502, 503, 500]) expect(erroDaIa({ status, codigo: 'indisponivel', erro: null }, uso, agora)).toEqual({ frase: IA_INDISPONIVEL, acao: 'fechar' })
    for (const codigo of ['limite-hora', 'ocupado']) expect(erroDaIa({ status: 429, codigo, erro: null }, uso, agora)).toEqual({ frase: MUITAS_SUGESTOES, acao: 'fechar' })
    expect(erroDaIa({ status: 403, codigo: 'sem-consentimento', erro: SEM_CONSENTIMENTO }, uso, agora)).toEqual({ frase: SEM_CONSENTIMENTO, acao: 'voltar' })
  })

  it('CB-1315: sem internet, a frase de sem conexão do app; sem servidor ou sem a função, indisponível (CB-1321)', () => {
    expect(erroDaIa({ status: null, codigo: null, erro: null }, null, agora)).toEqual({ frase: SEM_CONEXAO_IA, acao: 'tentar' })
    expect(SEM_CONEXAO_IA).toBe('Não foi possível falar com o servidor. Confira a internet e tente de novo.')
    expect(erroDaIa({ status: 404, codigo: null, erro: null }, null, agora)).toEqual({ frase: IA_INDISPONIVEL, acao: 'fechar' })
    expect(erroDaIa({ status: 0, codigo: null, erro: 'sem servidor' }, null, agora)).toEqual({ frase: IA_INDISPONIVEL, acao: 'fechar' })
  })

  it('o limite sem o contador lido usa o limite que a função diz', () => {
    expect(erroDaIa({ status: 429, codigo: 'limite-mes', erro: null }, null, agora).acao).toBe('ver-planos')
  })
})

describe('a resposta da função, conferida de novo no navegador', () => {
  const ids = new Set([53, 488, 226])
  const resposta = { refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }, { alimentoId: 99999, gramas: 30 }], opcao2: [] }], mudancas: [], pontosAConfirmar: [] }

  it('lê o uso, o modelo e a resposta; o id que o navegador não conhece fica para a conferência 1 retirar à vista (CB-1308)', () => {
    const lida = lerRespostaDaFuncao({ resposta, uso: { usados: 8, limite: 20, renovaEm: '2026-12-01' }, foraDaBase: 1, modelo: 'claude-opus-5-5' }, { modo: 'gerar', refeicoes: 1, idsPermitidos: ids, plano: null })
    expect(lida?.uso).toEqual({ usados: 8, limite: 20, renovaEm: '2026-12-01' })
    expect(lida?.modelo).toBe('claude-opus-5-5')
    expect(lida?.resposta.refeicoes[0]?.principal).toEqual([{ alimentoId: 53, gramas: 50 }, { alimentoId: 99999, gramas: 30 }])
    expect(lida?.foraDaBase).toBe(1)
  })

  it('a forma e os limites valem: gramas fora de 1 a 1000 e refeição que não existe saem', () => {
    const fora = { refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 53, gramas: 5000 }], opcao2: [] }, { refeicao: 7, principal: [{ alimentoId: 53, gramas: 50 }], opcao2: [] }], mudancas: [], pontosAConfirmar: [] }
    const lida = lerRespostaDaFuncao({ resposta: fora, uso: { usados: 8, limite: 20, renovaEm: '2026-12-01' }, foraDaBase: 0, modelo: 'm' }, { modo: 'gerar', refeicoes: 1, idsPermitidos: ids, plano: null })
    expect(lida?.resposta.refeicoes.flatMap((r) => r.principal)).toEqual([])
  })

  it('fora da forma: nulo', () => {
    for (const ruim of [null, 'x', {}, { uso: { usados: 1, limite: 2, renovaEm: '2026-12-01' }, foraDaBase: 0, modelo: 'm' }, { resposta: { refeicoes: 3 }, uso: { usados: 1, limite: 2, renovaEm: '2026-12-01' }, foraDaBase: 0, modelo: 'm' }]) {
      expect(lerRespostaDaFuncao(ruim, { modo: 'gerar', refeicoes: 1, idsPermitidos: ids, plano: null })).toBeNull()
    }
  })

  it('CA-2405 (D-1355): sem `uso`, ou com ele fora da forma, a sugestão vale e o contador fica nulo', () => {
    for (const uso of [undefined, null, { usados: 'x' }]) {
      const lida = lerRespostaDaFuncao({ resposta, uso, foraDaBase: 0, modelo: 'claude-opus-5-5' }, { modo: 'gerar', refeicoes: 1, idsPermitidos: ids, plano: null })
      expect(lida).not.toBeNull()
      expect(lida?.uso).toBeNull()
      expect(lida?.resposta.refeicoes[0]?.principal[0]).toEqual({ alimentoId: 53, gramas: 50 })
    }
  })
})

describe('o motivo do "Sugerir ajustes" desligado (CA-2370 e CA-2412)', () => {
  const itens = [{ id: 'energia', nome: 'Energia', valor: '122% da meta' }]
  it('CA-2370: com pontos, todos desmarcados e sem texto: "Marque ao menos um ponto."', () => {
    expect(motivoDoAdequar(itens, new Set(['energia']), '')).toBe('Marque ao menos um ponto.')
    expect(motivoDoAdequar(itens, new Set(), '')).toBeNull()
    expect(motivoDoAdequar(itens, new Set(['energia']), 'jantar leve')).toBeNull()
  })
  it('CA-2412 (D-1362): sem nenhum ponto, pede o "Outro pedido", com aspas tipográficas', () => {
    expect(motivoDoAdequar([], new Set(), '  ')).toBe('Escreva em “Outro pedido” o que quer mudar.')
    expect(motivoDoAdequar([], new Set(), 'jantar leve')).toBeNull()
  })
})

describe('a meta de energia da gaveta (CA-2413, D-1363)', () => {
  it('lê com ou sem o separador de milhar, só de 500 a 6.000 kcal', () => {
    expect(['2.681', '2681', '500', '6.000', '1800,4'].map(lerMetaDaGaveta)).toEqual([2681, 2681, 500, 6000, 1800])
    expect(['', 'abc', '499', '6001', '1.800 kcal'].map(lerMetaDaGaveta)).toEqual([null, null, null, null, null])
  })
  it('mostra com o separador de milhar, como o resto da tela', () => {
    expect(metaNaTela(2681.4)).toBe('2.681')
    expect(metaNaTela(null)).toBe('')
  })
  it('a meta igual à calculada apaga a manual; a diferente vira a manual', () => {
    expect(novaMetaManual(2681, 2681.4)).toBeNull()
    expect(novaMetaManual(1800, 2681)).toBe(1800)
    expect(novaMetaManual(1800, null)).toBe(1800)
  })
  it('a meta inválida avisa na linha do campo', () => {
    expect(textoDaMeta(null, 2681)).toBe('Informe uma meta entre 500 e 6.000 kcal.')
    expect(textoDaMeta(null, null)).toBe('Informe uma meta entre 500 e 6.000 kcal.')
  })
})
