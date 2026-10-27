// Spec alimentos-e-gramaturas, D-383 a D-386: "Meus alimentos".
import { dadosDaCopiaDaBase, dadosDoProduto, dadosEmBranco, produtoDosDados } from './alimentoProprio.ts'
import { buscarAlimentos, medidasDoAlimento } from './busca.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { calcularAdequacao } from './adequacao.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import type { Armazenamento } from './persistencia.ts'
import {
  criarRepositorioProdutos,
  LIMITE_ALIMENTOS_PROPRIOS,
  MEUS_ALIMENTOS_NOVOS,
  produtoComoAlimento,
  validarAlimentoProprio,
  validarProduto,
  type DadosAlimentoProprio,
  type Produto,
} from './produtos.ts'
import { MACROS_QUE_NAO_SE_APLICAM, receitaComoAlimento, type Receita } from './receitas.ts'
import { avisosParaImprimir, montarRestricoes } from './restricoes.ts'
import { ALIMENTOS, alimentosComProdutos, alimentosParaSugerir, buscarAlimento, registrarProdutos } from './tabelas.ts'
import { totaisDeItens } from './totais.ts'
import { trocasDoAlimento } from './trocas.ts'
import { quantidadeNaFolha, textoDaQuantidade } from './quantidadeNaFolha.ts'
import { planosComAlimento } from './usoDaConta.ts'
import type { Plano } from './tipos.ts'

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

const CUSCUZ: DadosAlimentoProprio = {
  ...dadosEmBranco('alimento'),
  nome: 'Cuscuz da casa',
  nomeParaPaciente: 'Cuscuz nordestino',
  grupo: 'Cereais e derivados',
  preparo: 'cozido',
  valores: { energia_kcal: 112, proteina_g: 2.2, carboidrato_g: 25, lipideos_g: 0.3 },
  medidas: [{ nome: 'fatia', gramas: 60 }],
  fonte: { tipo: 'laboratorio' },
}

const BARRA: DadosAlimentoProprio = {
  ...dadosEmBranco('rotulo'),
  nome: 'Barra de castanhas',
  marca: 'Marca Exemplo',
  grupo: 'Nozes e sementes',
  base: 'porcao',
  porcaoG: 30,
  nomeDaPorcao: 'barra',
  valores: { energia_kcal: 120, proteina_g: 3, carboidrato_g: 15, lipideos_g: 5.5 },
}

afterEach(() => registrarProdutos([]))

describe('a publicação em duas vezes (D-383)', () => {
  it('CA-1157: o formulário novo está ligado (publicação 2)', () => {
    expect(MEUS_ALIMENTOS_NOVOS).toBe(true)
  })

  it('CA-1155: o item novo tem o que a versão de antes lê, com a mesma energia por 100 g', () => {
    const p = produtoDosDados(BARRA)
    expect(p).toMatchObject({ nome: 'Barra de castanhas', porcaoG: 30, porPorcao: { energia_kcal: 120 } })
    // A versão de antes lê `porPorcao` na `porcaoG`: 120 kcal em 30 g = 400 kcal por 100 g.
    expect(((p.porPorcao.energia_kcal ?? 0) * 100) / p.porcaoG).toBe(400)
    const porCem = produtoDosDados(CUSCUZ)
    expect(porCem).toMatchObject({ porcaoG: 100, base: 'por100', porPorcao: { energia_kcal: 112 } })
  })

  it('CA-1156: salvar preserva o que esta versão não conhece; CB-370: o item estragado fica', () => {
    const memoria = new Memoria()
    memoria.setItem('metanutri:produtos', JSON.stringify([{ id: 'estragado' }, { id: 900_001, nome: 'Velho', porcaoG: 100, porPorcao: {}, criadoEm: '2026-10-01', campoDoFuturo: 42 }]))
    const repo = criarRepositorioProdutos(memoria, () => '2026-10-21T10:00:00.000Z')
    repo.salvar({ id: 900_001, nome: 'Velho editado', porcaoG: 100, porPorcao: { energia_kcal: 10 } })
    const gravado = JSON.parse(memoria.getItem('metanutri:produtos') ?? '[]') as Record<string, unknown>[]
    expect(gravado[0]).toEqual({ id: 'estragado' })
    expect(gravado[1]).toMatchObject({ nome: 'Velho editado', campoDoFuturo: 42, criadoEm: '2026-10-01', atualizadoEm: '2026-10-21T10:00:00.000Z' })
  })

  it('CA-1363 (D-498): o item sem os campos de texto é lido com texto vazio e gravado como veio', () => {
    const memoria = new Memoria()
    memoria.setItem('metanutri:produtos', JSON.stringify([{ id: 900_000, nome: 'Iogurte da fazenda', porcaoG: 170, porPorcao: { energia_kcal: 110 } }]))
    const repo = criarRepositorioProdutos(memoria)
    const [lido] = repo.listar()
    expect(lido).toMatchObject({ marca: '', codigoBarras: '', medidaCaseira: '', criadoEm: '' })
    if (!lido) throw new Error('sem item')
    expect(dadosDoProduto(lido)).toMatchObject({ nomeDaPorcao: '', marca: '', codigoBarras: '' })
    expect(JSON.parse(memoria.getItem('metanutri:produtos') ?? '[]')).toEqual([{ id: 900_000, nome: 'Iogurte da fazenda', porcaoG: 170, porPorcao: { energia_kcal: 110 } }])
    // A função pura também aguenta o item cru, sem passar pelo repositório.
    expect(dadosDoProduto({ id: 900_001, nome: 'Cru', porcaoG: 100, porPorcao: {} } as unknown as Produto).nomeDaPorcao).toBe('')
  })

  it('CB-371: com 1.000 alimentos, o novo é recusado com o motivo', () => {
    const memoria = new Memoria()
    memoria.setItem('metanutri:produtos', JSON.stringify(Array.from({ length: LIMITE_ALIMENTOS_PROPRIOS }, (_, i) => ({ id: 900_000 + i, nome: `A${i}`, porcaoG: 100, porPorcao: {}, criadoEm: 'x' }))))
    expect(() => criarRepositorioProdutos(memoria).salvar({ nome: 'Mais um', porcaoG: 100, porPorcao: {} })).toThrow(/limite/)
  })
})

