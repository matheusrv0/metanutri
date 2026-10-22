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
  it('alimento sem papel na refeição só troca dentro da categoria (D-421 da conduta-da-nutricionista)', () => {
    // Desde a D-421, o arroz troca pelo papel (acompanhamento), também com batata; o queijo continua na categoria.
    const queijo = porDescricao('Queijo, minas, frescal')
    const trocas = trocasDoAlimento({ alimentoId: queijo.id, gramas: 30 }, opcoes)
    expect(trocas.length).toBeGreaterThan(0)
    for (const t of trocas) {
      expect(buscarAlimento(t.alimentoId)?.categoria).toBe(queijo.categoria)
    }
  })

  it('a porção sugerida tem a energia da original, a até 15% quando os gramas viram os da medida (D-434)', () => {
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    const kcalOriginal = ((arroz.nutrientes.energia_kcal ?? 0) * 150) / 100
    for (const t of trocasDoAlimento({ alimentoId: arroz.id, gramas: 150 }, opcoes)) {
      const kcalTroca = ((buscarAlimento(t.alimentoId)?.nutrientes.energia_kcal ?? 0) * t.gramas) / 100
      const tolerancia = t.medida ? 0.15 : 0.02
      expect(Math.abs(kcalTroca - kcalOriginal), t.descricao).toBeLessThan(kcalOriginal * tolerancia + 2)
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
    const coco = porDescricao('Coco,  verde, cru')
    expect(coco.nutrientes.energia_kcal).toBeNull()
    expect(trocasDoAlimento({ alimentoId: coco.id, gramas: 200 }, opcoes)).toEqual([])
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

describe('Trocas com a medida que o paciente lê (spec alimentos-e-gramaturas, correção A, D-434)', () => {
  it('CA-1237: os gramas de toda troca com medida são os da medida', () => {
    let comMedida = 0
    for (const a of ALIMENTOS) {
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, { alimentos: ALIMENTOS, porAlimento: 4 })) {
        if (!t.medida) continue
        comMedida += 1
        expect(t.gramas, `${a.descricao} → ${t.descricao} · ${t.medida.texto}`).toBe(t.medida.gramasEquivalentes)
      }
    }
    expect(comMedida).toBeGreaterThan(100)
  })

  it('CA-1237: 2 ovos cozidos trocam por "1 unidade" de ovo frito com os 50 g da unidade', () => {
    const frito = trocasDoAlimento({ alimentoId: 488, gramas: 90 }, { alimentos: ALIMENTOS, porAlimento: 4 }).find((t) => t.alimentoId === 490)
    expect(frito).toMatchObject({ gramas: 50, medida: { texto: '1 unidade' } })
  })
})

describe('Trocas com critério (spec sugestoes-com-criterio)', () => {
  it('CA-658, CA-668 e CA-913: nenhuma troca casa com a trava por texto, para nenhum alimento da base', () => {
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

  it('CA-660 e CA-912: margarina hidrogenada é "nunca" e não ganha troca; a interesterificada, em 5 g, também não', () => {
    expect(trocasDoAlimento({ alimentoId: porDescricao('Margarina, com óleo hidrogenado, com sal (65% de lipídeos)').id, gramas: 5 }, opcoes)).toEqual([])
    expect(trocasDoAlimento({ alimentoId: porDescricao('Margarina, com óleo hidrogenado, com sal (65% de lipídeos)').id, gramas: 30 }, opcoes)).toEqual([])
    expect(trocasDoAlimento({ alimentoId: porDescricao('Chantilly, spray, com gordura vegetal').id, gramas: 30 }, opcoes)).toEqual([])
    // O único par de gordura é o azeite (D-290), e 3 g de azeite é porção que ninguém mede.
    expect(trocasDoAlimento({ alimentoId: porDescricao('Margarina, com óleo interesterificado, com sal (65%de lipídeos)').id, gramas: 5 }, opcoes)).toEqual([])
  })

  it('CA-660 e D-290: doce de leite posto à mão troca só pelos doces que a parceira liberou', () => {
    const trocas = trocasDoAlimento({ alimentoId: porDescricao('Doce, de leite, cremoso').id, gramas: 30 }, opcoes).map((t) => t.descricao)
    expect(trocas.length).toBeGreaterThan(0)
    for (const t of trocas) expect(['Mel, de abelha', 'Chocolate, meio amargo']).toContain(t)
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
    // Farinha, farofa e pão de queijo não contam como verdura (re-revisão N2): a farinha torrada troca pela d'água.
    const cozidas = ALIMENTOS.filter(
      (a) => a.categoria.startsWith('Verduras') && a.preparo !== null && a.preparo !== 'cru' && !/^(Pão|Farinha|Mandioca, farofa|Nhoque|Fécula|Polvilho|Biscoito)/.test(a.descricao.trim()),
    )
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
    // O ovo frito voltou a ser prescritível (spec conduta-da-nutricionista, D-290); a bisteca frita, não.
    const bistecaFrita = porDescricao('Porco, bisteca, frita')
    expect(trocasDoAlimento({ alimentoId: bistecaFrita.id, gramas: 100 }, opcoes)[0]?.descricao).toBe('Porco, bisteca, grelhada')

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
    // Segunda escolha (spec conduta-da-nutricionista, D-293): corte gordo, ave com pele e carne curada.
    const GORDO = /com gordura|com pele|costela|cupim|bisteca|capa de contra|charque|bovina, seca/i
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

// Travas escritas à mão para a spec conduta-da-nutricionista (D-294 a D-296), sem usar as funções de prescritivel.ts.
const PRATO_COMPOSTO =
  /^(Quibe|Carne, bovina, almôndegas|Hambúrguer|Coxinha|Croquete|Empada|Pastel|Pamonha|Omelete|Mandioca, farofa|Nhoque|Pescada, filé, molho escabeche|Pão, de queijo)/
const PREPARO_SIMPLES_ENTRE_OS_PRATOS = /^(Cuscuz, de milho|Frango, com açafrão|Quibebe)/
const composto = (descricao: string): boolean => {
  const a = porDescricao(descricao)
  return a.categoria === 'Alimentos preparados' ? !PREPARO_SIMPLES_ENTRE_OS_PRATOS.test(a.descricao.trim()) : PRATO_COMPOSTO.test(a.descricao.trim())
}
const PROCESSADO = /(^|[\s,])(salgad[oa]s?|conserva|enlatad[oa]s?|industrializad[oa]s?)($|[\s,])|(^|[\s,])pó($|[\s,])|extrato solúvel|^Cereal matinal|^Leite, fermentado|^Carne, bovina, (charque|seca)|^Seleta/
const MUITOS_PEDACOS = /^([5-9]|\d{2,}) (unidades|fatias|pedaços|rodelas|gomos|bandas|metades|bifes|filés|postas|coxas|sobrecoxas|peitos)/

describe('Trocas pela conduta da nutricionista (spec conduta-da-nutricionista)', () => {
  const nomes = (descricao: string, gramas: number) => trocasDoAlimento({ alimentoId: porDescricao(descricao).id, gramas }, opcoes).map((t) => t.descricao)

  it('CA-919: alimento simples não troca por prato composto', () => {
    expect(nomes('Frango, peito, sem pele, grelhado', 100)).not.toContain('Quibe, assado')
    expect(nomes('Arroz, tipo 1, cozido', 150)).not.toContain('Pamonha, barra para cozimento, pré-cozida')
    expect(nomes('Ovo, de galinha, inteiro, cozido/10minutos', 90)).not.toContain('Omelete, de queijo')
    expect(nomes('Cuscuz, de milho, cozido com sal', 135)).not.toContain('Yakisoba')
    expect(nomes('Cuscuz, de milho, cozido com sal', 135)).not.toContain('Salada, de legumes, cozida no vapor')
    // O ovo cozido continua com troca: o ovo frito voltou e sai em "1 unidade", não em "5 fatias e meia".
    expect(nomes('Ovo, de galinha, inteiro, cozido/10minutos', 90)).toEqual(['Ovo, de galinha, inteiro, frito'])
    expect(trocasDoAlimento({ alimentoId: porDescricao('Ovo, de galinha, inteiro, cozido/10minutos').id, gramas: 90 }, opcoes)[0]?.medida?.texto).toBe('1 unidade')
    for (const a of ALIMENTOS) {
      if (composto(a.descricao)) continue
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes)) {
        expect(composto(t.descricao), `${a.descricao} → ${t.descricao}`).toBe(false)
      }
    }
  })

  it('CA-920: prato composto posto à mão troca primeiro por preparo simples', () => {
    let comparados = 0
    for (const a of ALIMENTOS.filter((x) => composto(x.descricao))) {
      const ordem = trocasDoAlimento({ alimentoId: a.id, gramas: 150 }, opcoes).map((t) => composto(t.descricao))
      const primeiroComposto = ordem.indexOf(true)
      if (primeiroComposto >= 0) expect(ordem.slice(primeiroComposto), a.descricao).not.toContain(false)
      if (ordem.includes(true) && ordem.includes(false)) comparados += 1
    }
    expect(comparados).toBeGreaterThan(0)
  })

  it('CA-921: nenhuma troca pede mais de 4 unidades ou pedaços; o pão francês não troca por 7 torradas e continua com trocas', () => {
    const doPao = trocasDoAlimento({ alimentoId: porDescricao('Pão, trigo, francês').id, gramas: 70 }, { ...opcoes, porAlimento: 4 })
    expect(doPao.length).toBeGreaterThan(1)
    expect(doPao.map((t) => t.descricao)).not.toContain('Torrada, pão francês')
    for (const a of ALIMENTOS) {
      for (const gramas of [50, 100, 200]) {
        for (const t of trocasDoAlimento({ alimentoId: a.id, gramas }, { ...opcoes, porAlimento: 4 })) {
          expect(t.medida?.texto ?? '', `${a.descricao} ${gramas} g → ${t.descricao}`).not.toMatch(MUITOS_PEDACOS)
        }
      }
    }
  })

  it('CA-922: alimento in natura não troca por processado quando há troca in natura', () => {
    const daCastanha = nomes('Castanha-do-Brasil, crua', 15)
    expect(daCastanha.length).toBeGreaterThan(0)
    for (const t of daCastanha) expect(t).not.toMatch(/salgad/)
    expect(nomes('Brócolis, cozido', 80).join(' | ')).not.toMatch(/conserva/)
    expect(nomes('Merluza, filé, assado', 100).join(' | ')).not.toMatch(/Bacalhau, salgado/)
    expect(nomes('Feijão, carioca, cozido', 100).join(' | ')).not.toMatch(/enlatad/)
    for (const a of ALIMENTOS.filter((x) => !PROCESSADO.test(x.descricao.trim()))) {
      const processadas = trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes).map((t) => PROCESSADO.test(t.descricao.trim()))
      // Ou todas processadas (não havia outra), ou nenhuma.
      if (processadas.includes(false)) expect(processadas, a.descricao).not.toContain(true)
    }
  })

  it('CA-923: alimento processado posto à mão troca primeiro pelo não processado', () => {
    // O mesmo alimento em outro preparo vem antes de tudo para item fora da rotina (CA-672): cereal com açúcar → sem açúcar.
    const primeiraParte = (d: string) => d.split(',')[0]?.trim().toLowerCase()
    for (const a of ALIMENTOS.filter((x) => PROCESSADO.test(x.descricao.trim()))) {
      const ordem = trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes)
        .filter((t) => primeiraParte(t.descricao) !== primeiraParte(a.descricao))
        .map((t) => PROCESSADO.test(t.descricao.trim()))
      const primeiroProcessado = ordem.indexOf(true)
      if (primeiroProcessado >= 0) expect(ordem.slice(primeiroProcessado), a.descricao).not.toContain(false)
    }
    for (const [d, gramas] of [['Castanha-de-caju, torrada, salgada', 20], ['Palmito, juçara, em conserva', 80]] as const) {
      const primeira = nomes(d, gramas)[0]
      expect(primeira, d).toBeDefined()
      expect(PROCESSADO.test(primeira ?? ''), `${d} → ${primeira}`).toBe(false)
    }
  })

  it('CB-294: plano antigo com margarina hidrogenada não muda; ela só não ganha troca', () => {
    let n = 0
    const gerar = () => `cb${++n}`
    let plano = criarPlanoPadrao(gerar)
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 263, gramas: 10 }, gerar)
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 53, gramas: 50 }, gerar)
    expect(plano.refeicoes[0]?.opcoes.principal.map((i) => i.alimentoId)).toEqual([263, 53])
    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    expect(grupos.map((g) => g.alimentoId)).toEqual([53])
  })

  it('CB-295: alimento sem troca simples, realista e in natura sai da lista de trocas', () => {
    let n = 0
    const gerar = () => `cc${++n}`
    let plano = criarPlanoPadrao(gerar)
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    // Era o cuscuz; desde a D-421 ele troca no papel de acompanhamento (arroz, batata). O arroz cru continua sem troca
    // (CB-394).
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: porDescricao('Arroz, tipo 1, cru').id, gramas: 50 }, gerar)
    expect(trocasDoPlano(plano, buscarAlimento, opcoes)).toEqual([])
  })

  it('CA-912: item "nunca" posto à mão não ganha troca', () => {
    for (const d of ['Margarina, com óleo hidrogenado, sem sal (80% de lipídeos)', 'Chantilly, spray, com gordura vegetal', 'Shoyu']) {
      expect(nomes(d, 50), d).toEqual([])
    }
  })

  it('no plano de exemplo, as trocas impressas da revisão da parceira mudaram', () => {
    let n = 0
    const { plano } = criarExemplo(() => `cn${++n}`, '2026-10-20')
    const grupos = trocasDoPlano(plano, buscarAlimento, { ...opcoes, porAlimento: 4 })
    const de = (inicio: string) => grupos.find((g) => g.descricao.startsWith(inicio))?.trocas.map((t) => t.descricao) ?? []
    expect(de('Frango, peito, sem pele, grelhado')).not.toContain('Quibe, assado')
    expect(de('Pão, trigo, francês')).not.toContain('Torrada, pão francês')
    expect(de('Castanha-do-Brasil')).not.toContain('Castanha-de-caju, torrada, salgada')
    expect(de('Aveia')).not.toContain('Pipoca, com óleo de soja, sem sal')
    expect(de('Brócolis')).not.toContain('Palmito, juçara, em conserva')
  })
})

