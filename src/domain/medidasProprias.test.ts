// Spec alimentos-e-gramaturas, D-387: medidas próprias para alimentos da base, com junção entre aparelhos.
import { buscarAlimentos, medidasDoAlimento, registrarMedidasProprias } from './busca.ts'
import { juntarCopias, montarCopia, registrarMudanca, CHAVE_MUDANCAS, lerMudancas } from './copiaDaConta.ts'
import { armazenamentoDaConta } from './armazenamentoDaConta.ts'
import { CHAVE_DONO, migrarDadosSemConta } from './donoDosDados.ts'
import { criarRepositorioMedidasProprias, CHAVE_MEDIDAS_PROPRIAS, idDaMedida, validarMedidaPropria } from './medidasProprias.ts'
import { medidaNaLinha } from './medidaDoItem.ts'
import { CHAVES_DE_DADOS, type Backup } from './perfil.ts'
import type { Armazenamento, ArmazenamentoListavel } from './persistencia.ts'
import { ALIMENTOS } from './tabelas.ts'

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

const FEIJAO = 561
const T = (hora: number) => `2026-10-21T${String(hora).padStart(2, '0')}:00:00.000Z`

afterEach(() => registrarMedidasProprias([]))

describe('repositório das medidas próprias', () => {
  it('salva, troca a do mesmo nome e guarda a criação; exclui', () => {
    const memoria = new Memoria()
    let hora = 1
    const repo = criarRepositorioMedidasProprias(memoria, () => T(hora++))
    const concha = repo.salvar({ alimentoId: FEIJAO, nome: 'Concha', gramas: 120 })
    expect(concha).toMatchObject({ id: '561:concha', alimentoId: FEIJAO, nome: 'Concha', gramas: 120, criadoEm: T(1), atualizadoEm: T(1) })
    const mudada = repo.salvar({ alimentoId: FEIJAO, nome: 'concha', gramas: 130 })
    expect(mudada).toMatchObject({ id: '561:concha', gramas: 130, criadoEm: T(1), atualizadoEm: T(2) })
    expect(repo.doAlimento(FEIJAO)).toHaveLength(1)
    repo.excluir('561:concha')
    expect(repo.listar()).toEqual([])
  })

  it('CB-370: preserva o item estragado e o campo que esta versão não conhece', () => {
    const memoria = new Memoria()
    memoria.setItem(CHAVE_MEDIDAS_PROPRIAS, JSON.stringify([{ id: 'x' }, { id: '561:concha', alimentoId: FEIJAO, nome: 'concha', gramas: 120, criadoEm: T(1), atualizadoEm: T(1), novo: 'sim' }]))
    const repo = criarRepositorioMedidasProprias(memoria, () => T(5))
    expect(repo.listar()).toHaveLength(1)
    repo.salvar({ alimentoId: FEIJAO, nome: 'concha', gramas: 125 })
    const gravado = JSON.parse(memoria.getItem(CHAVE_MEDIDAS_PROPRIAS) ?? '[]') as Record<string, unknown>[]
    expect(gravado[0]).toEqual({ id: 'x' })
    expect(gravado[1]).toMatchObject({ gramas: 125, novo: 'sim', criadoEm: T(1) })
  })

  it('CB-372: nome vazio, peso fora de 0 a 2.000 e alimento próprio não salvam', () => {
    expect(validarMedidaPropria({ alimentoId: FEIJAO, nome: ' ', gramas: 10 }).map((p) => p.campo)).toEqual(['nome'])
    expect(validarMedidaPropria({ alimentoId: FEIJAO, nome: 'pote', gramas: 0 }).map((p) => p.campo)).toEqual(['gramas'])
    expect(validarMedidaPropria({ alimentoId: FEIJAO, nome: 'pote', gramas: 2001 }).map((p) => p.campo)).toEqual(['gramas'])
    expect(validarMedidaPropria({ alimentoId: 900_001, nome: 'pote', gramas: 10 }).map((p) => p.campo)).toEqual(['alimento'])
    expect(() => criarRepositorioMedidasProprias(new Memoria()).salvar({ alimentoId: FEIJAO, nome: '', gramas: 10 })).toThrow(RangeError)
  })

  it('CB-376: sem armazenamento, vale só na aba', () => {
    const repo = criarRepositorioMedidasProprias(null)
    repo.salvar({ alimentoId: FEIJAO, nome: 'concha', gramas: 120 })
    expect(repo.persistente).toBe(false)
    expect(criarRepositorioMedidasProprias(null).doAlimento(FEIJAO)).toHaveLength(1)
  })
})