describe('validação (D-384)', () => {
  const problemas = (d: DadosAlimentoProprio) => validarAlimentoProprio(d).problemas.map((p) => p.campo)

  it('CA-1142: bloqueia nome, grupo, macro, porção, açúcares, saturada e a soma acima de 105 g', () => {
    expect(problemas(CUSCUZ)).toEqual([])
    expect(problemas({ ...CUSCUZ, nome: ' ' })).toContain('nome')
    expect(problemas({ ...CUSCUZ, grupo: '' })).toContain('grupo')
    expect(problemas({ ...CUSCUZ, valores: { ...CUSCUZ.valores, proteina_g: null } })).toContain('proteina_g')
    expect(problemas({ ...CUSCUZ, valores: { ...CUSCUZ.valores, lipideos_g: -1 } })).toContain('lipideos_g')
    expect(problemas({ ...BARRA, porcaoG: 0 })).toContain('porcaoG')
    expect(problemas({ ...BARRA, porcaoG: 2001 })).toContain('porcaoG')
    expect(problemas({ ...CUSCUZ, valores: { ...CUSCUZ.valores, acucares_g: 30 } })).toContain('acucares_g')
    expect(problemas({ ...CUSCUZ, valores: { ...CUSCUZ.valores, gordura_saturada_g: 1 } })).toContain('gordura_saturada_g')
    expect(problemas({ ...CUSCUZ, valores: { energia_kcal: 500, proteina_g: 40, carboidrato_g: 60, lipideos_g: 10 } })).toContain('soma')
    expect(problemas({ ...CUSCUZ, preparo: null })).toContain('preparo')
    expect(problemas({ ...CUSCUZ, fonte: null })).toContain('fonte')
  })

  it('CA-1143: energia longe dos macros avisa sem bloquear e tira a chave do Cobrir', () => {
    const errada = { ...CUSCUZ, valores: { ...CUSCUZ.valores, energia_kcal: 252 } }
    const r = validarAlimentoProprio(errada)
    expect(r.problemas).toEqual([])
    expect(r.avisos).toContainEqual({ campo: 'energia_kcal', mensagem: 'Pelos macros, dá 112 kcal; você digitou 252. Confira.' })
    expect(produtoDosDados({ ...errada, sugerirAutomaticamente: true }).sugerirAutomaticamente).toBe(false)
  })

  const mensagem = (d: DadosAlimentoProprio, campo: string) => validarAlimentoProprio(d).problemas.find((p) => p.campo === campo)?.mensagem

  it('CA-1364 (D-499): "Informe a energia", "o carboidrato", com o artigo e o pronome certos; negativo sem gênero', () => {
    const vazio = dadosEmBranco('alimento')
    expect(mensagem(vazio, 'energia_kcal')).toBe('Informe a energia: sem ela, o alimento não entra nos cálculos.')
    expect(mensagem(vazio, 'proteina_g')).toBe('Informe a proteína: sem ela, o alimento não entra nos cálculos.')
    expect(mensagem(vazio, 'carboidrato_g')).toBe('Informe o carboidrato: sem ele, o alimento não entra nos cálculos.')
    expect(mensagem(vazio, 'lipideos_g')).toBe('Informe a gordura total: sem ela, o alimento não entra nos cálculos.')
    const negativos = { ...CUSCUZ, valores: { ...CUSCUZ.valores, carboidrato_g: -1, fibra_g: -1, acucares_g: -1, tiamina_mg: -1 } }
    for (const campo of ['carboidrato_g', 'fibra_g', 'acucares_g', 'tiamina_mg']) expect(mensagem(negativos, campo), campo).toBe('O valor não pode ser negativo.')
  })

  it('CA-1365 (D-499): a soma diz quanto deu, as regras de coerência pedem os valores e a porção "não pode passar"', () => {
    expect(mensagem({ ...CUSCUZ, valores: { energia_kcal: 500, proteina_g: 40, carboidrato_g: 60, lipideos_g: 5.3 } }, 'soma')).toBe(
      'Proteína, carboidrato, gordura e fibra passam de 105 g em 100 g (somam 105,3 g). Confira os valores.',
    )
    expect(mensagem({ ...CUSCUZ, valores: { ...CUSCUZ.valores, acucares_g: 30 } }, 'acucares_g')).toBe('Açúcares não podem passar dos carboidratos totais. Confira os valores.')
    expect(mensagem({ ...CUSCUZ, valores: { ...CUSCUZ.valores, gordura_saturada_g: 1 } }, 'gordura_saturada_g')).toBe('Gordura saturada não pode passar da gordura total. Confira os valores.')
    expect(mensagem({ ...BARRA, porcaoG: 2001 }, 'porcaoG')).toBe('A porção não pode passar de 2.000 g ou ml.')
  })

  it('CA-1365 (D-499): o limite da conta com ponto de milhar', () => {
    const memoria = new Memoria()
    memoria.setItem('metanutri:produtos', JSON.stringify(Array.from({ length: LIMITE_ALIMENTOS_PROPRIOS }, (_, i) => ({ id: 900_000 + i, nome: `A${i}`, porcaoG: 100, porPorcao: {}, criadoEm: 'x' }))))
    expect(() => criarRepositorioProdutos(memoria).salvar({ nome: 'Mais um', porcaoG: 100, porPorcao: {} })).toThrow('Você já tem 1.000 alimentos cadastrados, o limite da conta. Exclua um que não usa mais.')
  })

  it('a janela antiga do rótulo usa as mesmas frases (D-499)', () => {
    const rotulo = { nome: 'Iogurte', marca: '', porcaoG: 2001, medidaCaseira: '', porPorcao: { energia_kcal: 100, carboidrato_g: -1, acucares_g: 1, proteina_g: 1, lipideos_g: 1, gordura_saturada_g: 0, fibra_g: 0 } }
    const problemas = validarProduto(rotulo)
    expect(problemas).toContainEqual({ campo: 'porcaoG', mensagem: 'A porção não pode passar de 2.000 g ou ml.' })
    expect(problemas).toContainEqual({ campo: 'carboidrato_g', mensagem: 'O valor não pode ser negativo.' })
    expect(problemas).toContainEqual({ campo: 'sodio_mg', mensagem: 'Obrigatório no rótulo.' })
  })

  it('CA-1367 (D-501): energia acima de 900 kcal em 100 g não salva; a do óleo salva', () => {
    const kj = { ...CUSCUZ, nome: 'Farinha em kJ', valores: { energia_kcal: 1510, proteina_g: 1.6, carboidrato_g: 87.9, lipideos_g: 0.3 } }
    expect(mensagem(kj, 'energia_kcal')).toBe('Energia acima de 900 kcal em 100 g. O rótulo traz kJ e kcal: use o valor em kcal.')
    // Na porção: 453 kcal em 30 g são 1.510 kcal em 100 g.
    expect(mensagem({ ...BARRA, valores: { ...BARRA.valores, energia_kcal: 453 } }, 'energia_kcal')).toBe('Energia acima de 900 kcal em 100 g. O rótulo traz kJ e kcal: use o valor em kcal.')
    expect(mensagem({ ...CUSCUZ, nome: 'Óleo de buriti', valores: { energia_kcal: 884, proteina_g: 0, carboidrato_g: 0, lipideos_g: 100 } }, 'energia_kcal')).toBeUndefined()
  })

  it('CA-1362 (D-497): o campo com texto que não é número tem a mensagem dele, no lugar de "Informe…"', () => {
    const r = validarAlimentoProprio({ ...CUSCUZ, valores: { ...CUSCUZ.valores, proteina_g: null, fibra_g: null } }, ['proteina_g', 'fibra_g'])
    expect(r.problemas).toEqual([
      { campo: 'proteina_g', mensagem: 'Digite só o número, sem a unidade. Traço: 0.' },
      { campo: 'fibra_g', mensagem: 'Digite só o número, sem a unidade. Traço: 0.' },
    ])
    const porcao = validarAlimentoProprio({ ...BARRA, porcaoG: null }, ['porcaoG']).problemas.filter((p) => p.campo === 'porcaoG')
    expect(porcao).toEqual([{ campo: 'porcaoG', mensagem: 'Digite só o número, sem a unidade. Traço: 0.' }])
    // Na base "por 100 g", o campo da porção não aparece: o texto que ficou nele não conta.
    expect(validarAlimentoProprio(CUSCUZ, ['porcaoG']).problemas).toEqual([])
  })

  it('CA-1144: micro acima do maior da base pede para conferir a unidade', () => {
    const r = validarAlimentoProprio({ ...CUSCUZ, valores: { ...CUSCUZ.valores, vitamina_c_mg: 50_000 } })
    expect(r.avisos.find((a) => a.campo === 'vitamina_c_mg')?.mensagem).toMatch(/mg ou µg\?/)
  })
})

