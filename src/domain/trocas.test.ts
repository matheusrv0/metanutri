import { criarExemplo } from './exemplo.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import { FORMA_DE_INGREDIENTE, NUNCA_APARECE } from './naoProposto.test-utils.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { trocasDoAlimento, trocasDoPlano } from './trocas.ts'

const contador = () => {
  let n = 0
  return () => `t-${++n}`
}

const opcoes = { alimentos: ALIMENTOS }
const porDescricao = (descricao: string) => {
  const a = ALIMENTOS.find((x) => x.descricao === descricao)
  if (!a) throw new Error(`Alimento "${descricao}" não existe na tabela.`)
  return a
}

describe('Trocas por grupo', () => {
  it('só sugere alimento da mesma categoria', () => {
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    const trocas = trocasDoAlimento({ alimentoId: arroz.id, gramas: 150 }, opcoes)
    expect(trocas.length).toBeGreaterThan(0)
    for (const t of trocas) {
      expect(buscarAlimento(t.alimentoId)?.categoria).toBe(arroz.categoria)
    }
  })

  it('a porção sugerida tem a mesma energia da original, com arredondamento de grama', () => {
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    const kcalOriginal = ((arroz.nutrientes.energia_kcal ?? 0) * 150) / 100
    for (const t of trocasDoAlimento({ alimentoId: arroz.id, gramas: 150 }, opcoes)) {
      const kcalTroca = ((buscarAlimento(t.alimentoId)?.nutrientes.energia_kcal ?? 0) * t.gramas) / 100
      expect(Math.abs(kcalTroca - kcalOriginal)).toBeLessThan(kcalOriginal * 0.02 + 2)
    }
  })

  it('respeita a restrição do paciente', () => {
    const leite = porDescricao('Queijo, minas, frescal')
    const comQueijo = trocasDoAlimento({ alimentoId: leite.id, gramas: 30 }, opcoes)
    const semQueijo = trocasDoAlimento({ alimentoId: leite.id, gramas: 30 }, { ...opcoes, restricoes: ['queijo'] })
    expect(comQueijo.length).toBeGreaterThan(0)
    expect(semQueijo.every((t) => !t.descricao.toLowerCase().includes('queijo'))).toBe(true)
  })

  it('não sugere porção fora do que alguém come', () => {
    for (const a of ALIMENTOS.slice(0, 120)) {
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes)) {
        expect(t.gramas).toBeGreaterThanOrEqual(5)
        expect(t.gramas).toBeLessThanOrEqual(600)
      }
    }
  })

  it('alimento sem energia na tabela não gera troca', () => {
    const leite = porDescricao('Leite, de vaca, integral')
    expect(leite.nutrientes.energia_kcal).toBeNull()
    expect(trocasDoAlimento({ alimentoId: leite.id, gramas: 200 }, opcoes)).toEqual([])
  })

  it('o plano de exemplo gera lista de trocas para as refeições', () => {
    const { plano } = criarExemplo(contador(), '2026-09-16')
    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    expect(grupos.length).toBeGreaterThan(4)
    expect(grupos.every((g) => g.trocas.length > 0)).toBe(true)
  })

  it('alimento repetido no dia aparece uma vez, na maior porção', () => {
    const gerar = contador()
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    let plano = criarPlanoPadrao(gerar)
    const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')
    const jantar = plano.refeicoes.find((r) => r.nome === 'Jantar')
    if (!almoco || !jantar) throw new Error('Plano padrão sem almoço ou jantar.')
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: arroz.id, gramas: 150 }, gerar)
    plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: arroz.id, gramas: 100 }, gerar)

    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    expect(grupos.filter((g) => g.alimentoId === arroz.id)).toHaveLength(1)
    expect(grupos[0]?.gramas).toBe(150)
  })
})

