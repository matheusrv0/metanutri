import { aplicarCopia, CHAVE_MUDANCAS, copiaSemItens, copiasIguais, itensDaCopia, juntarCopias, lerMudancas, momentoDaCopia, montarCopia, registrarMudanca, semPendencias } from './copiaDaConta.ts'
import type { Backup } from './perfil.ts'
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

const AGORA = '2026-10-08T12:00:00.000Z'
const T = (hora: number) => `2026-10-08T${String(hora).padStart(2, '0')}:00:00.000Z`

const paciente = (id: string, nome: string, atualizadoEm = T(1)) => ({ id, nome, atualizadoEm })
const plano = (id: string, nome: string, atualizadoEm = T(1), versao = 1) => JSON.stringify({ formato: 1, versao, atualizadoEm, caso: { id, nome }, plano: { refeicoes: [] } })
const produto = (id: number, nome: string, criadoEm = T(1)) => ({ id, nome, codigoBarras: '', marca: '', porcaoG: 100, medidaCaseira: '', porPorcao: {}, criadoEm })
const modelo = (id: string, nome: string, criadoEm = T(1)) => ({ id, nome, descricao: '', criadoEm, plano: { refeicoes: [] } })
const mudancas = (alterados: Record<string, string> = {}, excluidos: Record<string, string> = {}) => JSON.stringify({ alterados, excluidos })
const copia = (dados: Record<string, string>): Backup => ({ formato: 1, geradoEm: T(0), dados })

const lista = (c: Backup, chave: string): unknown => JSON.parse(c.dados[chave] ?? 'null')
const nomes = (c: Backup, chave: string) => (lista(c, chave) as { nome: string }[]).map((p) => p.nome)

describe('marcar mudanças e exclusões (DP-2)', () => {
  it('cada paciente que entra ou muda ganha a hora; o que sai ganha a lápide', () => {
    const arm = new Memoria()
    const antes = JSON.stringify([paciente('ana', 'Ana'), paciente('bia', 'Bia'), paciente('caio', 'Caio')])
    const depois = JSON.stringify([paciente('ana', 'Ana'), paciente('bia', 'Bia Souza'), paciente('davi', 'Davi')])
    registrarMudanca(arm, 'metanutri:pacientes', antes, depois, AGORA)
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({
      alterados: { 'pacientes/bia': AGORA, 'pacientes/davi': AGORA },
      excluidos: { 'pacientes/caio': AGORA },
    })
  })

  it('plano gravado ganha a hora, plano apagado ganha a lápide, e o índice não conta como mudança', () => {
    const arm = new Memoria()
    registrarMudanca(arm, 'metanutri:caso:p1', null, plano('p1', 'Ana'), T(1))
    registrarMudanca(arm, 'metanutri:casos', '[]', '["p1"]', T(1))
    registrarMudanca(arm, 'metanutri:caso:p2', plano('p2', 'Bia'), null, T(2))
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'planos/p1': T(1) }, excluidos: { 'planos/p2': T(2) } })
  })

  it('configuração gravada ganha a hora; apagada, a lápide; o item que volta perde a lápide', () => {
    const arm = new Memoria()
    registrarMudanca(arm, 'metanutri:impressao', null, '{"a":1}', T(1))
    registrarMudanca(arm, 'metanutri:perfil', '{}', null, T(2))
    registrarMudanca(arm, 'metanutri:perfil', null, '{"nome":"Ana"}', T(3))
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'chave/metanutri:impressao': T(1), 'chave/metanutri:perfil': T(3) }, excluidos: {} })
  })

  it('links: os itens do arquivo, por id; produtos: pelo id numérico', () => {
    const arm = new Memoria()
    const arquivo = (ids: string[]) => JSON.stringify({ formato: 1, itens: ids.map((id) => ({ id, criadoEm: T(1) })), naNuvem: [], pendentes: [] })
    registrarMudanca(arm, 'metanutri:acompanhamentos', arquivo(['l1', 'l2']), arquivo(['l2', 'l3']), T(4))
    registrarMudanca(arm, 'metanutri:produtos', JSON.stringify([produto(900000, 'Iogurte')]), '[]', T(5))
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({
      alterados: { 'acompanhamentos/l3': T(4) },
      excluidos: { 'acompanhamentos/l1': T(4), 'produtos/900000': T(5) },
    })
  })

  it('o que não vai para a nuvem não marca nada', () => {
    const arm = new Memoria()
    registrarMudanca(arm, 'metanutri:frequentes', null, '{}', AGORA)
    registrarMudanca(arm, 'metanutri:nuvem', null, '{}', AGORA)
    expect(arm.getItem(CHAVE_MUDANCAS)).toBeNull()
  })
})

