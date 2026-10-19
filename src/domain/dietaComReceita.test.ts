// Spec receitas-com-calculo, D-278: a receita na dieta do link (CA-883 a CA-885).
import { criarCasoVazio } from './caso.ts'
import { copiarDieta, dietaDoPlano, dietaMudou, lerDieta, temDieta } from './dietaDoLink.ts'
import { adicionarReceita, atualizarGramas, criarPlanoPadrao } from './plano.ts'
import { PANQUECA } from './receitas.test-utils.ts'
import type { Caso, Plano } from './tipos.ts'

let n = 0
const ids = () => `id${++n}`

const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', ...p })

function comPanqueca(gramas = 120): Plano {
  const plano = criarPlanoPadrao(ids)
  const desjejum = plano.refeicoes[0]
  if (!desjejum) throw new Error('plano padrão mudou')
  return adicionarReceita(plano, desjejum.id, 'principal', { receita: PANQUECA, gramas }, ids)
}

const RECEITA_NO_LINK = {
  nome: 'Panqueca de banana',
  rendimento: 'Rende 2 unidades (120 g cada)',
  ingredientes: [
    { medida: '2 unidades', gramas: 150, alimento: 'Banana, prata, crua' },
    { medida: null, gramas: 100, alimento: 'Ovo, de galinha, inteiro, cru' },
    { medida: '2 colheres de sopa', gramas: 30, alimento: 'Aveia, flocos, crua' },
  ],
  preparo: PANQUECA.preparo,
}

describe('a receita na dieta do link', () => {
  it('CA-883: na refeição, a receita é um item com a porção, o peso e o nome dela', () => {
    const dieta = dietaDoPlano(caso(), comPanqueca())
    expect(dieta.refeicoes[0]?.opcoes[0]).toEqual([{ medida: '1 unidade', gramas: 120, alimento: 'Panqueca de banana' }])
  })

  it('CA-884: a cópia leva cada receita do plano, inteira, em texto', () => {
    const dieta = dietaDoPlano(caso(), comPanqueca())
    expect(dieta.receitasDoPlano).toEqual([RECEITA_NO_LINK])
    expect(copiarDieta(dieta, '2026-10-19').receitasDoPlano).toEqual([RECEITA_NO_LINK])
    expect(temDieta(copiarDieta(dieta, '2026-10-19'))).toBe(true)
  })

  it('CA-884: a cópia guardada volta igual pela leitura, e receita estragada fica de fora', () => {
    const copia = copiarDieta(dietaDoPlano(caso(), comPanqueca()), '2026-10-19')
    const lida = lerDieta(JSON.parse(JSON.stringify(copia)))
    expect(lida).toEqual(copia)
    const estragada = lerDieta({ ...copia, receitasDoPlano: [RECEITA_NO_LINK, { nome: 3 }, { ...RECEITA_NO_LINK, ingredientes: 'x' }] })
    expect(estragada?.receitasDoPlano).toEqual([RECEITA_NO_LINK])
  })

  it('CA-885: plano sem receita não ganha campo novo, e o link de antes desta versão não aparece como mudado', () => {
    const semReceita = dietaDoPlano(caso({ orientacoes: 'Beber água.' }), criarPlanoPadrao(ids))
    expect('receitasDoPlano' in semReceita).toBe(false)
    const linkAntigo = lerDieta({ refeicoes: [], orientacoes: 'Beber água.', receitas: '', copiadaEm: '2026-10-01' })
    expect(linkAntigo).not.toBeNull()
    expect(linkAntigo && 'receitasDoPlano' in linkAntigo).toBe(false)
    expect(linkAntigo && dietaMudou(linkAntigo, semReceita)).toBe(false)
  })

  it('CA-885: pôr, mudar a quantidade ou tirar a receita conta como mudança', () => {
    const plano = comPanqueca()
    const noLink = copiarDieta(dietaDoPlano(caso(), plano), '2026-10-19')
    expect(dietaMudou(noLink, dietaDoPlano(caso(), plano))).toBe(false)
    const desjejum = plano.refeicoes[0]
    const item = desjejum?.opcoes.principal[0]
    if (!desjejum || !item) throw new Error('plano sem a receita')
    expect(dietaMudou(noLink, dietaDoPlano(caso(), atualizarGramas(plano, desjejum.id, 'principal', item.id, 240)))).toBe(true)
    expect(dietaMudou(noLink, dietaDoPlano(caso(), criarPlanoPadrao(ids)))).toBe(true)
    const semNada = copiarDieta(dietaDoPlano(caso(), criarPlanoPadrao(ids)), '2026-10-19')
    expect(dietaMudou(semNada, dietaDoPlano(caso(), plano))).toBe(true)
  })
})
