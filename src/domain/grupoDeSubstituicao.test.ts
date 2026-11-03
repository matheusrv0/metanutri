// Spec busca-substitutos, D-1108 e seção 3: o grupo de substituição de cada alimento ("Só do mesmo grupo").
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { grupoDeSubstituicao, noMesmoGrupo } from './grupoDeSubstituicao.ts'
import { buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)

const porId = (id: number): Alimento => {
  const a = buscarAlimento(id)
  if (!a) throw new Error(`sem o alimento ${id}`)
  return a
}
const porNome = (nome: string): Alimento => {
  const a = BASE.find((x) => x.descricao === nome)
  if (!a) throw new Error(`sem ${nome} na base ampliada`)
  return a
}
const grupo = (id: number) => grupoDeSubstituicao(porId(id)).id

beforeEach(() => registrarBaseAmpliada(BASE))
afterEach(() => registrarBaseAmpliada([]))

describe('D-1108: o grupo de substituição', () => {
  it('cereais, tubérculos e raízes: o acompanhamento das trocas e o cozido da base ampliada', () => {
    // Arroz tipo 1 e integral, cuscuz, polenta, mandioca, batatas e cará cozidos.
    for (const id of [3, 1, 533, 62, 129, 91, 88, 86, 102]) expect(grupo(id)).toBe('amido')
    expect(grupoDeSubstituicao(porId(3)).nome).toBe('cereais, tubérculos e raízes')
    for (const nome of ['Macarrão, trigo, cozido', 'Arroz, parboilizado, cozido', 'Quinoa, cozida', 'Inhame, cozido', 'Milho, verde, cozido', 'Batata, inglesa, com casca, assada']) {
      expect(grupoDeSubstituicao(porNome(nome)).id).toBe('amido')
    }
  })

  it('pães, cereais do café, leguminosas, carnes, ovos e queijos, leites, frutas, verduras e oleaginosas', () => {
    expect(grupoDeSubstituicao(porId(53))).toEqual({ id: 'pao', nome: 'pães e torradas' })
    expect(grupoDeSubstituicao(porId(7))).toEqual({ id: 'cereal-do-cafe', nome: 'cereais do café' })
    expect(grupoDeSubstituicao(porId(561))).toEqual({ id: 'leguminosa', nome: 'leguminosas' })
    expect(grupo(577)).toBe('leguminosa')
    // Frango e peixe no mesmo grupo.
    expect(grupoDeSubstituicao(porId(410))).toEqual({ id: 'carne', nome: 'carnes, aves e peixes' })
    expect(grupo(301)).toBe('carne')
    // Ovo e queijo juntos; leite e iogurte juntos.
    expect(grupoDeSubstituicao(porId(488))).toEqual({ id: 'ovo-queijo', nome: 'ovos e queijos' })
    expect(grupo(461)).toBe('ovo-queijo')
    expect(grupoDeSubstituicao(porId(448))).toEqual({ id: 'leite', nome: 'leites e iogurtes' })
    expect(grupo(458)).toBe('leite')
    expect(grupoDeSubstituicao(porId(182))).toEqual({ id: 'fruta', nome: 'frutas' })
    expect(grupoDeSubstituicao(porId(100))).toEqual({ id: 'verdura', nome: 'verduras e legumes' })
    expect(grupoDeSubstituicao(porId(589))).toEqual({ id: 'oleaginosa', nome: 'castanhas, sementes e amendoim' })
  })

  it('amendoim vai para as oleaginosas e o extrato de soja para os leites, fora das leguminosas', () => {
    expect(grupo(558)).toBe('oleaginosa')
    expect(grupo(582)).toBe('leite')
  })

  it('batata e mandioca, que a TACO põe entre as verduras, são do amido e não das verduras', () => {
    expect(grupo(91)).toBe('amido')
    expect(grupo(129)).toBe('amido')
  })

  it('fora dos grupos, o grupo da tabela em minúsculas', () => {
    expect(grupoDeSubstituicao(porId(260))).toEqual({ id: 'Gorduras e óleos', nome: 'gorduras e óleos' })
  })
})

describe('D-1108: "Só do mesmo grupo", com as regras de forma das trocas', () => {
  it('CA-2111: arroz aceita batata e não aceita fruta', () => {
    const doArroz = noMesmoGrupo(porId(3))
    expect(doArroz(porId(91))).toBe(true)
    expect(doArroz(porId(182))).toBe(false)
  })

  it('CA-2112: ovo inteiro só por ovo inteiro, gema só por gema, clara só por clara', () => {
    const doOvo = noMesmoGrupo(porId(488))
    expect(doOvo(porId(461))).toBe(true)
    expect(doOvo(porId(486))).toBe(false)
    expect(doOvo(porId(487))).toBe(false)
    expect(noMesmoGrupo(porId(486))(porId(487))).toBe(false)
    // O queijo troca com o ovo inteiro, nunca com a gema.
    expect(noMesmoGrupo(porId(461))(porId(488))).toBe(true)
    expect(noMesmoGrupo(porId(461))(porId(487))).toBe(false)
  })

  it('CA-2112: verdura cozida só por verdura cozida', () => {
    const doBrocolis = noMesmoGrupo(porId(100))
    expect(doBrocolis(porId(109))).toBe(true)
    expect(doBrocolis(porId(110))).toBe(false)
    expect(doBrocolis(porId(78))).toBe(false)
  })

  it('acompanhamento pronto só por pronto: o arroz cozido não aceita o arroz cru', () => {
    expect(noMesmoGrupo(porId(3))(porId(4))).toBe(false)
    expect(noMesmoGrupo(porId(3))(porId(5))).toBe(true)
  })
})
