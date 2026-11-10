// Spec busca-substitutos, D-1122, CA-2130 e CB-1110 (revisão independente de 03/11/2026, achado 3): a opção do item que
// é alimento da base ampliada segura o plano até a base chegar (D-711) e guarda uma cópia do nome.
import { descreverItem } from '../export/aconselhamento-docx.ts'
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, planoUsaBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { criarCasoVazio } from './caso.ts'
import { dietaDoPlano } from './dietaDoLink.ts'
import { opcoesNaFolha } from './folhaDieta.ts'
import { lerOpcoesDoItem } from './opcoesDoItem.ts'
import { adicionarItem, adicionarOpcaoAoItem, criarPlanoPadrao } from './plano.ts'
import { textoDaQuantidade } from './quantidadeNaFolha.ts'
import { buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import type { ItemPlano, Plano } from './tipos.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
const MACARRAO = BASE.find((a) => a.descricao === 'Macarrão, trigo, cozido')
let n = 0
const ids = () => `id${++n}`

function planoComOpcao(alimentoId: number): { plano: Plano; arroz: ItemPlano } {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')
  if (!almoco) throw new Error('sem almoço')
  plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150, medida: null }, ids)
  const itemId = plano.refeicoes.find((r) => r.id === almoco.id)?.opcoes.principal[0]?.id ?? ''
  plano = adicionarOpcaoAoItem(plano, almoco.id, itemId, { alimentoId, gramas: 140, medida: null })
  const arroz = plano.refeicoes.find((r) => r.id === almoco.id)?.opcoes.principal[0]
  if (!arroz) throw new Error('sem arroz')
  return { plano, arroz }
}

beforeEach(() => registrarBaseAmpliada(BASE))
afterEach(() => registrarBaseAmpliada([]))

describe('D-1122: a opção da base ampliada', () => {
  it('CA-2130: o plano cuja opção é da base ampliada espera a base para abrir (D-711)', () => {
    if (!MACARRAO) throw new Error('sem macarrão')
    expect(planoUsaBaseAmpliada(planoComOpcao(MACARRAO.id).plano)).toBe(true)
    expect(planoUsaBaseAmpliada(planoComOpcao(91).plano)).toBe(false)
  })

  it('CA-2130: a opção da base ampliada guarda a cópia do nome; a da TACO, não', () => {
    if (!MACARRAO) throw new Error('sem macarrão')
    const [daAmpliada] = lerOpcoesDoItem(planoComOpcao(MACARRAO.id).arroz)
    expect(daAmpliada?.copia).toEqual({ descricao: 'Macarrão, trigo, cozido', paciente: MACARRAO.ampliada?.nomeParaPaciente })
    const [daTaco] = lerOpcoesDoItem(planoComOpcao(91).arroz)
    expect(daTaco && 'copia' in daTaco).toBe(false)
  })

  it('CA-2130 e CB-1110: sem a base, a folha, o link e o Word mostram a opção pela cópia, em gramas', () => {
    if (!MACARRAO) throw new Error('sem macarrão')
    const { plano, arroz } = planoComOpcao(MACARRAO.id)
    registrarBaseAmpliada([])
    const naFolha = opcoesNaFolha(arroz, buscarAlimento, 'medida-e-gramas')
    expect(naFolha.map((l) => `${l.nome} · ${textoDaQuantidade(l.quantidade)}`)).toEqual([`${MACARRAO.ampliada?.nomeParaPaciente} · 140 g`])
    expect(descreverItem(arroz, buscarAlimento, 'gramas')).toBe('Arroz, tipo 1, cozido (150 g) ou Macarrão, trigo, cozido (140 g)')
    const item = dietaDoPlano(criarCasoVazio('c'), plano, buscarAlimento).refeicoes.find((r) => r.nome === 'Almoço')?.opcoes[0]?.[0]
    expect(item?.ou?.map((o) => o.alimento)).toEqual([MACARRAO.ampliada?.nomeParaPaciente])
  })

  it('CB-1110: a opção gravada sem a cópia some sem a base, como o item excluído', () => {
    if (!MACARRAO) throw new Error('sem macarrão')
    const { arroz } = planoComOpcao(MACARRAO.id)
    const semCopia: ItemPlano = { ...arroz, opcoesDoItem: lerOpcoesDoItem(arroz).map(({ alimentoId, gramas }) => ({ alimentoId, gramas, medida: null })) }
    registrarBaseAmpliada([])
    expect(opcoesNaFolha(semCopia, buscarAlimento)).toEqual([])
  })

  it('CB-1101: a cópia estragada é ignorada', () => {
    const estragado = { id: 'x', alimentoId: 3, gramas: 150, opcoesDoItem: [{ alimentoId: 100_010, gramas: 100, copia: { descricao: 3, paciente: '' } }] } as unknown as ItemPlano
    const [opcao] = lerOpcoesDoItem(estragado)
    expect(opcao && 'copia' in opcao).toBe(false)
  })
})
