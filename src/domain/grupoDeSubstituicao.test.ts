// Spec busca-substitutos, D-1108 e seção 3: o grupo de substituição de cada alimento ("Só do mesmo grupo").
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { buscarSubstitutos } from './buscaDeSubstitutos.ts'
import { grupoDeSubstituicao, noMesmoGrupo } from './grupoDeSubstituicao.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

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

  it('CA-2112 e CA-2139 (revisão rodada 2, M2): o queijo só troca com o ovo inteiro, nos dois sentidos', () => {
    const queijos = [461, 469]
    for (const queijo of queijos) {
      // No lugar do queijo: o ovo inteiro, nem a clara nem a gema.
      expect(noMesmoGrupo(porId(queijo))(porId(488))).toBe(true)
      expect(noMesmoGrupo(porId(queijo))(porId(486))).toBe(false)
      expect(noMesmoGrupo(porId(queijo))(porId(487))).toBe(false)
      // No lugar do ovo: o queijo só no do inteiro.
      expect(noMesmoGrupo(porId(488))(porId(queijo))).toBe(true)
      expect(noMesmoGrupo(porId(486))(porId(queijo))).toBe(false)
      expect(noMesmoGrupo(porId(487))(porId(queijo))).toBe(false)
    }
    // Queijo por queijo continua.
    expect(noMesmoGrupo(porId(461))(porId(469))).toBe(true)
  })

  it('CA-2144 (D-1131): fruta inteira só por fruta inteira; no lugar do suco, a fruta inteira entra', () => {
    const BANANA = 182
    const LARANJA_PERA = 214
    const SUCO_DE_LARANJA = 215
    const POLPA_DE_ACEROLA = 170
    expect(noMesmoGrupo(porId(BANANA))(porId(SUCO_DE_LARANJA))).toBe(false)
    expect(noMesmoGrupo(porId(BANANA))(porId(POLPA_DE_ACEROLA))).toBe(false)
    expect(noMesmoGrupo(porId(BANANA))(porId(LARANJA_PERA))).toBe(true)
    expect(noMesmoGrupo(porId(SUCO_DE_LARANJA))(porId(LARANJA_PERA))).toBe(true)
    expect(noMesmoGrupo(porId(SUCO_DE_LARANJA))(porId(POLPA_DE_ACEROLA))).toBe(true)
  })

  it('CA-2139: na busca, clara por proteína e gema por lipídeos sem nenhum queijo; o ovo inteiro com queijo', () => {
    const queijos = (id: number, nutriente: ChaveNutrienteAlimento, gramas = 100) => {
      const r = buscarSubstitutos({ alimentoId: id, gramas }, { nutrientes: [nutriente], mesmoGrupo: true, alimentos: alimentosParaSugerir(), limite: 1000 }, buscarAlimento)
      if (r.tipo !== 'lista') throw new Error(r.motivo)
      return r.candidatos.filter((c) => /^Queijo,/.test(c.alimento.descricao.trim())).map((c) => c.alimento.descricao)
    }
    expect(queijos(486, 'proteina_g')).toEqual([])
    expect(queijos(487, 'lipideos_g')).toEqual([])
    expect(queijos(488, 'lipideos_g', 50).length).toBeGreaterThan(0)
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
