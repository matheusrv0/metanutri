import { aplicarCopia, CHAVE_MUDANCAS, CHAVE_RETIDOS, chavesMantidas, copiaSemItens, copiasIguais, itensDaCopia, juntarCopias, lerMudancas, momentoDaCopia, montarCopia, registrarMudanca, semPendencias } from './copiaDaConta.ts'
import { criarRepositorioPacientes } from './pacientes.ts'
import { CHAVES_DE_DADOS, montarBackup, restaurarBackup, type Backup } from './perfil.ts'
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

  it('CA-551 (spec dieta-no-link): mudar só a dieta de um link marca aquele link como mudado', () => {
    const arm = new Memoria()
    const link = (dieta: unknown) => ({ id: 'l1', criadoEm: T(1), token: 'abcdefghijkm', dieta })
    const arquivo = (itens: unknown[]) => JSON.stringify({ formato: 1, itens, naNuvem: ['l1'], pendentes: [] })
    const dieta = { refeicoes: [], orientacoes: 'Beber água.', receitas: '', copiadaEm: '2026-10-14' }
    registrarMudanca(arm, 'metanutri:acompanhamentos', arquivo([link(null), { id: 'l2', criadoEm: T(1) }]), arquivo([link(dieta), { id: 'l2', criadoEm: T(1) }]), T(6))
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'acompanhamentos/l1': T(6) }, excluidos: {} })
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

  it('montar a cópia sem uma data que se leia não quebra: nenhuma lápide sai', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_MUDANCAS, mudancas({}, { 'pacientes/velho': '2026-01-01T00:00:00.000Z' }))
    expect(lerMudancas(montarCopia(arm, '').dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'pacientes/velho': '2026-01-01T00:00:00.000Z' })
  })

  it('lápides com mais de 90 dias saem da cópia (DP-3)', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_MUDANCAS, mudancas({}, { 'pacientes/velho': '2026-07-01T00:00:00.000Z', 'pacientes/novo': '2026-09-01T00:00:00.000Z' }))
    expect(lerMudancas(montarCopia(arm, AGORA).dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'pacientes/novo': '2026-09-01T00:00:00.000Z' })
  })

  it('aplicar escreve o que mudou, tira o plano que a cópia não tem (CB-170) e a chave com lápide, e não mexe no resto', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:casos', '["p1","p2"]')
    arm.setItem('metanutri:caso:p1', plano('p1', 'Ana'))
    arm.setItem('metanutri:caso:p2', plano('p2', 'Bia'))
    arm.setItem('metanutri:perfil', '{"nome":"Ana"}')
    arm.setItem('metanutri:frequentes', '{}')
    const nova = copia({
      'metanutri:casos': '["p1"]',
      'metanutri:caso:p1': plano('p1', 'Ana Souza'),
      'metanutri:pacientes': '[]',
      [CHAVE_MUDANCAS]: mudancas({}, { 'chave/metanutri:perfil': T(2) }),
    })
    expect(aplicarCopia(arm, nova)).toEqual({ mudou: true, mantidas: [] })
    expect(arm.getItem('metanutri:caso:p1')).toBe(plano('p1', 'Ana Souza'))
    expect(arm.getItem('metanutri:caso:p2')).toBeNull()
    expect(arm.getItem('metanutri:perfil')).toBeNull()
    expect(arm.getItem('metanutri:casos')).toBe('["p1"]')
    expect(arm.getItem('metanutri:frequentes')).toBe('{}')
    expect(aplicarCopia(arm, nova)).toEqual({ mudou: false, mantidas: [] })
  })

  it('DP-23: aplicar tira as chaves velhas antes de gravar as novas (o espaço liberado é usado)', () => {
    const ordem: string[] = []
    const arm = new Memoria()
    arm.setItem('metanutri:casos', '["p1"]')
    arm.setItem('metanutri:caso:p1', plano('p1', 'Velho'))
    const espiao: Armazenamento = {
      getItem: (k) => arm.getItem(k),
      setItem: (k, v) => {
        ordem.push(`gravar ${k}`)
        arm.setItem(k, v)
      },
      removeItem: (k) => {
        ordem.push(`tirar ${k}`)
        arm.removeItem(k)
      },
    }
    aplicarCopia(espiao, copia({ 'metanutri:casos': '["p2"]', 'metanutri:caso:p2': plano('p2', 'Novo') }))
    expect(ordem).toEqual(['tirar metanutri:caso:p1', 'gravar metanutri:caso:p2', 'gravar metanutri:casos'])
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

describe('roteiro de anamnese e modelos de suplemento na nuvem (spec anamnese-e-prescricoes, CA-570, CA-575)', () => {
  const ROTEIRO = 'metanutri:roteiro-anamnese'
  const MODELOS = 'metanutri:modelos-suplemento'
  const roteiro = (texto: string) => JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'agua-dia', texto }] } })
  const modeloSup = (id: string, nome: string, atualizadoEm = T(1)) => ({ id, nome, dose: '', horario: '', duracao: '', observacao: '', criadoEm: T(1), atualizadoEm })

  it('as duas chaves são dado da conta: entram em CHAVES_DE_DADOS e na cópia', () => {
    expect(CHAVES_DE_DADOS).toContain(ROTEIRO)
    expect(CHAVES_DE_DADOS).toContain(MODELOS)
    const arm = new Memoria()
    arm.setItem(ROTEIRO, roteiro('Água?'))
    arm.setItem(MODELOS, JSON.stringify([modeloSup('a', 'Ferro')]))
    expect(Object.keys(montarCopia(arm, AGORA).dados).sort()).toEqual([MODELOS, ROTEIRO])
    // E no backup de Configurações, que volta inteiro em outro aparelho.
    const backup = montarBackup(arm, [...CHAVES_DE_DADOS], AGORA)
    const outro = new Memoria()
    expect(restaurarBackup(outro, JSON.stringify(backup))).toEqual({ restaurados: 2, erro: null })
    expect(outro.getItem(ROTEIRO)).toBe(roteiro('Água?'))
  })

  it('cada modelo que entra ou muda ganha a hora; o apagado ganha a lápide; o roteiro marca a chave inteira', () => {
    const arm = new Memoria()
    registrarMudanca(arm, MODELOS, JSON.stringify([modeloSup('a', 'Ferro'), modeloSup('b', 'Zinco')]), JSON.stringify([modeloSup('a', 'Ferro quelato'), modeloSup('c', 'B12')]), T(2))
    registrarMudanca(arm, ROTEIRO, null, roteiro('Água?'), T(3))
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({
      alterados: { 'modelos-suplemento/a': T(2), 'modelos-suplemento/c': T(2), [`chave/${ROTEIRO}`]: T(3) },
      excluidos: { 'modelos-suplemento/b': T(2) },
    })
  })

  it('CA-575: dois aparelhos juntam modelo por modelo; o mais novo vence e o apagado não volta', () => {
    const daqui = copia({
      [MODELOS]: JSON.stringify([modeloSup('a', 'Ferro, daqui', T(3)), modeloSup('d', 'Magnésio')]),
      [CHAVE_MUDANCAS]: mudancas({ 'modelos-suplemento/a': T(3), 'modelos-suplemento/d': T(1) }, { 'modelos-suplemento/c': T(4) }),
    })
    const daNuvem = copia({
      [MODELOS]: JSON.stringify([modeloSup('a', 'Ferro, da nuvem', T(2)), modeloSup('b', 'Zinco'), modeloSup('c', 'B12')]),
      [CHAVE_MUDANCAS]: mudancas({ 'modelos-suplemento/a': T(2), 'modelos-suplemento/b': T(1), 'modelos-suplemento/c': T(1) }),
    })
    const junta = juntarCopias(daqui, daNuvem, AGORA)
    expect(nomes(junta, MODELOS)).toEqual(['Ferro, daqui', 'Magnésio', 'Zinco'])
    expect(lerMudancas(junta.dados[CHAVE_MUDANCAS] ?? null).excluidos).toEqual({ 'modelos-suplemento/c': T(4) })
    expect(itensDaCopia(junta)).toBe(3)
  })

  it('CA-575: sem marcas (primeira junção), vale a data do próprio modelo', () => {
    const daqui = copia({ [MODELOS]: JSON.stringify([modeloSup('a', 'Ferro, antigo', T(1))]) })
    const daNuvem = copia({ [MODELOS]: JSON.stringify([modeloSup('a', 'Ferro, novo', T(5))]) })
    expect(nomes(juntarCopias(daqui, daNuvem, AGORA, 'daqui'), MODELOS)).toEqual(['Ferro, novo'])
  })

  it('CB-164: a mesma ficha mexida em dois aparelhos fica inteira com a alteração mais nova, suplementos e respostas juntos', () => {
    const ficha = (atualizadoEm: string, suplementos: unknown[], respostas: unknown[]) => ({ id: 'ana', nome: 'Ana', atualizadoEm, suplementos, respostasAnamnese: respostas })
    const resposta = { perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Cansaço' }
    const daqui = copia({ 'metanutri:pacientes': JSON.stringify([ficha(T(2), [{ id: 's1', nome: 'Ferro' }], [])]), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(2) }) })
    const daNuvem = copia({ 'metanutri:pacientes': JSON.stringify([ficha(T(3), [], [resposta])]), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(3) }) })
    expect(lista(juntarCopias(daqui, daNuvem, AGORA), 'metanutri:pacientes')).toEqual([ficha(T(3), [], [resposta])])
  })

  it('CA-570 e CB-163: o roteiro salvo por último vence, dos dois lados; apagado depois, sai', () => {
    const daqui = (quando: string) => copia({ [ROTEIRO]: roteiro('Daqui'), [CHAVE_MUDANCAS]: mudancas({ [`chave/${ROTEIRO}`]: quando }) })
    const daNuvem = (quando: string) => copia({ [ROTEIRO]: roteiro('Da nuvem'), [CHAVE_MUDANCAS]: mudancas({ [`chave/${ROTEIRO}`]: quando }) })
    expect(juntarCopias(daqui(T(2)), daNuvem(T(3)), AGORA).dados[ROTEIRO]).toBe(roteiro('Da nuvem'))
    expect(juntarCopias(daqui(T(4)), daNuvem(T(3)), AGORA).dados[ROTEIRO]).toBe(roteiro('Daqui'))
    const apagadoAqui = copia({ [CHAVE_MUDANCAS]: mudancas({}, { [`chave/${ROTEIRO}`]: T(5) }) })
    expect(juntarCopias(apagadoAqui, daNuvem(T(3)), AGORA).dados[ROTEIRO]).toBeUndefined()
  })
})

