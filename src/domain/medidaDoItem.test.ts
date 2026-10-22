// Spec alimentos-e-gramaturas, G1 a G5, G8, G9 e D-374 a D-379: a medida guardada no item e o que o paciente lê.
import { buscarAlimentos } from './busca.ts'
import { criarCasoVazio } from './caso.ts'
import { copiarDieta, dietaDoPlano, dietaMudou, lerDieta } from './dietaDoLink.ts'
import { modoDaCopia, paraOPaciente } from './dietaParaPaciente.ts'
import { linhaDaFolha } from './folhaDieta.ts'
import { lerMedidaDoItem, medidaEscolhida, medidaNaLinha, medidasDoSeletor } from './medidaDoItem.ts'
import { adicionarItem, atualizarGramas, criarPlanoPadrao, escolherMedida } from './plano.ts'
import { criarRepositorio, type Armazenamento } from './persistencia.ts'
import { quantidadeNaFolha, textoDaQuantidade } from './quantidadeNaFolha.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Caso, ItemPlano, MedidaDoItem, ModoQuantidade, Plano } from './tipos.ts'
import { descreverItem } from '../export/aconselhamento-docx.ts'

const FEIJAO = 561
const IOGURTE = 448
const LEITE = 458
const ALFACE = 79
const MACARRAO = 40

const CONCHA: MedidaDoItem = { nome: 'concha', quantidade: 1.5, gramasPorMedida: 140 }

const item = (alimentoId: number, gramas: number, medida?: MedidaDoItem | null): ItemPlano => ({
  id: 'i1',
  alimentoId,
  gramas,
  ...(medida === undefined ? {} : { medida }),
})

const texto = (i: ItemPlano, modo: ModoQuantidade) => textoDaQuantidade(linhaDaFolha(i, buscarAlimento, modo).quantidade)