describe('Troca no papel da refeição e fruta por fruta (spec conduta-da-nutricionista, seção 6)', () => {
  const trocas = (id: number, gramas: number) => trocasDoAlimento({ alimentoId: id, gramas }, { ...opcoes, porAlimento: 6 })
  const descricoes = (id: number, gramas: number) => trocas(id, gramas).map((t) => t.descricao)
  const ACOMPANHAMENTO =
    /^(Arroz, (integral|tipo 1|tipo 2), cozido|Macarrão, trigo, cru|Cuscuz, de milho, cozido|Polenta, pré-cozida|Batata, (inglesa|doce|baroa), cozida|Mandioca, cozida|Cará, cozido)/
  const ARROZ = 3
  const PAO_FRANCES = 53
  const AVEIA = 7
  const BATATA = 91
  const BANANA_PRATA = 182
  const MACA_FUJI = 222

  it('CA-1203 (D-421): arroz cozido troca só por acompanhamento, também de fora dos cereais', () => {
    const t = descricoes(ARROZ, 150)
    expect(t.length).toBeGreaterThan(1)
    for (const d of t) expect(d).toMatch(ACOMPANHAMENTO)
    expect(t.some((d) => !d.startsWith('Arroz'))).toBe(true)
  })

  it('CA-1204 (D-421): pão troca só por pão e torrada; aveia nunca por pão, torrada ou pipoca', () => {
    const doPao = descricoes(PAO_FRANCES, 50)
    expect(doPao.length).toBeGreaterThan(0)
    for (const d of doPao) expect(d).toMatch(/^(Pão, |Torrada, pão francês)/)
    for (const d of descricoes(AVEIA, 30)) expect(d).not.toMatch(/^(Pão|Torrada|Pipoca)/)
  })

  it('CA-1205 (D-421): batata cozida troca por acompanhamento, nunca por verdura', () => {
    const t = descricoes(BATATA, 150)
    expect(t.length).toBeGreaterThan(0)
    for (const d of t) expect(d).toMatch(ACOMPANHAMENTO)
  })

  it('CA-1206 (D-422): fruta não troca pela mesma fruta e troca em peça, sem "e meia" de fatia', () => {
    for (const [id, gramas] of [
      [BANANA_PRATA, 75],
      [MACA_FUJI, 130],
    ] as const) {
      const base = (buscarAlimento(id)?.descricao ?? '').split(',')[0]
      const lista = trocas(id, gramas)
      expect(lista.length, `${base}`).toBeGreaterThan(0)
      for (const t of lista) {
        expect(t.descricao.split(',')[0], t.descricao).not.toBe(base)
        expect(['unidade', 'unidade pequena', 'fatia', 'pedaço'], `${t.descricao}: ${t.medida?.texto ?? `${t.gramas} g`}`).toContain(t.medida?.medida)
        if (t.medida?.medida === 'fatia' || t.medida?.medida === 'pedaço') expect(t.medida.quantidade, t.descricao).toBeLessThanOrEqual(2)
      }
    }
  })

  it('CA-1207: no plano de exemplo, o arroz não troca por pão e a banana não troca por banana', () => {
    let n = 0
    const { plano } = criarExemplo(() => `pa${++n}`, '2026-10-22')
    const grupos = trocasDoPlano(plano, buscarAlimento, { ...opcoes, porAlimento: 4 })
    const de = (inicio: string) => grupos.find((g) => g.descricao.startsWith(inicio))?.trocas.map((t) => t.descricao) ?? []
    expect(de('Arroz, tipo 1, cozido').length).toBeGreaterThan(0)
    for (const d of de('Arroz, tipo 1, cozido')) expect(d).not.toMatch(/^(Pão|Torrada|Cereais|Pamonha)/)
    for (const d of de('Banana, prata')) expect(d).not.toMatch(/^Banana/)
  })

  it('CB-393: flocão de milho e fubá trocam sem alimento com papel', () => {
    for (const id of [22, 43]) {
      for (const d of descricoes(id, 50)) expect(d, `${id}`).not.toMatch(new RegExp(`${ACOMPANHAMENTO.source}|^(Pão, |Torrada|Aveia|Cereal matinal)`))
    }
  })

  it('CB-394: arroz cru fica sem troca: o cru é forma de ingrediente, e o pronto é outro estado', () => {
    expect(descricoes(4, 50)).toEqual([])
    // O arroz cozido nunca troca pelo macarrão cru (forma de ingrediente, CA-658).
    for (const d of descricoes(ARROZ, 150)) expect(d).not.toMatch(/cru/)
  })

  it('CB-395: fruta que só se leria em gramas fica fora das trocas', () => {
    const banana = porDescricao('Banana, prata, crua')
    const maca = porDescricao('Maçã, Fuji, com casca, crua')
    // A mesma maçã, com outro id e sem medida nenhuma: só se leria em gramas.
    const semMedida = { ...maca, id: 899_998, descricao: 'Fruta, teste, crua' }
    expect(trocasDoAlimento({ alimentoId: banana.id, gramas: 75 }, { alimentos: [banana, semMedida] })).toEqual([])
    expect(trocasDoAlimento({ alimentoId: banana.id, gramas: 75 }, { alimentos: [banana, maca] }).map((t) => t.descricao)).toEqual([maca.descricao])
  })
})