describe('D-170: uma versão antiga do site não apaga o que não conhece', () => {
  const ROTEIRO = 'metanutri:roteiro-anamnese'
  const MODELOS = 'metanutri:modelos-suplemento'
  const roteiro = JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'agua-dia', texto: 'Quanta água por dia?' }] } })
  const modeloSup = (id: string, nome: string) => ({ id, nome, dose: '', horario: '', duracao: '', observacao: '', criadoEm: T(1), atualizadoEm: T(1) })

  /** Um aparelho novo, em dia com a nuvem: roteiro e dois modelos, com as marcas deles. */
  function aparelhoNovo(): Memoria {
    const arm = new Memoria()
    arm.setItem('metanutri:pacientes', JSON.stringify([paciente('ana', 'Ana')]))
    arm.setItem(ROTEIRO, roteiro)
    arm.setItem(MODELOS, JSON.stringify([modeloSup('a', 'Ferro'), modeloSup('b', 'Zinco')]))
    arm.setItem(CHAVE_MUDANCAS, mudancas({ 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: T(2), 'modelos-suplemento/a': T(2), 'modelos-suplemento/b': T(2) }))
    return arm
  }

  it('CA-590: uma cópia do app antigo não apaga o roteiro nem os modelos, e eles voltam na próxima cópia', () => {
    const arm = aparelhoNovo()
    // A versão antiga não conhece as duas chaves: a cópia dela vem sem elas, com a mudança que ela fez (Bia) e as
    // marcas que ela copiou da nuvem (as deste aparelho, que foi o último a mexer no roteiro e nos modelos; a do
    // modelo "b" sem marca nenhuma).
    const doAppAntigo = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana'), paciente('bia', 'Bia', T(3))]),
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), 'pacientes/bia': T(3), [`chave/${ROTEIRO}`]: T(2), 'modelos-suplemento/a': T(2) }),
    })
    const aplicada = aplicarCopia(arm, doAppAntigo)
    expect(aplicada.mudou).toBe(true)
    expect([...aplicada.mantidas].sort()).toEqual([MODELOS, ROTEIRO])
    expect(arm.getItem(ROTEIRO)).toBe(roteiro)
    expect(nomes(copia({ [MODELOS]: arm.getItem(MODELOS) ?? '' }), MODELOS)).toEqual(['Ferro', 'Zinco'])
    expect(nomes(copia({ p: arm.getItem('metanutri:pacientes') ?? '' }), 'p')).toEqual(['Ana', 'Bia'])
    // A marca de cada chave mantida é a daqui: a hora do valor que ficou.
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS)).alterados).toEqual({
      'pacientes/ana': T(1),
      'pacientes/bia': T(3),
      [`chave/${ROTEIRO}`]: T(2),
      'modelos-suplemento/a': T(2),
      'modelos-suplemento/b': T(2),
    })
    const proxima = montarCopia(arm, AGORA)
    expect(proxima.dados[ROTEIRO]).toBe(roteiro)
    expect(nomes(proxima, MODELOS)).toEqual(['Ferro', 'Zinco'])
  })

  it('CA-599: o roteiro daqui mais velho que a marca da cópia fica aqui sem subir; o aparelho com o mais novo o devolve', () => {
    const rot = (texto: string) => JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'q', texto }] } })
    const pacientes = JSON.stringify([paciente('ana', 'Ana')])
    const aparelho = (texto: string, quando: string) => {
      const arm = new Memoria()
      arm.setItem('metanutri:pacientes', pacientes)
      arm.setItem(ROTEIRO, rot(texto))
      arm.setItem(CHAVE_MUDANCAS, mudancas({ 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: quando }))
      return arm
    }
    // N2 salvou o roteiro novo às 4h; N1 ainda está com o de 2h. A aba antiga salvou sem o roteiro, com a marca das 4h.
    const n2 = aparelho('r2 novo', T(4))
    const n1 = aparelho('r1 velho', T(2))
    const v3 = copia({ 'metanutri:pacientes': pacientes, [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: T(4) }) })

    const emN1 = aplicarCopia(n1, v3)
    expect(emN1.mantidas).toEqual([])
    expect(n1.getItem(ROTEIRO)).toBe(rot('r1 velho'))
    expect(lerMudancas(n1.getItem(CHAVE_MUDANCAS)).alterados[`chave/${ROTEIRO}`]).toBe(T(4))

    const emN2 = aplicarCopia(n2, v3)
    expect(emN2.mantidas).toEqual([ROTEIRO])
    const v4 = montarCopia(n2, T(6))
    expect(v4.dados[ROTEIRO]).toBe(rot('r2 novo'))

    // A cópia que N2 devolve chega a N1: fica o roteiro novo.
    aplicarCopia(n1, v4)
    expect(n1.getItem(ROTEIRO)).toBe(rot('r2 novo'))
  })

  it('CA-599: na lista, sobe quando um modelo que ficou é igual ou mais novo; todos mais velhos, fica sem subir', () => {
    const arm = aparelhoNovo()
    const maisNova = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]),
      [ROTEIRO]: roteiro,
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: T(2), 'modelos-suplemento/a': T(5), 'modelos-suplemento/b': T(5) }),
    })
    expect(aplicarCopia(arm, maisNova).mantidas).toEqual([])
    expect(nomes(copia({ [MODELOS]: arm.getItem(MODELOS) ?? '' }), MODELOS)).toEqual(['Ferro', 'Zinco'])
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS)).alterados['modelos-suplemento/a']).toBe(T(5))

    // O "b" não tem marca na cópia: sobe. O "a" daqui é mais velho que a marca da cópia: fica retido e não vai na lista
    // que sobe (D-173, DP-40); a marca das 5h continua na cópia que sobe.
    const outro = aparelhoNovo()
    const soUmMaisNovo = copia({ ...maisNova.dados, [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: T(2), 'modelos-suplemento/a': T(5) }) })
    expect(aplicarCopia(outro, soUmMaisNovo).mantidas).toEqual([MODELOS])
    const sobe = montarCopia(outro, AGORA)
    expect(nomes(sobe, MODELOS)).toEqual(['Zinco'])
    expect(lerMudancas(sobe.dados[CHAVE_MUDANCAS] ?? null).alterados['modelos-suplemento/a']).toBe(T(5))
    expect(nomes(copia({ [MODELOS]: outro.getItem(MODELOS) ?? '' }), MODELOS)).toEqual(['Ferro', 'Zinco'])
  })

  it('CA-600: chavesMantidas diz quais chaves ficariam e subiriam, sem gravar nada', () => {
    const arm = aparelhoNovo()
    const antes = new Map(arm.dados)
    const doAppAntigo = copia({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]), [CHAVE_MUDANCAS]: arm.getItem(CHAVE_MUDANCAS) ?? '' })
    expect([...chavesMantidas(arm, doAppAntigo)].sort()).toEqual([MODELOS, ROTEIRO])
    expect(arm.dados).toEqual(antes)
    expect(chavesMantidas(arm, copia(Object.fromEntries(arm.dados)))).toEqual([])
  })
  it('CA-592: a exclusão de verdade continua valendo: a lápide da chave tira o roteiro e as dos itens tiram os modelos', () => {
    const arm = aparelhoNovo()
    const comLapides = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]),
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1) }, { [`chave/${ROTEIRO}`]: T(5), 'modelos-suplemento/a': T(5), 'modelos-suplemento/b': T(5) }),
    })
    expect(aplicarCopia(arm, comLapides)).toEqual({ mudou: true, mantidas: [] })
    expect(arm.getItem(ROTEIRO)).toBeNull()
    expect(arm.getItem(MODELOS)).toBeNull()
    expect(arm.getItem(CHAVE_MUDANCAS)).toBe(comLapides.dados[CHAVE_MUDANCAS])
  })

  it('CA-592: a lápide mais velha que a mudança daqui não apaga (o valor foi gravado depois da exclusão)', () => {
    const arm = aparelhoNovo()
    const lapideVelha = copia({ [CHAVE_MUDANCAS]: mudancas({}, { [`chave/${ROTEIRO}`]: T(1) }) })
    const aplicada = aplicarCopia(arm, lapideVelha)
    expect(aplicada.mantidas).toContain(ROTEIRO)
    expect(arm.getItem(ROTEIRO)).toBe(roteiro)
  })

  it('CB-171: na lista, só os itens com lápide saem; os outros ficam e voltam para a nuvem', () => {
    const arm = aparelhoNovo()
    const lapideDeUm = copia({
      'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]),
      [ROTEIRO]: roteiro,
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: T(2) }, { 'modelos-suplemento/a': T(5) }),
    })
    expect(aplicarCopia(arm, lapideDeUm)).toEqual({ mudou: true, mantidas: [MODELOS] })
    expect(nomes(copia({ [MODELOS]: arm.getItem(MODELOS) ?? '' }), MODELOS)).toEqual(['Zinco'])
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({
      alterados: { 'pacientes/ana': T(1), [`chave/${ROTEIRO}`]: T(2), 'modelos-suplemento/b': T(2) },
      excluidos: { 'modelos-suplemento/a': T(5) },
    })
  })

  it('CB-170: o plano e o índice que somem da cópia saem daqui, como antes', () => {
    const arm = aparelhoNovo()
    arm.setItem('metanutri:casos', '["p1"]')
    arm.setItem('metanutri:caso:p1', plano('p1', 'Plano da Ana'))
    const semPlanos = copia({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana')]), [ROTEIRO]: roteiro, [MODELOS]: arm.getItem(MODELOS) ?? '' })
    expect(aplicarCopia(arm, semPlanos).mantidas).toEqual([])
    expect(arm.getItem('metanutri:caso:p1')).toBeNull()
    expect(arm.getItem('metanutri:casos')).toBeNull()
  })

  it('o arquivo dos links mantido tira só os links com lápide e as marcas deles', () => {
    const arm = new Memoria()
    const link = (id: string) => ({ id, token: `t-${id}`, casoId: 'p1', nome: id, criadoEm: T(1), missoes: [], marcacoes: [] })
    arm.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [link('l1'), link('l2')], naNuvem: ['l1', 'l2'], pendentes: [] }))
    const aplicada = aplicarCopia(arm, copia({ [CHAVE_MUDANCAS]: mudancas({}, { 'acompanhamentos/l1': T(5) }) }))
    expect(aplicada.mantidas).toEqual(['metanutri:acompanhamentos'])
    expect(JSON.parse(arm.getItem('metanutri:acompanhamentos') ?? '{}')).toEqual({ formato: 1, itens: [link('l2')], naNuvem: ['l2'], pendentes: [] })
  })
})