describe('como o alimento próprio entra no resto (D-385)', () => {
  const registrar = (...dados: DadosAlimentoProprio[]) => {
    const repo = criarRepositorioProdutos(new Memoria())
    const salvos = dados.map((d) => repo.salvar(produtoDosDados(d)))
    registrarProdutos(salvos.map(produtoComoAlimento))
    return salvos
  }

  it('CA-1140: por 100 g, entra na busca e soma no plano como os da base', () => {
    const [cuscuz] = registrar(CUSCUZ) as [Produto]
    const r = buscarAlimentos('150 cuscuz', alimentosComProdutos()).resultados[0]
    expect(r?.alimento.id).toBe(cuscuz.id)
    expect(totaisDeItens([{ id: 'i', alimentoId: cuscuz.id, gramas: 150 }], buscarAlimento).nutrientes.energia_kcal.total).toBeCloseTo(168, 6)
  })

  it('CA-1141: o rótulo por porção soma por 100 g, e a porção vira medida', () => {
    const [barra] = registrar(BARRA) as [Produto]
    expect(buscarAlimento(barra.id)?.nutrientes.energia_kcal).toBe(400)
    expect(medidasDoAlimento(barra.id)).toContainEqual({ nome: 'barra', gramas: 30 })
  })

  it('CA-1146: as medidas do cadastro aparecem na entrada rápida', () => {
    registrar(CUSCUZ)
    expect(buscarAlimentos('2 fatias de cuscuz da casa', alimentosComProdutos()).resultados[0]).toMatchObject({ gramas: 120, medida: { nome: 'fatia', quantidade: 2 } })
  })

  it('CA-1147: o nome para o paciente vale na folha; vazio, o nome', () => {
    const [cuscuz, barra] = registrar(CUSCUZ, BARRA) as [Produto, Produto]
    expect(nomeParaPaciente(buscarAlimento(cuscuz.id))).toBe('Cuscuz nordestino')
    expect(nomeParaPaciente(buscarAlimento(barra.id))).toBe('Barra de castanhas (Marca Exemplo)')
  })

  it('CA-1148: copiar da base traz a composição, as medidas e a fonte', () => {
    const feijao = ALIMENTOS.find((a) => a.id === 561)
    if (!feijao) throw new Error('sem feijão')
    const copia = dadosDaCopiaDaBase(feijao)
    expect(copia).toMatchObject({ tipo: 'alimento', grupo: 'Leguminosas e derivados', preparo: 'cozido', base: 'por100', fonte: { tipo: 'copia-da-base', origemId: 561 } })
    expect(copia.valores.energia_kcal).toBe(feijao.nutrientes.energia_kcal)
    expect(copia.medidas).toContainEqual({ nome: 'concha', gramas: 140 })
    expect(validarAlimentoProprio(copia).problemas).toEqual([])
  })

  it('o item guardado volta igual ao formulário (editar)', () => {
    const [barra] = registrar(BARRA) as [Produto]
    // D-491: "barra" foi gravada como o rótulo escreve, "1 barra".
    expect(dadosDoProduto(barra)).toMatchObject({ tipo: 'rotulo', base: 'porcao', porcaoG: 30, nomeDaPorcao: '1 barra', medidas: [], marca: 'Marca Exemplo' })
  })

  it('CA-1150: conta em quantos planos o alimento está, também como ingrediente de receita', () => {
    const plano = (alimentoId: number, comReceita = false): Plano => ({
      refeicoes: [
        {
          id: 'r',
          nome: 'Almoço',
          horario: '12:00',
          opcoes: {
            principal: comReceita
              ? [{ id: 'x', alimentoId: 0, gramas: 100, receita: { origemId: 'o', nome: 'R', ingredientes: [{ alimentoId, gramas: 50 }], porcoes: 1, nomeDaPorcao: 'porção', pesoProntoG: null, preparo: '' } }]
              : [{ id: 'y', alimentoId, gramas: 100 }],
            substituto1: [],
            substituto2: [],
          },
        },
      ],
    })
    expect(planosComAlimento([plano(900_001), plano(900_001, true), plano(3), null], 900_001)).toBe(2)
  })
})