describe('montar e aplicar a cópia de trabalho', () => {
  it('a cópia leva os dados do backup, os planos do índice, o aviso de primeiro acesso e as marcas', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:casos', '["p1"]')
    arm.setItem('metanutri:caso:p1', plano('p1', 'Ana'))
    arm.setItem('metanutri:pacientes', '[]')
    arm.setItem('metanutri:aviso-inicial-visto', '1')
    arm.setItem(CHAVE_MUDANCAS, mudancas({ 'planos/p1': T(1) }))
    arm.setItem('metanutri:frequentes', '{}')
    arm.setItem('metanutri:nuvem', '{}')
    const c = montarCopia(arm, AGORA)
    expect(Object.keys(c.dados).sort()).toEqual(['metanutri:aviso-inicial-visto', 'metanutri:caso:p1', 'metanutri:casos', CHAVE_MUDANCAS, 'metanutri:pacientes'].sort())
    expect(c.formato).toBe(1)
  })

  it('lápides com mais de 90 dias saem da cópia (DP-3)', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_MUDANCAS, mudancas({}, { 'pacientes/velho': '2026-07-01T00:00:00.000Z', 'pacientes/novo': '2026-09-01T00:00:00.000Z' }))
    expect(lerMudancas(montarCopia(arm, AGORA).dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'pacientes/novo': '2026-09-01T00:00:00.000Z' })
  })

  it('aplicar escreve o que mudou, tira o que a cópia não tem e não mexe no resto', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:casos', '["p1","p2"]')
    arm.setItem('metanutri:caso:p1', plano('p1', 'Ana'))
    arm.setItem('metanutri:caso:p2', plano('p2', 'Bia'))
    arm.setItem('metanutri:perfil', '{"nome":"Ana"}')
    arm.setItem('metanutri:frequentes', '{}')
    const nova = copia({ 'metanutri:casos': '["p1"]', 'metanutri:caso:p1': plano('p1', 'Ana Souza'), 'metanutri:pacientes': '[]' })
    expect(aplicarCopia(arm, nova)).toBe(true)
    expect(arm.getItem('metanutri:caso:p1')).toBe(plano('p1', 'Ana Souza'))
    expect(arm.getItem('metanutri:caso:p2')).toBeNull()
    expect(arm.getItem('metanutri:perfil')).toBeNull()
    expect(arm.getItem('metanutri:casos')).toBe('["p1"]')
    expect(arm.getItem('metanutri:frequentes')).toBe('{}')
    expect(aplicarCopia(arm, nova)).toBe(false)
  })

  it('DP-15: a cópia que vem da nuvem não traz a marca de link pendente', () => {
    const arquivo = JSON.stringify({ formato: 1, itens: [], naNuvem: ['l1'], pendentes: ['l1'] })
    const limpo = semPendencias(copia({ 'metanutri:acompanhamentos': arquivo }))
    expect(JSON.parse(limpo.dados['metanutri:acompanhamentos'] ?? '{}')).toEqual({ formato: 1, itens: [], naNuvem: ['l1'] })
  })

  it('contar os itens e comparar cópias', () => {
    const c = copia({ 'metanutri:casos': '["p1"]', 'metanutri:caso:p1': plano('p1', 'Ana'), 'metanutri:pacientes': JSON.stringify([paciente('a', 'A'), paciente('b', 'B')]) })
    expect(itensDaCopia(c)).toBe(3)
    expect(copiasIguais(c, { ...c, geradoEm: AGORA })).toBe(true)
    expect(copiasIguais(c, copia({}))).toBe(false)
    expect(copiaSemItens(copia({ 'metanutri:perfil': '{}' }))).toBe(true)
    expect(copiaSemItens(copia({ [CHAVE_MUDANCAS]: mudancas({}, { 'pacientes/a': T(1) }) }))).toBe(false)
  })
})