describe('Trocas com critério (spec sugestoes-com-criterio)', () => {
  it('CA-658 e CA-668: nenhuma troca casa com a trava por texto, para nenhum alimento da base', () => {
    // Trava escrita à mão, sem usar a regra (revisão I3).
    for (const a of ALIMENTOS) {
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes)) {
        const nome = t.descricao.trim()
        expect(nome, `${a.descricao} → ${t.descricao}`).not.toMatch(NUNCA_APARECE)
        expect(nome, `${a.descricao} → ${t.descricao}`).not.toMatch(FORMA_DE_INGREDIENTE)
      }
    }
  })

  it('CA-659: item fora da rotina posto à mão troca por um prescritível do mesmo grupo', () => {
    const ovoFrito = porDescricao('Ovo, de galinha, inteiro, frito')
    const trocas = trocasDoAlimento({ alimentoId: ovoFrito.id, gramas: 50 }, opcoes).map((t) => t.descricao)
    expect(trocas).toContain('Ovo, de galinha, inteiro, cozido/10minutos')

    const batataFrita = porDescricao('Batata, inglesa, frita')
    const daBatata = trocasDoAlimento({ alimentoId: batataFrita.id, gramas: 100 }, opcoes)
    expect(daBatata.length).toBeGreaterThan(0)
    expect(daBatata.every((t) => buscarAlimento(t.alimentoId)?.categoria === batataFrita.categoria)).toBe(true)
  })

  it('CA-660: margarina e doce de leite não têm par prescritível e ficam sem trocas', () => {
    expect(trocasDoAlimento({ alimentoId: porDescricao('Margarina, com óleo hidrogenado, com sal (65% de lipídeos)').id, gramas: 5 }, opcoes)).toEqual([])
    expect(trocasDoAlimento({ alimentoId: porDescricao('Doce, de leite, cremoso').id, gramas: 30 }, opcoes)).toEqual([])
  })

  it('CA-660: no plano de exemplo, a margarina fica sem trocas e o resto continua com as suas', () => {
    const { plano } = criarExemplo(contador(), '2026-10-15')
    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    expect(grupos.some((g) => g.descricao.startsWith('Margarina'))).toBe(false)
    expect(grupos.length).toBeGreaterThan(4)
    expect(grupos.every((g) => g.trocas.length > 0)).toBe(true)
  })

  it('CA-671: ovo inteiro só troca por outra forma de ovo inteiro, nunca por gema ou clara', () => {
    const ovo = porDescricao('Ovo, de galinha, inteiro, cozido/10minutos')
    for (const gramas of [45, 90, 150]) {
      const trocas = trocasDoAlimento({ alimentoId: ovo.id, gramas }, opcoes).map((t) => t.descricao)
      for (const t of trocas) expect(t).not.toMatch(/gema|clara/i)
    }
  })

  it('CA-671: verdura cozida só troca por verdura cozida', () => {
    const cozidas = ALIMENTOS.filter((a) => a.categoria.startsWith('Verduras') && a.preparo !== null && a.preparo !== 'cru')
    expect(cozidas.length).toBeGreaterThan(10)
    for (const a of cozidas) {
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 80 }, opcoes)) {
        expect(t.descricao, `${a.descricao} → ${t.descricao}`).not.toMatch(/(^|[\s,])cru(a|s|as)?($|[\s,])/i)
      }
    }
  })

  it('CA-671: pão de queijo, farinha, farofa, nhoque, fécula e polvilho não trocam com verdura', () => {
    const NAO_VERDURA = /^(Pão|Farinha|Mandioca, farofa|Nhoque|Fécula|Polvilho|Biscoito)/i
    const verduras = ALIMENTOS.filter((a) => a.categoria.startsWith('Verduras'))
    for (const a of verduras) {
      const base = NAO_VERDURA.test(a.descricao.trim())
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes)) {
        expect(NAO_VERDURA.test(t.descricao.trim()), `${a.descricao} → ${t.descricao}`).toBe(base)
      }
    }
  })

  it('CA-671: no plano de exemplo, o ovo não troca por gema e o brócolis não troca por verdura crua', () => {
    const { plano } = criarExemplo(contador(), '2026-10-15')
    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    const doOvo = grupos.find((g) => g.descricao.startsWith('Ovo, de galinha, inteiro'))
    const doBrocolis = grupos.find((g) => g.descricao.startsWith('Brócolis'))
    expect(doOvo?.trocas.map((t) => t.descricao).join(' | ') ?? '').not.toMatch(/gema|clara/i)
    expect(doBrocolis?.trocas.map((t) => t.descricao).join(' | ') ?? '').not.toMatch(/cru/i)
  })

  it('CA-672: item fora da rotina troca primeiro pelo mesmo alimento em outro preparo', () => {
    const ovoFrito = porDescricao('Ovo, de galinha, inteiro, frito')
    expect(trocasDoAlimento({ alimentoId: ovoFrito.id, gramas: 50 }, opcoes)[0]?.descricao).toBe('Ovo, de galinha, inteiro, cozido/10minutos')

    const batataFrita = porDescricao('Batata, inglesa, frita')
    expect(trocasDoAlimento({ alimentoId: batataFrita.id, gramas: 100 }, opcoes)[0]?.descricao).toMatch(/^Batata, inglesa, /)
  })

  it('CB-199: sem o mesmo alimento em outro preparo, segue a ordem normal', () => {
    const presunto = porDescricao('Presunto, sem capa de gordura')
    const trocas = trocasDoAlimento({ alimentoId: presunto.id, gramas: 30 }, opcoes)
    expect(trocas.length).toBeGreaterThan(0)
    expect(trocas.every((t) => !t.descricao.startsWith('Presunto'))).toBe(true)
  })

  it('CA-679: carne magra troca por carne magra antes de corte gordo ou ave com pele', () => {
    const GORDO = /com gordura|com pele|costela|cupim|bisteca|capa de contra/i
    const patinho = trocasDoAlimento({ alimentoId: porDescricao('Carne, bovina, patinho, sem gordura, grelhado').id, gramas: 100 }, opcoes)
    expect(patinho.length).toBeGreaterThan(0)
    for (const t of patinho) expect(t.descricao).not.toMatch(GORDO)
    // Em todas as carnes de rotina da base: depois do primeiro corte gordo, não aparece mais nenhum magro.
    // (Item fora da rotina segue antes o CA-672: o mesmo alimento em outro preparo vem primeiro.)
    const deRotina = (x: (typeof ALIMENTOS)[number]) => !NUNCA_APARECE.test(x.descricao) && !FORMA_DE_INGREDIENTE.test(x.descricao.trim())
    for (const a of ALIMENTOS.filter((x) => x.categoria === 'Carnes e derivados' && deRotina(x))) {
      const gordos = trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes).map((t) => GORDO.test(t.descricao))
      const primeiroGordo = gordos.indexOf(true)
      if (primeiroGordo >= 0) expect(gordos.slice(primeiroGordo), a.descricao).not.toContain(false)
    }
    const milanesa = trocasDoAlimento({ alimentoId: porDescricao('Frango, filé, à milanesa').id, gramas: 100 }, opcoes)
    expect(milanesa[0]?.descricao).toMatch(/^Frango, .*sem pele/)
  })

  it('CA-661: bebida alcoólica no plano não ganha troca', () => {
    expect(trocasDoAlimento({ alimentoId: porDescricao('Cerveja, pilsen 2').id, gramas: 350 }, opcoes)).toEqual([])
    expect(trocasDoAlimento({ alimentoId: porDescricao('Cana, aguardente 1').id, gramas: 50 }, opcoes)).toEqual([])
  })
})