describe('Cobrir e trocas só com a chave (D-386)', () => {
  const vazio = totaisDeItens([], buscarAlimento)
  const adequacao = calcularAdequacao(vazio, { sexo: 'F', idadeAnos: 30, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
  const rica: DadosAlimentoProprio = { ...CUSCUZ, nome: 'Farofa de baru', grupo: 'Nozes e sementes', preparo: 'pronto para consumo', valores: { ...CUSCUZ.valores, ferro_mg: 40 } }
  const idsSugeridos = () => sugerirParaCobrir('ferro_mg', vazio, adequacao, { gastoEnergetico: 2000, alimentos: alimentosParaSugerir() }).sugestoes.map((s) => s.alimentoId)

  const registrar = (d: DadosAlimentoProprio) => {
    const salvo = criarRepositorioProdutos(new Memoria()).salvar(produtoDosDados(d))
    registrarProdutos([produtoComoAlimento(salvo)])
    return salvo.id
  }

  it('CA-1154: com a chave, energia e o nutriente, entra; a sugestão é do próprio', () => {
    const id = registrar({ ...rica, sugerirAutomaticamente: true })
    expect(idsSugeridos()).toContain(id)
  })

  it('CA-1154: sem a chave, com grupo "Suplementos", com energia incoerente ou com nome que a regra "nunca" pega, não entra', () => {
    for (const d of [
      rica,
      { ...rica, sugerirAutomaticamente: true, grupo: 'Suplementos' },
      { ...rica, sugerirAutomaticamente: true, valores: { ...rica.valores, energia_kcal: 400 } },
      { ...rica, sugerirAutomaticamente: true, nome: 'Cerveja artesanal com baru' },
    ]) {
      const id = registrar(d)
      expect(idsSugeridos(), d.nome).not.toContain(id)
    }
  })

  // Gravado com a chave ligada antes desta versão: a regra vale na hora de sugerir (CB-461).
  const registrarComAChave = (d: DadosAlimentoProprio) => {
    const salvo = criarRepositorioProdutos(new Memoria()).salvar({ ...produtoDosDados(d), sugerirAutomaticamente: true })
    registrarProdutos([produtoComoAlimento(salvo)])
    return salvo.id
  }
  /** Registra o alimento e diz se ele entra no Cobrir de ferro (a lista é lida depois de registrar). */
  const entra = (d: DadosAlimentoProprio): boolean => {
    const id = registrarComAChave(d)
    return idsSugeridos().includes(id)
  }

  it('CA-1352 e CA-1353: gordura trans declarada e o grupo "Outros alimentos industrializados" não entram', () => {
    expect(entra({ ...rica, valores: { ...rica.valores, gordura_trans_g: 0.6 } })).toBe(false)
    expect(entra({ ...rica, grupo: 'Outros alimentos industrializados' })).toBe(false)
    // CB-460: trans zero não tira.
    expect(entra({ ...rica, valores: { ...rica.valores, gordura_trans_g: 0 } })).toBe(true)
  })

  it('CA-1354: açúcares acima do limite não entram; a fruta, com o açúcar dela, entra', () => {
    expect(entra({ ...rica, tipo: 'preparacao', valores: { ...rica.valores, acucares_g: 20 } })).toBe(false)
    expect(entra({ ...rica, grupo: 'Bebidas (alcoólicas e não alcoólicas)', unidade: 'ml', valores: { ...rica.valores, acucares_g: 11.5 } })).toBe(false)
    expect(entra({ ...rica, grupo: 'Leite e derivados', valores: { ...rica.valores, acucares_g: 12 } })).toBe(false)
    expect(entra({ ...rica, nome: 'Camu-camu, polpa congelada', grupo: 'Frutas e derivados', preparo: 'cru', valores: { ...rica.valores, acucares_g: 16 } })).toBe(true)
  })

  it('CA-1355: o nome livre de doce, ultraprocessado, bebida adoçada e álcool não entra', () => {
    for (const nome of ['Bolo de chocolate da vó', 'Biscoito recheado sabor chocolate', 'Rosquinha de coco', 'Néctar de acerola', 'Chope artesanal']) {
      expect(entra({ ...rica, nome, grupo: 'Cereais e derivados' }), nome).toBe(false)
    }
    expect(entra({ ...rica, nome: 'Camu-camu, polpa congelada', grupo: 'Frutas e derivados', preparo: 'cru' })).toBe(true)
  })

  it('CA-1356: o formulário grava a chave desligada quando há motivo', () => {
    expect(produtoDosDados({ ...rica, sugerirAutomaticamente: true, valores: { ...rica.valores, gordura_trans_g: 0.6 } }).sugerirAutomaticamente).toBe(false)
    expect(produtoDosDados({ ...rica, sugerirAutomaticamente: true, nome: 'Rosquinha de coco' }).sugerirAutomaticamente).toBe(false)
    expect(produtoDosDados({ ...rica, sugerirAutomaticamente: true }).sugerirAutomaticamente).toBe(true)
  })

  it('CA-1357 (D-494): com porção do rótulo, a sugestão não passa dela', () => {
    const id = registrarComAChave({ ...rica, tipo: 'rotulo', base: 'porcao', porcaoG: 30, nomeDaPorcao: '1 unidade', fonte: { tipo: 'rotulo' }, valores: { energia_kcal: 34, proteina_g: 0.7, carboidrato_g: 7.5, lipideos_g: 0.1, ferro_mg: 3 } })
    const sugestao = sugerirParaCobrir('ferro_mg', vazio, adequacao, { gastoEnergetico: 2000, alimentos: alimentosParaSugerir() }).sugestoes.find((s) => s.alimentoId === id)
    expect(sugestao?.gramas).toBeLessThanOrEqual(30)
  })
})

describe('restrição pelo grupo do alimento próprio (D-492)', () => {
  const vazio = totaisDeItens([], buscarAlimento)
  const adequacao = calcularAdequacao(vazio, { sexo: 'F', idadeAnos: 30, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
  const aplv = montarRestricoes({ marcadas: ['leite'], texto: '', doencas: [], naoGosta: '' })
  const COALHO: DadosAlimentoProprio = {
    ...CUSCUZ,
    nome: 'Coalho do Sertão',
    nomeParaPaciente: '',
    grupo: 'Leite e derivados',
    preparo: 'pronto para consumo',
    // Rico em cálcio, para vir entre as 5 sugestões quando nada o tira, e gordo como o queijo minas, para ser troca dele.
    valores: { energia_kcal: 260, proteina_g: 17, carboidrato_g: 3, lipideos_g: 20, calcio_mg: 1200 },
    medidas: [],
    sugerirAutomaticamente: true,
  }

  it('CA-1348: com alergia a leite, o coalho não entra no Cobrir nem nas trocas, e a janela de imprimir o cita', () => {
    const salvo = criarRepositorioProdutos(new Memoria()).salvar(produtoDosDados(COALHO))
    registrarProdutos([produtoComoAlimento(salvo)])
    const cobrir = (restricoes = aplv) => sugerirParaCobrir('calcio_mg', vazio, adequacao, { gastoEnergetico: 2000, alimentos: alimentosParaSugerir(), restricoes }).sugestoes.map((s) => s.alimentoId)
    // Sem a alergia, ele é sugerido: a restrição é o que tira.
    expect(cobrir(montarRestricoes({ marcadas: [], texto: '', doencas: [], naoGosta: '' }))).toContain(salvo.id)
    expect(cobrir()).not.toContain(salvo.id)
    const queijo = ALIMENTOS.find((a) => a.descricao.trim() === 'Queijo, minas, frescal')
    if (!queijo) throw new Error('sem queijo')
    const trocas = (restricoes: typeof aplv) => trocasDoAlimento({ alimentoId: queijo.id, gramas: 30 }, { alimentos: alimentosParaSugerir(), restricoes, porAlimento: 50 }).map((t) => t.alimentoId)
    expect(trocas(montarRestricoes({ marcadas: [], texto: '', doencas: [], naoGosta: '' }))).toContain(salvo.id)
    expect(trocas(aplv)).not.toContain(salvo.id)
    const plano: Plano = { refeicoes: [{ id: 'r', nome: 'Lanche da tarde', horario: '16:00', opcoes: { principal: [{ id: 'i', alimentoId: salvo.id, gramas: 30 }], substituto1: [], substituto2: [] } }] }
    expect(avisosParaImprimir(plano, buscarAlimento, aplv)).toEqual(['Este plano tem Coalho do Sertão, e a ficha diz Alergia: leite e derivados. Confira antes de imprimir.'])
  })
})

describe('receita como alimento (CA-1149, CB-377)', () => {
  const receita = (ingredientes: Receita['ingredientes']): Receita => ({
    id: 'r1',
    nome: 'Panqueca de banana',
    ingredientes,
    porcoes: 2,
    nomeDaPorcao: 'unidade',
    pesoProntoG: 200,
    preparo: '',
    criadoEm: 'x',
    atualizadoEm: 'x',
  })

  it('vira preparação por 100 g da receita pronta, com a porção como medida', () => {
    const r = receitaComoAlimento(receita([{ alimentoId: 182, gramas: 150 }, { alimentoId: 489, gramas: 100 }, { alimentoId: 7, gramas: 30 }]), buscarAlimento)
    if (!('dados' in r)) throw new Error(r.motivo)
    const total = totaisDeItens([{ id: 'a', alimentoId: 182, gramas: 150 }, { id: 'b', alimentoId: 489, gramas: 100 }, { id: 'c', alimentoId: 7, gramas: 30 }], buscarAlimento)
    expect(r.dados).toMatchObject({ tipo: 'preparacao', nome: 'Panqueca de banana', grupo: 'Alimentos preparados', base: 'por100', medidas: [{ nome: 'unidade', gramas: 100 }] })
    expect(r.dados.valores.energia_kcal).toBeCloseTo((total.nutrientes.energia_kcal.total * 100) / 200, 2)
    // A vitamina A falta em algum ingrediente: fica nula, nunca zero.
    expect(r.dados.valores.vitamina_a_rae_mcg).toBeNull()
    expect(validarAlimentoProprio(r.dados).problemas).toEqual([])
  })

  it('sem um macro em algum ingrediente, explica e não vira', () => {
    const r = receitaComoAlimento(receita([{ alimentoId: 591, gramas: 100 }, { alimentoId: 7, gramas: 30 }]), buscarAlimento)
    expect('motivo' in r ? r.motivo : '').toMatch(/Sem os 4 macros/)
  })

  // A massa da panqueca (banana, ovo e aveia) com mais um ingrediente.
  const comMais = (alimentoId: number, gramas: number) => receita([{ alimentoId: 182, gramas: 150 }, { alimentoId: 489, gramas: 100 }, { alimentoId: 7, gramas: 30 }, { alimentoId, gramas }])
  const MASSA = totaisDeItens([{ id: 'a', alimentoId: 182, gramas: 150 }, { id: 'b', alimentoId: 489, gramas: 100 }, { id: 'c', alimentoId: 7, gramas: 30 }], buscarAlimento).nutrientes

  it('CA-1358 (D-495): óleo, azeite e sal contam zero no que não se aplica, e a receita vira alimento', () => {
    for (const [alimentoId, gramas] of [
      [272, 10],
      [260, 10],
      [517, 2],
    ] as const) {
      const r = receitaComoAlimento(comMais(alimentoId, gramas), buscarAlimento)
      if (!('dados' in r)) throw new Error(`${alimentoId}: ${r.motivo}`)
      // A proteína é só a da massa: o óleo, o azeite e o sal não somam nada (pronta, a receita pesa 200 g).
      expect(r.dados.valores.proteina_g, String(alimentoId)).toBeCloseTo((MASSA.proteina_g.total * 100) / 200, 1)
    }
    const comOleo = receitaComoAlimento(comMais(272, 10), buscarAlimento)
    if (!('dados' in comOleo)) throw new Error(comOleo.motivo)
    // A energia do óleo entra (884 kcal em 100 g).
    expect(comOleo.dados.valores.energia_kcal).toBeCloseTo(((MASSA.energia_kcal.total + 88.4) * 100) / 200, 0)
  })

  it('CA-1359: o macro que falta de verdade e o ingrediente excluído são nomeados', () => {
    const coco = receitaComoAlimento(comMais(591, 50), buscarAlimento)
    expect('motivo' in coco ? coco.motivo : '').toBe('“Coco, verde, cru” não tem energia na tabela. Sem os 4 macros, a receita não vira alimento: troque esse ingrediente ou cadastre a preparação em Meus alimentos.')
    const excluido = receitaComoAlimento(comMais(999_999, 50), buscarAlimento)
    expect('motivo' in excluido ? excluido.motivo : '').toBe('Um ingrediente desta receita foi excluído de Meus alimentos. Troque-o na receita para salvá-la como alimento.')
  })

  it('D-495: a lista do que não se aplica é só de óleos, azeites, sais e aguardente, e só onde a tabela é vazia', () => {
    expect(MACROS_QUE_NAO_SE_APLICAM.size).toBe(11)
    for (const [id, chaves] of MACROS_QUE_NAO_SE_APLICAM) {
      const alimento = buscarAlimento(id)
      expect(alimento?.descricao, String(id)).toMatch(/^(Óleo|Azeite|Sal|Cana, aguardente)/)
      for (const chave of chaves) expect(alimento?.nutrientes[chave], `${id} ${chave}`).toBeNull()
    }
  })

  it('CB-464 e CB-465: com óleo e coco verde, o aviso nomeia o coco; os micros do óleo continuam nulos', () => {
    const r = receitaComoAlimento(receita([{ alimentoId: 272, gramas: 10 }, { alimentoId: 591, gramas: 50 }]), buscarAlimento)
    expect('motivo' in r ? r.motivo : '').toMatch(/^“Coco, verde, cru”/)
    const comOleo = receitaComoAlimento(comMais(272, 10), buscarAlimento)
    if (!('dados' in comOleo)) throw new Error(comOleo.motivo)
    expect(comOleo.dados.valores.calcio_mg).toBeNull()
  })
})

describe('a medida caseira da porção no formulário novo (publicação 2, D-491)', () => {
  const GRANOLA: DadosAlimentoProprio = {
    ...dadosEmBranco('rotulo'),
    nome: 'Granola tradicional',
    grupo: 'Cereais e derivados',
    porcaoG: 40,
    nomeDaPorcao: '4 colheres de sopa',
    valores: { energia_kcal: 170, proteina_g: 4, carboidrato_g: 26, lipideos_g: 5.6 },
  }

  it('CA-1346: "4 colheres de sopa" de 40 g grava a colher de 10 g; "pote" grava "1 pote"', () => {
    const granola = produtoDosDados(GRANOLA)
    expect(granola.medidaCaseira).toBe('4 colheres de sopa')
    expect(granola.medidas).toEqual([{ nome: 'colher de sopa', gramas: 10 }])
    const iogurte = produtoDosDados({ ...GRANOLA, nome: 'Iogurte natural', porcaoG: 170, nomeDaPorcao: 'pote' })
    expect(iogurte.medidaCaseira).toBe('1 pote')
    expect(iogurte.medidas).toEqual([{ nome: 'pote', gramas: 170 }])
    const leite = produtoDosDados({ ...GRANOLA, nome: 'Bebida de aveia', unidade: 'ml', porcaoG: 200, nomeDaPorcao: '1 copo (200 ml)' })
    expect(leite.medidas).toEqual([{ nome: 'copo', gramas: 200 }])
  })

  it('CA-1360 (D-496): "2 fatias" com 50 g na lista grava a fatia de 25 g, e o paciente lê "2 fatias (50 g)"', () => {
    const pao: DadosAlimentoProprio = { ...CUSCUZ, nome: 'Pão caseiro de macaxeira', tipo: 'preparacao', medidas: [{ nome: '2 fatias', gramas: 50 }] }
    const salvo = criarRepositorioProdutos(new Memoria()).salvar(produtoDosDados(pao))
    expect(salvo.medidas).toEqual([{ nome: 'fatia', gramas: 25 }])
    registrarProdutos([produtoComoAlimento(salvo)])
    expect(textoDaQuantidade(quantidadeNaFolha(salvo.id, 50, 'medida-e-gramas'))).toBe('2 fatias (50 g)')
    expect(buscarAlimentos('2 fatias de pão caseiro', alimentosComProdutos()).resultados[0]).toMatchObject({ gramas: 50, medida: { nome: 'fatia', quantidade: 2 } })
  })

  it('CA-1347: o rótulo antigo com "4 colheres de sopa" abre e salva sem perder a medida', () => {
    const repo = criarRepositorioProdutos(new Memoria())
    const antigo = repo.salvar({ nome: 'Granola tradicional', marca: '', porcaoG: 40, medidaCaseira: '4 colheres de sopa', porPorcao: { energia_kcal: 170, proteina_g: 4, carboidrato_g: 26, lipideos_g: 5.6 } })
    const noFormulario = dadosDoProduto(antigo)
    expect(noFormulario).toMatchObject({ nomeDaPorcao: '4 colheres de sopa', medidas: [] })
    const salvo = repo.salvar(produtoDosDados({ ...noFormulario, grupo: 'Cereais e derivados' }, antigo.id))
    expect(salvo.medidaCaseira).toBe('4 colheres de sopa')
    registrarProdutos([produtoComoAlimento(salvo)])
    expect(medidasDoAlimento(salvo.id)).toContainEqual({ nome: 'colher de sopa', gramas: 10 })
    // Salvo pelo formulário novo, reabre igual: a colher que veio da porção não se repete na lista de medidas.
    expect(dadosDoProduto(salvo)).toMatchObject({ nomeDaPorcao: '4 colheres de sopa', medidas: [] })
  })
})