describe('as medidas próprias na busca e na linha', () => {
  it('CA-1158 e CA-1160: a própria vem primeiro, marcada, e vale no lugar da POF de mesmo nome', () => {
    registrarMedidasProprias([{ alimentoId: FEIJAO, nome: 'concha', gramas: 120 }])
    const medidas = medidasDoAlimento(FEIJAO)
    expect(medidas[0]).toEqual({ nome: 'concha', gramas: 120, propria: true })
    expect(medidas.filter((m) => m.nome === 'concha')).toHaveLength(1)
    expect(buscarAlimentos('1 concha de feijão', ALIMENTOS).resultados[0]).toMatchObject({ gramas: 120, medida: { nome: 'concha', gramasPorMedida: 120 } })
  })

  it('a entrada entende o nome de uma medida que só a conta tem', () => {
    registrarMedidasProprias([{ alimentoId: FEIJAO, nome: 'cumbuca grande', gramas: 300 }])
    expect(buscarAlimentos('1 cumbuca grande de feijão', ALIMENTOS).resultados[0]).toMatchObject({ gramas: 300 })
  })

  it('CA-1162: o item do plano guarda uma cópia; mudar ou excluir a medida própria não muda o item', () => {
    registrarMedidasProprias([{ alimentoId: FEIJAO, nome: 'concha', gramas: 120 }])
    const item = { id: 'i', alimentoId: FEIJAO, gramas: 120, medida: { nome: 'concha', quantidade: 1, gramasPorMedida: 120 } }
    registrarMedidasProprias([])
    expect(medidaNaLinha(item)).toMatchObject({ nome: 'concha', gramasPorMedida: 120, quantidade: 1, aproximada: false })
  })

  it('CB-373: a medida de alimento que saiu da base fica guardada e não aparece', () => {
    registrarMedidasProprias([{ alimentoId: 9999, nome: 'concha', gramas: 120 }])
    expect(medidasDoAlimento(FEIJAO).some((m) => m.propria)).toBe(false)
  })
})

describe('as medidas próprias vão para a nuvem (CA-1161, D-170 a D-173)', () => {
  const medida = (nome: string, gramas: number, atualizadoEm: string) => ({ id: idDaMedida(FEIJAO, nome), alimentoId: FEIJAO, nome, gramas, criadoEm: T(1), atualizadoEm })
  const copia = (dados: Record<string, string>): Backup => ({ formato: 1, geradoEm: T(0), dados })
  const lista = (c: Backup) => JSON.parse(c.dados[CHAVE_MEDIDAS_PROPRIAS] ?? '[]') as { nome: string; gramas: number }[]

  it('a chave é dado da conta e sobe na cópia', () => {
    expect(CHAVES_DE_DADOS).toContain(CHAVE_MEDIDAS_PROPRIAS)
    const memoria = new Memoria()
    criarRepositorioMedidasProprias(memoria).salvar({ alimentoId: FEIJAO, nome: 'concha', gramas: 120 })
    expect(montarCopia(memoria, T(2)).dados[CHAVE_MEDIDAS_PROPRIAS]).toContain('561:concha')
  })

  it('cada medida muda e sai com marca e lápide', () => {
    const memoria = new Memoria()
    const antes = JSON.stringify([medida('concha', 120, T(1))])
    registrarMudanca(memoria, CHAVE_MEDIDAS_PROPRIAS, antes, JSON.stringify([medida('pote', 200, T(2))]), T(2))
    expect(lerMudancas(memoria.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'medidas-proprias/561:pote': T(2) }, excluidos: { 'medidas-proprias/561:concha': T(2) } })
  })

  it('duas cópias com medidas diferentes ficam com as duas; a mais nova vence no mesmo id; a excluída não volta', () => {
    const daqui = copia({ [CHAVE_MEDIDAS_PROPRIAS]: JSON.stringify([medida('concha', 130, T(3)), medida('pote', 200, T(1))]) })
    const nuvem = copia({
      [CHAVE_MEDIDAS_PROPRIAS]: JSON.stringify([medida('concha', 120, T(2)), medida('xícara', 160, T(2))]),
      [CHAVE_MUDANCAS]: JSON.stringify({ alterados: {}, excluidos: { 'medidas-proprias/561:pote': T(4) } }),
    })
    const junta = juntarCopias(daqui, nuvem, T(5))
    expect(lista(junta).map((m) => `${m.nome} ${m.gramas}`).sort()).toEqual(['concha 130', 'xícara 160'])
  })

  it('a migração dos dados de antes da conta junta pelo id e fica com a da conta', () => {
    const dados = new Map<string, string>([
      [CHAVE_DONO, 'conta-a'],
      ['metanutri:conta:conta-a:medidas-proprias', JSON.stringify([medida('concha', 130, T(3))])],
      [CHAVE_MEDIDAS_PROPRIAS, JSON.stringify([medida('concha', 120, T(2)), medida('pote', 200, T(2))])],
    ])
    const arm: ArmazenamentoListavel = {
      get length() {
        return dados.size
      },
      key: (i) => [...dados.keys()][i] ?? null,
      getItem: (c) => dados.get(c) ?? null,
      setItem: (c, v) => void dados.set(c, v),
      removeItem: (c) => void dados.delete(c),
    }
    migrarDadosSemConta(arm, 'conta-a')
    const junta = JSON.parse(armazenamentoDaConta(arm, 'conta-a').getItem(CHAVE_MEDIDAS_PROPRIAS) ?? '[]') as { nome: string; gramas: number }[]
    expect(junta.map((m) => `${m.nome} ${m.gramas}`)).toEqual(['concha 130', 'pote 200'])
  })
})