describe('a medida guardada no item (G1, D-374)', () => {
  it('CB-363: lê a medida com segurança; estragada vale a automática', () => {
    expect(lerMedidaDoItem(CONCHA)).toEqual(CONCHA)
    expect(lerMedidaDoItem(null)).toBeNull()
    expect(lerMedidaDoItem(undefined)).toBeUndefined()
    for (const estragada of [{ nome: '', gramasPorMedida: 10 }, { nome: 'x', gramasPorMedida: 0 }, { nome: 'x', gramasPorMedida: '10' }, 'concha', 3]) {
      expect(lerMedidaDoItem(estragada)).toBeUndefined()
    }
  })

  it('CA-1113: "1 pote de iogurte natural" guarda pote, 1 e 200 g, e o paciente lê "1 pote (200 g)"', () => {
    const r = buscarAlimentos('1 pote de iogurte natural', ALIMENTOS).resultados[0]
    expect(r?.medida).toEqual({ nome: 'pote', quantidade: 1, gramasPorMedida: 200 })
    const plano = adicionarItem(criarPlanoPadrao(() => 'r'), 'r', 'principal', { alimentoId: IOGURTE, gramas: 200, medida: r?.medida ?? null }, () => 'i1')
    const guardado = plano.refeicoes[0]?.opcoes.principal[0] as ItemPlano
    expect(guardado.medida).toEqual({ nome: 'pote', quantidade: 1, gramasPorMedida: 200 })
    expect(texto(guardado, 'medida-e-gramas')).toBe('1 pote (200 g)')
    // Antes, a medida automática trocava o pote por copo americano (A5).
    expect(texto(item(IOGURTE, 200), 'medida-caseira')).not.toBe('1 pote')
  })

  it('CA-1114: mudar a quantidade ou a medida recalcula os gramas', () => {
    let plano: Plano = adicionarItem(criarPlanoPadrao(() => 'r'), 'r', 'principal', { alimentoId: FEIJAO, gramas: 140, medida: { ...CONCHA, quantidade: 1 } }, () => 'i1')
    plano = escolherMedida(plano, 'r', 'principal', 'i1', { nome: 'concha', quantidade: 1.5, gramasPorMedida: 140 })
    expect(plano.refeicoes[0]?.opcoes.principal[0]).toMatchObject({ gramas: 210, medida: { quantidade: 1.5 } })
    plano = escolherMedida(plano, 'r', 'principal', 'i1', { nome: 'colher de sopa', quantidade: 1.5, gramasPorMedida: 17 })
    expect(plano.refeicoes[0]?.opcoes.principal[0]).toMatchObject({ gramas: 25.5, medida: { nome: 'colher de sopa' } })
    expect(medidaEscolhida({ nome: 'concha', gramas: 140 }, 2)).toEqual({ medida: { nome: 'concha', quantidade: 2, gramasPorMedida: 140 }, gramas: 280 })
  })

  it('CA-1115 e CB-364: gramas que não fecham deixam a medida aproximada, sem mudar o peso', () => {
    let plano: Plano = adicionarItem(criarPlanoPadrao(() => 'r'), 'r', 'principal', { alimentoId: FEIJAO, gramas: 210, medida: CONCHA }, () => 'i1')
    plano = atualizarGramas(plano, 'r', 'principal', 'i1', 190)
    const mexido = plano.refeicoes[0]?.opcoes.principal[0] as ItemPlano
    expect(mexido.gramas).toBe(190)
    expect(medidaNaLinha(mexido)).toMatchObject({ nome: 'concha', quantidade: 1.5, aproximada: true, origem: 'escolhida' })
    expect(texto(mexido, 'medida-e-gramas')).toBe('190 g (cerca de 1 concha e meia)')
    expect(texto(mexido, 'medida-caseira')).toBe('190 g (cerca de 1 concha e meia)')
    expect(texto(mexido, 'gramas')).toBe('190 g')
    // Uma aba antiga muda só os gramas e deixa a quantidade velha: a quantidade sai dos gramas.
    const deAbaAntiga: ItemPlano = { ...item(FEIJAO, 280), medida: CONCHA }
    expect(medidaNaLinha(deAbaAntiga)).toMatchObject({ quantidade: 2, aproximada: false })
  })

  it('CA-1116: "só gramas" guarda null, e o paciente lê só o peso', () => {
    let plano: Plano = adicionarItem(criarPlanoPadrao(() => 'r'), 'r', 'principal', { alimentoId: FEIJAO, gramas: 190, medida: CONCHA }, () => 'i1')
    plano = escolherMedida(plano, 'r', 'principal', 'i1', null)
    const soGramas = plano.refeicoes[0]?.opcoes.principal[0] as ItemPlano
    expect(soGramas).toMatchObject({ gramas: 190, medida: null })
    expect(texto(soGramas, 'medida-e-gramas')).toBe('190 g')
  })

  it('CA-1117: sem medida guardada, vale a automática, marcada como tal', () => {
    expect(medidaNaLinha(item(FEIJAO, 100))).toMatchObject({ origem: 'automatica', aproximada: false })
    expect(medidaNaLinha(item(MACARRAO, 90))).toBeNull()
  })

  it('CA-1118: o seletor traz as medidas da POF na ordem de preferência, cada uma com o peso', () => {
    const nomes = medidasDoSeletor(FEIJAO).map((m) => m.nome)
    expect(nomes.slice(0, 3)).toEqual(['colher de sopa', 'colher de servir', 'concha'])
    // A "cumbuca" de feijão era uma concha na fonte da POF: saiu pela camada de plausibilidade (D-430).
    expect(nomes).not.toContain('cumbuca')
    expect(medidasDoSeletor(MACARRAO)).toEqual([])
  })
})

describe('três modos para o paciente (G4, D-376)', () => {
  const i = item(FEIJAO, 210, CONCHA)

  it('CA-1122: "Medida e gramas", "Só medida" e "Só gramas"', () => {
    expect(texto(i, 'medida-e-gramas')).toBe('1 concha e meia (210 g)')
    expect(texto(i, 'medida-caseira')).toBe('1 concha e meia')
    expect(texto(i, 'gramas')).toBe('210 g')
  })

  it('CA-1122: o Word escreve igual, com o ponto no lugar dos parênteses de dentro', () => {
    expect(descreverItem(i, buscarAlimento, 'medida-e-gramas')).toBe('Feijão, carioca, cozido (1 concha e meia · 210 g)')
    expect(descreverItem(i, buscarAlimento, 'medida-caseira')).toBe('Feijão, carioca, cozido (1 concha e meia)')
    expect(descreverItem(i, buscarAlimento, 'gramas')).toBe('Feijão, carioca, cozido (210 g)')
  })

  it('CA-1124: leite sai em ml', () => {
    const copo = item(LEITE, 150, { nome: 'copo americano', quantidade: 1, gramasPorMedida: 150 })
    expect(texto(copo, 'medida-e-gramas')).toBe('1 copo americano (150 ml)')
    expect(texto(item(LEITE, 200, null), 'medida-e-gramas')).toBe('200 ml')
    expect(quantidadeNaFolha(LEITE, 200, 'gramas').unidade).toBe('ml')
  })

  it('CB-366: alimento sem medida sai em gramas nos três modos', () => {
    for (const modo of ['medida-e-gramas', 'medida-caseira', 'gramas'] as const) expect(texto(item(MACARRAO, 90), modo)).toBe('90 g')
  })

  it('CA-1120: plano gravado sem o campo lê "Só medida"; o novo nasce em "Medida e gramas"', () => {
    const memoria = new Map<string, string>()
    const armazenamento: Armazenamento = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => void memoria.set(k, v), removeItem: (k) => void memoria.delete(k) }
    const repo = criarRepositorio(armazenamento, { agora: () => '2026-10-21T10:00:00.000Z', gerarId: () => 'p1' })
    const novo = repo.criar('Novo')
    expect(novo.caso.quantidades).toBe('medida-e-gramas')
    const gravado = JSON.parse(memoria.get('metanutri:caso:p1') ?? '{}') as { caso: Record<string, unknown> }
    delete gravado.caso['quantidades']
    memoria.set('metanutri:caso:p1', JSON.stringify(gravado))
    expect(criarRepositorio(armazenamento).obter('p1')?.caso.quantidades).toBe('medida-caseira')
  })
})