describe('D-171: salvar um item não mexe nos outros', () => {
  it('CA-594: a ficha da Ana editada em A continua quando B, desatualizado, salva a Bia', () => {
    const fichaAntiga = (id: string, nome: string, atualizadoEm: string) => ({
      id,
      nome,
      sexo: null,
      nascimento: null,
      telefone: '',
      email: '',
      objetivo: '',
      restricoes: '',
      condicoesClinicas: '',
      medicamentos: '',
      anamnese: '',
      observacoes: '',
      criadoEm: '2026-10-01T00:00:00.000Z',
      atualizadoEm,
    })
    // O aparelho B guardou as duas fichas antes das novidades e ainda não trouxe a edição que A fez na Ana às 10:01.
    const b = new Memoria()
    b.setItem('metanutri:pacientes', JSON.stringify([fichaAntiga('ana', 'Ana', '2026-10-10T00:00:00.000Z'), fichaAntiga('bia', 'Bia', '2026-10-10T00:00:00.000Z')]))
    const agora = () => '2026-10-16T10:05:00.000Z'
    const observado: Armazenamento = {
      getItem: (k) => b.getItem(k),
      setItem: (k, v) => {
        const antes = b.getItem(k)
        b.setItem(k, v)
        registrarMudanca(b, k, antes, v, agora())
      },
      removeItem: (k) => b.removeItem(k),
    }
    const repo = criarRepositorioPacientes(observado, { agora })
    const bia = repo.obter('bia')
    if (!bia) throw new Error('Bia sumiu')
    repo.salvar({ ...bia, objetivo: 'Ganhar massa' })
    expect(lerMudancas(b.getItem(CHAVE_MUDANCAS)).alterados).toEqual({ 'pacientes/bia': '2026-10-16T10:05:00.000Z' })

    const daNuvem = copia({
      'metanutri:pacientes': JSON.stringify([{ ...fichaAntiga('ana', 'Ana', '2026-10-16T10:01:00.000Z'), restricoes: 'lactose' }, fichaAntiga('bia', 'Bia', '2026-10-10T00:00:00.000Z')]),
      [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': '2026-10-16T10:01:00.000Z' }),
    })
    const junta = juntarCopias(copia(Object.fromEntries(b.dados)), daNuvem, '2026-10-16T10:06:00.000Z')
    const fichas = lista(junta, 'metanutri:pacientes') as { id: string; restricoes: string; objetivo: string }[]
    expect(fichas.find((p) => p.id === 'ana')?.restricoes).toBe('lactose')
    expect(fichas.find((p) => p.id === 'bia')?.objetivo).toBe('Ganhar massa')
  })
})
describe('D-173: um aparelho nunca sobe um valor mais velho que a marca que a nuvem conhece', () => {
  const ROTEIRO = 'metanutri:roteiro-anamnese'
  const MODELOS = 'metanutri:modelos-suplemento'
  const rot = (texto: string) => JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'q', texto }] } })
  const textoDoRoteiro = (valor: string | null | undefined) =>
    valor === null || valor === undefined ? null : (JSON.parse(valor) as { blocos: { agua: { texto: string }[] } }).blocos.agua[0]?.texto
  const pacientes = (...fichas: ReturnType<typeof paciente>[]) => JSON.stringify(fichas.length > 0 ? fichas : [paciente('ana', 'Ana')])
  const ROT = `chave/${ROTEIRO}`

  /** Um aparelho com o roteiro dado e a marca dele. */
  function aparelhoComRoteiro(texto: string, quando: string): Memoria {
    const arm = new Memoria()
    arm.setItem('metanutri:pacientes', pacientes())
    arm.setItem(ROTEIRO, rot(texto))
    arm.setItem(CHAVE_MUDANCAS, mudancas({ 'pacientes/ana': T(1), [ROT]: quando }))
    return arm
  }

  /** Grava como a conta grava: com as marcas do observador. */
  const gravar = (arm: Memoria, chave: string, valor: string, quando: string) => {
    const antes = arm.getItem(chave)
    arm.setItem(chave, valor)
    registrarMudanca(arm, chave, antes, valor, quando)
  }

  /** v3: a aba antiga salvou sem o roteiro, com a marca das 4h que veio da cópia de N2. */
  const v3 = () => copia({ 'metanutri:pacientes': pacientes(), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), [ROT]: T(4) }) })

  it('CA-605: o roteiro retido não sobe ao aplicar de novo, recarregar, abrir outra aba ou receber outra cópia sem ele', () => {
    const n1 = aparelhoComRoteiro('r1 velho', T(2))
    expect(aplicarCopia(n1, v3()).mantidas).toEqual([])
    expect(textoDoRoteiro(n1.getItem(ROTEIRO))).toBe('r1 velho')
    expect(JSON.parse(n1.getItem(CHAVE_RETIDOS) ?? '{}')).toEqual({ [ROT]: T(4) })
    // Recarregar ou abrir outra aba com a mesma versão: o motor pergunta antes de aplicar.
    expect(chavesMantidas(n1, v3())).toEqual([])
    expect(aplicarCopia(n1, v3()).mantidas).toEqual([])
    // Outra cópia sem o roteiro (outra aba antiga salvou de novo).
    const v3b = copia({ ...v3().dados, 'metanutri:pacientes': pacientes(paciente('ana', 'Ana'), paciente('bia', 'Bia', T(5))) })
    expect(aplicarCopia(n1, v3b).mantidas).toEqual([])
    // A cópia que N1 sobe não leva o roteiro velho, e a nuvem continua com a marca das 4h.
    const deN1 = montarCopia(n1, T(6))
    expect(deN1.dados[ROTEIRO]).toBeUndefined()
    expect(lerMudancas(deN1.dados[CHAVE_MUDANCAS] ?? null).alterados[ROT]).toBe(T(4))

    // N2, com o roteiro das 4h, aplica e devolve; N1 e um aparelho novo ficam com ele.
    const n2 = aparelhoComRoteiro('r2 novo', T(4))
    expect(aplicarCopia(n2, deN1).mantidas).toEqual([ROTEIRO])
    const deN2 = montarCopia(n2, T(7))
    expect(textoDoRoteiro(deN2.dados[ROTEIRO])).toBe('r2 novo')
    aplicarCopia(n1, deN2)
    expect(textoDoRoteiro(n1.getItem(ROTEIRO))).toBe('r2 novo')
    expect(n1.getItem(CHAVE_RETIDOS)).toBeNull()
    const novo = new Memoria()
    aplicarCopia(novo, deN2)
    expect(textoDoRoteiro(novo.getItem(ROTEIRO))).toBe('r2 novo')
  })

  it('CA-606: N1 edita um paciente com o roteiro retido: a cópia sobe sem o roteiro velho, e N2 o devolve', () => {
    const n1 = aparelhoComRoteiro('r1 velho', T(2))
    aplicarCopia(n1, v3())
    gravar(n1, 'metanutri:pacientes', pacientes({ ...paciente('ana', 'Ana Souza', T(6)) }), T(6))
    const deN1 = montarCopia(n1, T(6))
    expect(deN1.dados[ROTEIRO]).toBeUndefined()
    expect(lerMudancas(deN1.dados[CHAVE_MUDANCAS] ?? null).alterados).toMatchObject({ [ROT]: T(4), 'pacientes/ana': T(6) })

    const n2 = aparelhoComRoteiro('r2 novo', T(4))
    expect(aplicarCopia(n2, deN1).mantidas).toEqual([ROTEIRO])
    const deN2 = montarCopia(n2, T(7))
    expect(textoDoRoteiro(deN2.dados[ROTEIRO])).toBe('r2 novo')
    expect(nomes(deN2, 'metanutri:pacientes')).toEqual(['Ana Souza'])
  })

  it('CA-609: a pessoa edita o roteiro retido em N1: a edição dela sobe como qualquer edição', () => {
    const n1 = aparelhoComRoteiro('r1 velho', T(2))
    aplicarCopia(n1, v3())
    gravar(n1, ROTEIRO, rot('r1 editado'), T(8))
    expect(n1.getItem(CHAVE_RETIDOS)).toBeNull()
    const deN1 = montarCopia(n1, T(8))
    expect(textoDoRoteiro(deN1.dados[ROTEIRO])).toBe('r1 editado')
    expect(lerMudancas(deN1.dados[CHAVE_MUDANCAS] ?? null).alterados[ROT]).toBe(T(8))
    // Com a marca mais nova, a edição dela vence o roteiro das 4h de N2.
    const n2 = aparelhoComRoteiro('r2 novo', T(4))
    aplicarCopia(n2, deN1)
    expect(textoDoRoteiro(n2.getItem(ROTEIRO))).toBe('r1 editado')
  })
  describe('listas, item por item (DP-40)', () => {
    const modelo = (id: string, nome: string, quando: string) => ({ id, nome, dose: '', horario: '', duracao: '', observacao: '', criadoEm: T(1), atualizadoEm: quando })
    const nomesAqui = (arm: Memoria) => nomes(copia({ [MODELOS]: arm.getItem(MODELOS) ?? '[]' }), MODELOS).sort()
    function comModelos(itens: ReturnType<typeof modelo>[], marcas: Record<string, string>): Memoria {
      const arm = new Memoria()
      arm.setItem('metanutri:pacientes', pacientes())
      arm.setItem(MODELOS, JSON.stringify(itens))
      arm.setItem(CHAVE_MUDANCAS, mudancas({ 'pacientes/ana': T(1), ...marcas }))
      return arm
    }

    it('CA-604: N1 com o "a" velho e o "b" igual aplica a cópia da aba antiga: o "a" velho não sobe, N2 fica com o "a" novo e um aparelho novo o recebe', () => {
      const n2 = comModelos([modelo('a', 'Ferro NOVO', T(5)), modelo('b', 'Zinco', T(2))], { 'modelos-suplemento/a': T(5), 'modelos-suplemento/b': T(2) })
      const n1 = comModelos([modelo('a', 'Ferro velho', T(2)), modelo('b', 'Zinco', T(2))], { 'modelos-suplemento/a': T(2), 'modelos-suplemento/b': T(2) })
      const w3 = copia({ 'metanutri:pacientes': pacientes(), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), 'modelos-suplemento/a': T(5), 'modelos-suplemento/b': T(2) }) })

      aplicarCopia(n1, w3)
      expect(nomesAqui(n1)).toEqual(['Ferro velho', 'Zinco'])
      const w4 = montarCopia(n1, T(6))
      expect(nomes(w4, MODELOS)).toEqual(['Zinco'])
      expect(lerMudancas(w4.dados[CHAVE_MUDANCAS] ?? null).alterados['modelos-suplemento/a']).toBe(T(5))
      // Recarregar com a cópia que N1 mandou: o "a" velho continua retido.
      expect(chavesMantidas(n1, w4)).toEqual([])

      // N2 aplica a lista sem o "a": o "a" novo fica e volta para a nuvem.
      expect(aplicarCopia(n2, w4).mantidas).toEqual([MODELOS])
      expect(nomesAqui(n2)).toEqual(['Ferro NOVO', 'Zinco'])
      const w5 = montarCopia(n2, T(7))
      expect(nomes(w5, MODELOS).sort()).toEqual(['Ferro NOVO', 'Zinco'])

      const novo = new Memoria()
      aplicarCopia(novo, w5)
      expect(nomesAqui(novo)).toEqual(['Ferro NOVO', 'Zinco'])
      aplicarCopia(n1, w5)
      expect(nomesAqui(n1)).toEqual(['Ferro NOVO', 'Zinco'])
      expect(n1.getItem(CHAVE_RETIDOS)).toBeNull()
    })

    it('CA-604: o item que falta numa lista da cópia, sem marca nem lápide, segue a cópia (fluxo de antes)', () => {
      const arm = comModelos([modelo('a', 'Ferro', T(2)), modelo('b', 'Zinco', T(2))], { 'modelos-suplemento/a': T(2), 'modelos-suplemento/b': T(2) })
      const semOA = copia({ 'metanutri:pacientes': pacientes(), [MODELOS]: JSON.stringify([modelo('b', 'Zinco', T(2))]), [CHAVE_MUDANCAS]: mudancas({ 'pacientes/ana': T(1), 'modelos-suplemento/b': T(2) }) })
      expect(aplicarCopia(arm, semOA).mantidas).toEqual([])
      expect(nomesAqui(arm)).toEqual(['Zinco'])
    })
  })
})