describe('juntar a cópia daqui com a da nuvem (D-132, D-133)', () => {
  it('CA-480: itens diferentes mudados nos dois aparelhos: ficam os dois', () => {
    const daqui = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana', T(2))]),
      'metanutri:casos': '["p1"]',
      'metanutri:caso:p1': plano('p1', 'Plano da Ana', T(2)),
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(2), 'planos/p1': T(2) }),
    })
    const daNuvem = copia({
      'metanutri:pacientes': JSON.stringify([paciente('bia', 'Bia', T(3))]),
      'metanutri:casos': '["p2"]',
      'metanutri:caso:p2': plano('p2', 'Plano da Bia', T(3)),
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/bia': T(3), 'planos/p2': T(3) }),
    })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    expect(nomes(junta, 'metanutri:pacientes').sort()).toEqual(['Ana', 'Bia'])
    expect(JSON.parse(junta.dados['metanutri:casos'] ?? '[]')).toEqual(['p1', 'p2'])
    expect(junta.dados['metanutri:caso:p1']).toBe(plano('p1', 'Plano da Ana', T(2)))
    expect(junta.dados['metanutri:caso:p2']).toBe(plano('p2', 'Plano da Bia', T(3)))
    expect(lerMudancas(junta.dados[CHAVE_MUDANCAS] ?? null).alterados).toEqual({ 'pacientes/ana': T(2), 'planos/p1': T(2), 'pacientes/bia': T(3), 'planos/p2': T(3) })
  })

  it('CA-480: o mesmo item mudado nos dois: fica a mudança mais nova, de cada lado', () => {
    const daqui = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana daqui'), paciente('bia', 'Bia daqui')]),
      'metanutri:perfil': '{"nome":"Perfil daqui"}',
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(5), 'pacientes/bia': T(2), 'chave/metanutri:perfil': T(2) }),
    })
    const daNuvem = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana da nuvem'), paciente('bia', 'Bia da nuvem')]),
      'metanutri:perfil': '{"nome":"Perfil da nuvem"}',
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(4), 'pacientes/bia': T(3), 'chave/metanutri:perfil': T(3) }),
    })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    expect(nomes(junta, 'metanutri:pacientes')).toEqual(['Ana daqui', 'Bia da nuvem'])
    expect(junta.dados['metanutri:perfil']).toBe('{"nome":"Perfil da nuvem"}')
  })

  it('CA-480: o item excluído num aparelho não volta pelo outro', () => {
    // Daqui, Bia, o plano p2, o produto e o modelo foram excluídos; a nuvem ainda tem a versão de antes.
    const daqui = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]),
      'metanutri:casos': '["p1"]',
      'metanutri:caso:p1': plano('p1', 'Ana'),
      'metanutri:produtos': '[]',
      'metanutri:modelos': '[]',
      [CHAVE_MUDANCAS]: mudancas({}, { 'pacientes/bia': T(5), 'planos/p2': T(5), 'produtos/900000': T(5), 'modelos/m1': T(5) }),
    })
    const daNuvem = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana'), paciente('bia', 'Bia')]),
      'metanutri:casos': '["p1","p2"]',
      'metanutri:caso:p1': plano('p1', 'Ana'),
      'metanutri:caso:p2': plano('p2', 'Bia'),
      'metanutri:produtos': JSON.stringify([produto(900000, 'Iogurte')]),
      'metanutri:modelos': JSON.stringify([modelo('m1', 'Gestante')]),
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/bia': T(2), 'planos/p2': T(2) }),
    })
    for (const junta of [juntarCopias(daqui, daNuvem, AGORA), juntarCopias(daNuvem, daqui, AGORA)]) {
      expect(nomes(junta, 'metanutri:pacientes')).toEqual(['Ana'])
      expect(JSON.parse(junta.dados['metanutri:casos'] ?? '[]')).toEqual(['p1'])
      expect(junta.dados['metanutri:caso:p2']).toBeUndefined()
      expect(lista(junta, 'metanutri:produtos')).toEqual([])
      expect(lista(junta, 'metanutri:modelos')).toEqual([])
      expect(lerMudancas(junta.dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'pacientes/bia': T(5), 'planos/p2': T(5), 'produtos/900000': T(5), 'modelos/m1': T(5) })
    }
  })

  it('o item mudado no outro aparelho depois da exclusão volta: a mudança mais nova vence', () => {
    const daqui = copia({ 'metanutri:pacientes': '[]', [CHAVE_MUDANCAS]: mudancas({}, { 'pacientes/bia': T(2) }) })
    const daNuvem = copia({ 'metanutri:pacientes': JSON.stringify([paciente('bia', 'Bia nova')]), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/bia': T(3) }) })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    expect(nomes(junta, 'metanutri:pacientes')).toEqual(['Bia nova'])
    expect(lerMudancas(junta.dados[CHAVE_MUDANCAS] ?? null)).toEqual({ alterados: { 'pacientes/bia': T(3) }, excluidos: {} })
  })

  it('CA-481: dados de antes, sem marcas: juntam pelas datas dos itens, nada some, e o empate com valor diferente fica com a nuvem', () => {
    const daqui = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana nova', T(5)), paciente('bia', 'Bia', T(1)), paciente('caio', 'Caio', T(1))]),
      'metanutri:casos': '["p1"]',
      'metanutri:caso:p1': plano('p1', 'Plano só daqui'),
      'metanutri:impressao': '{"daqui":true}',
    })
    const daNuvem = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana velha', T(2)), paciente('bia', 'Bia da nuvem', T(1)), paciente('davi', 'Davi', T(1))]),
      'metanutri:casos': '["p2"]',
      'metanutri:caso:p2': plano('p2', 'Plano só da nuvem'),
      'metanutri:impressao': '{"daNuvem":true}',
    })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    expect(nomes(junta, 'metanutri:pacientes')).toEqual(['Ana nova', 'Bia da nuvem', 'Caio', 'Davi'])
    expect(JSON.parse(junta.dados['metanutri:casos'] ?? '[]')).toEqual(['p1', 'p2'])
    expect(junta.dados['metanutri:impressao']).toBe('{"daNuvem":true}')
    // Nenhuma das duas tinha marcas: a cópia junta não ganha a chave delas.
    expect(junta.dados[CHAVE_MUDANCAS]).toBeUndefined()
  })

  it('CA-481: sem marcas, o empate fica com o lado escolhido para desempatar (o mais recente, DP-3)', () => {
    const daqui = copia({ 'metanutri:perfil': '{"nome":"Perfil de hoje"}', 'metanutri:produtos': JSON.stringify([{ ...produto(900000, 'Iogurte natural'), porcaoG: 170 }]) })
    const daNuvem = copia({ 'metanutri:perfil': '{"nome":"Perfil de antes"}', 'metanutri:produtos': JSON.stringify([produto(900000, 'Iogurte')]) })
    const junta = juntarCopias(daqui, daNuvem, AGORA, 'daqui')
    expect(junta.dados['metanutri:perfil']).toBe('{"nome":"Perfil de hoje"}')
    expect(nomes(junta, 'metanutri:produtos')).toEqual(['Iogurte natural'])
  })

  it('o momento de uma cópia é a data mais nova que ela tem: marcas, planos e itens', () => {
    expect(momentoDaCopia(copia({}))).toBe('')
    const c = copia({
      'metanutri:caso:p1': plano('p1', 'Ana', T(3)),
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana', T(5))]),
      [CHAVE_MUDANCAS]: mudancas({ 'chave/metanutri:perfil': T(4) }, { 'pacientes/bia': T(6) }),
    })
    expect(momentoDaCopia(c)).toBe(T(6))
  })

  it('DP-21: o id novo do produto daqui nunca cai num id com lápide ou marca: nenhum produto some', () => {
    const daqui = copia({
      'metanutri:produtos': JSON.stringify([produto(900000, 'Granola daqui', T(4)), produto(900001, 'Pão daqui', T(4))]),
      [CHAVE_MUDANCAS]: mudancas({ 'produtos/900000': T(4), 'produtos/900001': T(4) }),
    })
    const daNuvem = copia({
      'metanutri:produtos': JSON.stringify([produto(900000, 'Iogurte', T(3)), produto(900001, 'Queijo', T(3))]),
      [CHAVE_MUDANCAS]: mudancas({ 'produtos/900000': T(3), 'produtos/900001': T(3) }, { 'produtos/900002': T(5) }),
    })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    const produtos = lista(junta, 'metanutri:produtos') as { id: number; nome: string }[]
    expect(produtos.map((p) => p.nome).sort()).toEqual(['Granola daqui', 'Iogurte', 'Pão daqui', 'Queijo'])
    expect(produtos.map((p) => p.id)).not.toContain(900002)
    expect(lerMudancas(junta.dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'produtos/900002': T(5) })
  })

  it('DP-4: produto com o mesmo id e criação diferente são dois produtos; o daqui ganha id novo e os planos daqui o seguem', () => {
    const item = (alimentoId: number) => ({ id: 'i1', alimentoId, gramas: 100 })
    const planoCom = (id: string, alimentoId: number, atualizadoEm: string) =>
      JSON.stringify({ formato: 1, versao: 1, atualizadoEm, caso: { id, nome: id }, plano: { refeicoes: [{ id: 'r1', opcoes: { principal: [item(alimentoId)], substituto1: [], substituto2: [] } }] } })
    const daqui = copia({
      'metanutri:produtos': JSON.stringify([produto(900000, 'Granola daqui', T(4))]),
      'metanutri:casos': '["pd"]',
      'metanutri:caso:pd': planoCom('pd', 900000, T(4)),
      'metanutri:sugestoes-ocultas': '[900000]',
      [CHAVE_MUDANCAS]: mudancas({ 'produtos/900000': T(4), 'planos/pd': T(4), 'chave/metanutri:sugestoes-ocultas': T(4) }),
    })
    const daNuvem = copia({
      'metanutri:produtos': JSON.stringify([produto(900000, 'Iogurte da nuvem', T(3))]),
      'metanutri:casos': '["pn"]',
      'metanutri:caso:pn': planoCom('pn', 900000, T(3)),
      [CHAVE_MUDANCAS]: mudancas({ 'produtos/900000': T(3), 'planos/pn': T(3) }),
    })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    const produtos = lista(junta, 'metanutri:produtos') as { id: number; nome: string }[]
    expect(produtos.map((p) => [p.id, p.nome])).toEqual([
      [900001, 'Granola daqui'],
      [900000, 'Iogurte da nuvem'],
    ])
    const alimentoDe = (chave: string) => JSON.parse(junta.dados[chave] ?? '{}').plano.refeicoes[0].opcoes.principal[0].alimentoId
    expect(alimentoDe('metanutri:caso:pd')).toBe(900001)
    expect(alimentoDe('metanutri:caso:pn')).toBe(900000)
    expect(junta.dados['metanutri:sugestoes-ocultas']).toBe('[900001]')
  })

  it('o mesmo produto editado nos dois (mesma criação): fica a edição mais nova, sem duplicar', () => {
    const daqui = copia({ 'metanutri:produtos': JSON.stringify([produto(900000, 'Iogurte natural')]), [CHAVE_MUDANCAS]: mudancas({ 'produtos/900000': T(5) }) })
    const daNuvem = copia({ 'metanutri:produtos': JSON.stringify([produto(900000, 'Iogurte')]), [CHAVE_MUDANCAS]: mudancas({ 'produtos/900000': T(4) }) })
    expect(nomes(juntarCopias(daqui, daNuvem, AGORA), 'metanutri:produtos')).toEqual(['Iogurte natural'])
  })

  it('DP-19: o plano que a nuvem traz por cima de outro daqui fica com a versão maior', () => {
    const daqui = copia({ 'metanutri:casos': '["p1"]', 'metanutri:caso:p1': plano('p1', 'Daqui', T(2), 7), [CHAVE_MUDANCAS]: mudancas({ 'planos/p1': T(2) }) })
    const daNuvem = copia({ 'metanutri:casos': '["p1"]', 'metanutri:caso:p1': plano('p1', 'Da nuvem', T(3), 3), [CHAVE_MUDANCAS]: mudancas({ 'planos/p1': T(3) }) })
    const junto = JSON.parse(juntarCopias(daqui, daNuvem, AGORA).dados['metanutri:caso:p1'] ?? '{}')
    expect(junto.caso.nome).toBe('Da nuvem')
    expect(junto.versao).toBe(8)
  })

  it('DP-15: links juntam por id; a marca de pendente só fica para o link que ficou com a versão daqui', () => {
    const link = (id: string, nome: string) => ({ id, token: `t-${id}`, casoId: 'p1', pacienteId: null, nome, criadoEm: T(1), missoes: [], marcacoes: [], usoNaoComercial: false })
    const daqui = copia({
      'metanutri:acompanhamentos': JSON.stringify({ formato: 1, itens: [link('l1', 'Ana daqui')], naNuvem: ['l1'], pendentes: ['l1'] }),
      [CHAVE_MUDANCAS]: mudancas({ 'acompanhamentos/l1': T(5) }),
    })
    const daNuvem = copia({
      'metanutri:acompanhamentos': JSON.stringify({ formato: 1, itens: [link('l1', 'Ana'), link('l2', 'Bia')], naNuvem: ['l1', 'l2'], pendentes: ['l2'] }),
      [CHAVE_MUDANCAS]: mudancas({ 'acompanhamentos/l1': T(2), 'acompanhamentos/l2': T(2) }),
    })
    const arquivo = lista(juntarCopias(daqui, daNuvem, AGORA), 'metanutri:acompanhamentos') as { itens: { nome: string }[]; naNuvem: string[]; pendentes: string[] }
    expect(arquivo.itens.map((i) => i.nome)).toEqual(['Ana daqui', 'Bia'])
    expect(arquivo.naNuvem).toEqual(['l1', 'l2'])
    expect(arquivo.pendentes).toEqual(['l1'])
  })

  it('valor que este MetaNutri não lê de um lado: fica o do outro', () => {
    const daqui = copia({ 'metanutri:pacientes': 'estragado' })
    const daNuvem = copia({ 'metanutri:pacientes': JSON.stringify([paciente('bia', 'Bia')]) })
    expect(nomes(juntarCopias(daqui, daNuvem, AGORA), 'metanutri:pacientes')).toEqual(['Bia'])
    expect(nomes(juntarCopias(daNuvem, daqui, AGORA), 'metanutri:pacientes')).toEqual(['Bia'])
  })

  it('juntar não cria chave que nenhum dos lados tinha: a cópia junta igual à da nuvem não sobe de novo', () => {
    const daNuvem = copia({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1) }) })
    const junta = juntarCopias(copia({}), daNuvem, AGORA)
    expect(Object.keys(junta.dados).sort()).toEqual([CHAVE_MUDANCAS, 'metanutri:pacientes'])
    expect(copiasIguais(junta, daNuvem)).toBe(true)
  })

  it('lápide com mais de 90 dias sai da cópia junta', () => {
    const daqui = copia({ 'metanutri:pacientes': '[]', [CHAVE_MUDANCAS]: mudancas({}, { 'pacientes/velho': '2026-06-01T00:00:00.000Z', 'pacientes/novo': T(1) }) })
    const junta = juntarCopias(daqui, copia({}), AGORA)
    expect(lerMudancas(junta.dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'pacientes/novo': T(1) })
  })
})