describe('o link do paciente lê a medida guardada (D-377)', () => {
  const caso = (quantidades: ModoQuantidade): Caso => ({ ...criarCasoVazio('c1'), quantidades })
  const plano = (i: ItemPlano): Plano => {
    const base = criarPlanoPadrao(() => 'r1')
    return { refeicoes: base.refeicoes.slice(0, 1).map((r) => ({ ...r, id: 'r1', opcoes: { ...r.opcoes, principal: [i] } })) }
  }

  it('CA-1123: a cópia leva a medida escolhida, e "Meu plano" a mostra no modo do plano', () => {
    const copia = copiarDieta(dietaDoPlano(caso('medida-e-gramas'), plano(item(IOGURTE, 200, { nome: 'pote', quantidade: 1, gramasPorMedida: 200 }))), '2026-10-21')
    const lida = lerDieta(JSON.parse(JSON.stringify(copia)))
    expect(lida).toEqual(copia)
    const noLink = lida?.refeicoes[0]?.opcoes[0]?.[0]
    expect(noLink).toMatchObject({ medida: '1 pote', escolhida: true })
    expect(lida ? modoDaCopia(lida) : null).toBe('medida-e-gramas')
    expect(noLink && lida ? textoDaQuantidade(paraOPaciente(noLink, modoDaCopia(lida)).quantidade) : '').toBe('1 pote (200 g)')
  })

  it('CA-1123: a medida aproximada vai marcada; "só gramas" do item também', () => {
    const aproximada = copiarDieta(dietaDoPlano(caso('medida-caseira'), plano(item(FEIJAO, 190, CONCHA))), '2026-10-21')
    const i = aproximada.refeicoes[0]?.opcoes[0]?.[0]
    expect(i).toMatchObject({ aproximada: true, escolhida: true })
    expect(i ? textoDaQuantidade(paraOPaciente(i, 'medida-caseira').quantidade) : '').toBe('190 g (cerca de 1 concha e meia)')
    const soGramas = copiarDieta(dietaDoPlano(caso('medida-caseira'), plano(item(FEIJAO, 190, null))), '2026-10-21').refeicoes[0]?.opcoes[0]?.[0]
    expect(soGramas).toMatchObject({ medida: null, escolhida: true })
    expect(soGramas ? textoDaQuantidade(paraOPaciente(soGramas, 'medida-caseira').quantidade) : '').toBe('190 g')
  })

  it('CB-367: link de antes desta versão abre como antes, e o plano antigo em "Só medida" não aparece como mudado', () => {
    const antigo = { refeicoes: [{ horario: '06:00', nome: 'Desjejum', opcoes: [[{ medida: '6 colheres de sopa', gramas: 150, alimento: 'Arroz, tipo 1, cozido' }]] }], orientacoes: '', receitas: '', copiadaEm: '2026-10-10' }
    const lido = lerDieta(antigo)
    expect(lido).not.toBeNull()
    expect(lido ? modoDaCopia(lido) : null).toBe('medida-caseira')
    const doPlano = dietaDoPlano(caso('medida-caseira'), plano(item(3, 150)))
    expect(lido ? dietaMudou({ ...lido, refeicoes: [{ ...lido.refeicoes[0], horario: doPlano.refeicoes[0]?.horario ?? '', nome: doPlano.refeicoes[0]?.nome ?? '', opcoes: doPlano.refeicoes[0]?.opcoes ?? [] }] }, doPlano) : true).toBe(false)
  })

  it('a alface da POF lê a medida escolhida, não "2 colheres de sobremesa e meia" (A5)', () => {
    const folha = item(ALFACE, 10, { nome: 'folha', quantidade: 1, gramasPorMedida: 10 })
    expect(texto(folha, 'medida-caseira')).toBe('1 folha')
  })
})
