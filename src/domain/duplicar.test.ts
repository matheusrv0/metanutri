import { criarCasoVazio } from './caso.ts'
import { NA_DUPLICACAO, duplicarCaso, nomeDaCopia, type NaDuplicacao } from './duplicar.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import type { Caso } from './tipos.ts'

const contador = (prefixo = 'id') => {
  let n = 0
  return () => `${prefixo}-${++n}`
}

const registro = (mudanca: Partial<Caso> = {}) => {
  const gerar = contador()
  const caso: Caso = { ...criarCasoVazio('antigo'), nome: 'Maria, retorno', pacienteId: 'p1', pesoKg: 68, dataConsulta: '2026-01-10', ...mudanca }
  const padrao = criarPlanoPadrao(gerar)
  const primeira = padrao.refeicoes[0]
  if (!primeira) throw new Error('O plano padrão precisa ter ao menos uma refeição.')
  const plano = adicionarItem(padrao, primeira.id, 'principal', { alimentoId: 1, gramas: 100 }, gerar)
  return { caso, plano }
}

/** O plano do CA-1096: todo campo preenchido, e diferente do plano vazio, para a cópia não acertar por acaso. */
const COMPLETO: Partial<Caso> = {
  diagnosticoClinico: 'Hipertensão',
  sexo: 'M',
  idadeAnos: 35,
  idadeMesesAdicionais: 7,
  pesoKg: 82,
  estaturaCm: 170,
  ocupacao: 'Professor',
  estagiario: 'Ana Souza',
  preceptor: 'Dra. Lia',
  objetivo: 'emagrecer',
  observacoes: 'Prefere jantar cedo.',
  circunferenciaCinturaCm: 94,
  circunferenciaPanturrilhaCm: 36,
  condicao: { tipo: 'nenhuma' },
  modo: 'completo',
  metaEnergiaKcal: 2100,
  medidasCorporais: {
    bracoRelaxadoDireitoCm: 31,
    bracoRelaxadoEsquerdoCm: 30.5,
    bracoContraidoDireitoCm: 33,
    bracoContraidoEsquerdoCm: 32.5,
    antebracoCm: 27,
    punhoCm: 17,
    pescocoCm: 38,
    ombroCm: 112,
    peitoralCm: 98,
    pontoDaCintura: 'ponto-medio',
    abdomenCm: 97,
    quadrilCm: 102,
    coxaDireitaCm: 55,
    coxaEsquerdaCm: 54.5,
    coxaProximalDireitaCm: 60,
    coxaProximalEsquerdaCm: 59.5,
    panturrilhaEsquerdaCm: 35.5,
    diametroPunhoCm: 5.8,
    diametroCotoveloCm: 7,
    diametroJoelhoCm: 9.8,
    alturaDoJoelhoCm: 52,
    semienvergaduraCm: 86,
  },
  composicao: {
    protocolo: 'faulkner-4',
    dobras: {
      tricipital: 12,
      subescapular: 18,
      suprailiaca: 20,
      abdominal: 25,
      peitoral: 10,
      coxa: 15,
      bicipital: 6,
      supraespinal: 14,
      axilarMedia: 13,
      panturrilhaMedial: 11,
      suprailiacaAnt: 19,
      suprailiacaMed: 21,
    },
    bioimpedancia: { gorduraPct: 28, massaMagraKg: 59, aguaPct: 52, aparelho: 'InBody 270' },
  },
  energia: { fator: 1.55, formula: 'harris-benedict', getManual: 2300 },
  metasMacros: { proteina: { tipo: 'g_kg', min: 1.2, max: 1.6 } },
  adequacao: { preset: { tipo: 'coletivo' }, porcaoMaximaG: 150, incluirIngredientes: true, ocultos: [7] },
  orientacoes: 'Beba água ao longo do dia.',
  receitas: 'Bolo de banana',
  quantidades: 'gramas',
  linhaDaAgua: 'Beba 2 litros.',
  metodoAgua: 'ml-kcal',
  aguaLitros: 2.4,
}

type Arvore = { readonly [chave: string]: NaDuplicacao | Arvore }

/** Os caminhos ("composicao.dobras.coxa") de uma classe na lista do D-367. */
const caminhos = (classe: NaDuplicacao, arvore: Arvore = NA_DUPLICACAO, antes = ''): string[] =>
  Object.entries(arvore).flatMap(([chave, valor]) =>
    typeof valor === 'string' ? (valor === classe ? [`${antes}${chave}`] : []) : caminhos(classe, valor, `${antes}${chave}.`),
  )

const valorEm = (objeto: unknown, caminho: string): unknown =>
  caminho.split('.').reduce<unknown>((atual, chave) => (atual !== null && typeof atual === 'object' ? (atual as Record<string, unknown>)[chave] : undefined), objeto)

/** Toda chave do valor está na lista, e toda chave da lista está no valor, descendo onde a lista desce. */
const conferirClassificacao = (valor: object, arvore: Arvore, antes = ''): string[] => {
  const doValor = Object.keys(valor)
  const daLista = Object.keys(arvore)
  const faltando = doValor.filter((c) => !daLista.includes(c)).map((c) => `sem classificação: ${antes}${c}`)
  const sobrando = daLista.filter((c) => !doValor.includes(c)).map((c) => `classificado e inexistente: ${antes}${c}`)
  const dentro = daLista.flatMap((c) => {
    const ramo = arvore[c]
    const v: unknown = (valor as Record<string, unknown>)[c]
    return typeof ramo === 'object' && v !== null && typeof v === 'object' ? conferirClassificacao(v, ramo, `${antes}${c}.`) : []
  })
  return [...faltando, ...sobrando, ...dentro]
}

describe('nomeDaCopia', () => {
  it('acrescenta (cópia) ao nome', () => {
    expect(nomeDaCopia('Maria, retorno')).toBe('Maria, retorno (cópia)')
  })

  it('numera a partir da segunda cópia em vez de empilhar parênteses', () => {
    expect(nomeDaCopia('Maria (cópia)')).toBe('Maria (cópia 2)')
    expect(nomeDaCopia('Maria (cópia 2)')).toBe('Maria (cópia 3)')
  })

  it('plano sem nome vira "Cópia do plano"', () => {
    expect(nomeDaCopia('   ')).toBe('Cópia do plano')
  })
})

describe('duplicarCaso', () => {
  it('CB-356 (spec ficha-unica): plano sem paciente continua com o peso', () => {
    const copia = duplicarCaso(registro({ pacienteId: null }), contador('copia'), { hoje: '2026-09-16' })
    expect(copia.caso.pesoKg).toBe(68)
  })

  it('troca o id do caso e o de cada item do plano', () => {
    const original = registro()
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-09-16' })

    expect(copia.caso.id).not.toBe(original.caso.id)
    const idsOriginais = original.plano.refeicoes.flatMap((r) => [r.id, ...r.opcoes.principal.map((i) => i.id)])
    const idsCopia = copia.plano.refeicoes.flatMap((r) => [r.id, ...r.opcoes.principal.map((i) => i.id)])
    expect(idsCopia.some((id) => idsOriginais.includes(id))).toBe(false)
  })

  it('CA-1072 (spec ficha-unica): mantém paciente e alimentos, põe a data de hoje e deixa o peso vazio no retorno', () => {
    const original = registro()
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-09-16' })

    expect(copia.caso.pacienteId).toBe('p1')
    expect(copia.caso.pesoKg).toBeNull()
    expect(copia.caso.dataConsulta).toBe('2026-09-16')
    expect(copia.plano.refeicoes[0]?.opcoes.principal[0]?.alimentoId).toBe(original.plano.refeicoes[0]?.opcoes.principal[0]?.alimentoId)
  })

  it('mexer na cópia não mexe no original', () => {
    const original = registro()
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-09-16' })
    expect(original.caso.nome).toBe('Maria, retorno')
    expect(copia.caso.nome).toBe('Maria, retorno (cópia)')
  })
})

describe('medidas do dia na duplicação (spec ficha-unica, D-367)', () => {
  it('D-367: todo campo do plano tem classificação, e só os que existem', () => {
    expect(conferirClassificacao(criarCasoVazio('x'), NA_DUPLICACAO)).toEqual([])
    expect(conferirClassificacao({ ...criarCasoVazio('x'), ...COMPLETO }, NA_DUPLICACAO)).toEqual([])
  })

  it('D-367: a lista das medidas do dia é esta, e só a cópia ganha id, nome e data novos', () => {
    expect(caminhos('medida do dia')).toEqual([
      'pesoKg',
      'circunferenciaCinturaCm',
      'circunferenciaPanturrilhaCm',
      // CA-2002 (spec antropometria-completa): as medidas novas também são do dia.
      'medidasCorporais.bracoRelaxadoDireitoCm',
      'medidasCorporais.bracoRelaxadoEsquerdoCm',
      'medidasCorporais.bracoContraidoDireitoCm',
      'medidasCorporais.bracoContraidoEsquerdoCm',
      'medidasCorporais.antebracoCm',
      'medidasCorporais.punhoCm',
      'medidasCorporais.pescocoCm',
      'medidasCorporais.ombroCm',
      'medidasCorporais.peitoralCm',
      'medidasCorporais.abdomenCm',
      'medidasCorporais.quadrilCm',
      'medidasCorporais.coxaDireitaCm',
      'medidasCorporais.coxaEsquerdaCm',
      'medidasCorporais.coxaProximalDireitaCm',
      'medidasCorporais.coxaProximalEsquerdaCm',
      'medidasCorporais.panturrilhaEsquerdaCm',
      'composicao.dobras.tricipital',
      'composicao.dobras.subescapular',
      'composicao.dobras.suprailiaca',
      'composicao.dobras.abdominal',
      'composicao.dobras.peitoral',
      'composicao.dobras.coxa',
      'composicao.dobras.bicipital',
      'composicao.dobras.supraespinal',
      'composicao.dobras.axilarMedia',
      'composicao.dobras.panturrilhaMedial',
      'composicao.dobras.suprailiacaAnt',
      'composicao.dobras.suprailiacaMed',
      'composicao.bioimpedancia.gorduraPct',
      'composicao.bioimpedancia.massaMagraKg',
      'composicao.bioimpedancia.aguaPct',
    ])
    expect(caminhos('medida do dia abaixo de 20 anos')).toEqual([
      'estaturaCm',
      // D-1041 (spec antropometria-completa): comprimentos e diâmetros ósseos vão como a estatura.
      'medidasCorporais.diametroPunhoCm',
      'medidasCorporais.diametroCotoveloCm',
      'medidasCorporais.diametroJoelhoCm',
      'medidasCorporais.alturaDoJoelhoCm',
      'medidasCorporais.semienvergaduraCm',
    ])
    expect(caminhos('novo')).toEqual(['id', 'nome', 'dataConsulta'])
  })

  it('CA-1096: no retorno de um paciente adulto, toda medida do dia vem vazia', () => {
    const original = registro(COMPLETO)
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-11-03', nascimento: '1991-03-20' })

    for (const caminho of caminhos('medida do dia')) {
      expect.soft(valorEm(original.caso, caminho), caminho).not.toBeNull()
      expect.soft(valorEm(copia.caso, caminho), caminho).toBeNull()
    }
    expect(copia.caso.circunferenciaCinturaCm).toBeNull()
    expect(copia.caso.circunferenciaPanturrilhaCm).toBeNull()
    expect(copia.caso.composicao.dobras).toEqual({
      tricipital: null,
      subescapular: null,
      suprailiaca: null,
      abdominal: null,
      peitoral: null,
      coxa: null,
      bicipital: null,
      supraespinal: null,
      axilarMedia: null,
      panturrilhaMedial: null,
      suprailiacaAnt: null,
      suprailiacaMed: null,
    })
    expect(copia.caso.composicao.bioimpedancia).toEqual({ gorduraPct: null, massaMagraKg: null, aguaPct: null, aparelho: 'InBody 270' })
  })

  it('CA-1096: o que é do paciente, da prescrição, do documento e a preferência vão iguais', () => {
    const original = registro(COMPLETO)
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-11-03', nascimento: '1991-03-20' })

    for (const caminho of caminhos('copiado')) expect.soft(valorEm(copia.caso, caminho), caminho).toEqual(valorEm(original.caso, caminho))
    expect(copia.caso.estaturaCm).toBe(170)
    expect(copia.caso.composicao.protocolo).toBe('faulkner-4')
    // CA-2002 (spec antropometria-completa): o ponto da cintura é protocolo, não medida: vai igual.
    expect(copia.caso.medidasCorporais.pontoDaCintura).toBe('ponto-medio')
    expect(copia.caso.medidasCorporais.quadrilCm).toBeNull()
    expect(copia.caso.composicao.bioimpedancia.aparelho).toBe('InBody 270')
    expect(copia.caso.energia).toEqual({ fator: 1.55, formula: 'harris-benedict', getManual: 2300 })
    expect(copia.caso.aguaLitros).toBe(2.4)
  })

  it('CA-1097: a estatura vai só para quem tem 20 anos ou mais na data nova, pela ficha', () => {
    const comNascimento = (nascimento: string) =>
      duplicarCaso(registro({ ...COMPLETO, estaturaCm: 150, idadeAnos: null }), contador('copia'), { hoje: '2026-11-03', nascimento }).caso.estaturaCm

    expect(comNascimento('2014-05-01')).toBeNull() // 12 anos
    expect(comNascimento('2007-05-01')).toBeNull() // 19 anos
    expect(comNascimento('2006-11-04')).toBeNull() // faz 20 amanhã
    expect(comNascimento('2006-11-03')).toBe(150) // 20 anos hoje
    expect(comNascimento('1991-03-20')).toBe(150) // 35 anos
  })

  it('CA-1097: a idade da ficha vale mais que a gravada no plano de origem', () => {
    // O plano dizia 35 anos, mas a ficha corrigida dá 12: quem decide é a ficha (D-341).
    const copia = duplicarCaso(registro({ ...COMPLETO, idadeAnos: 35 }), contador('copia'), { hoje: '2026-11-03', nascimento: '2014-05-01' })
    expect(copia.caso.estaturaCm).toBeNull()
  })

  it('CA-1097: sem data de nascimento na ficha, decide a idade gravada no plano de origem', () => {
    const semFicha = (idadeAnos: number) => duplicarCaso(registro({ ...COMPLETO, idadeAnos }), contador('copia'), { hoje: '2026-11-03' }).caso.estaturaCm
    expect(semFicha(17)).toBeNull()
    expect(semFicha(20)).toBe(170)
    expect(semFicha(35)).toBe(170)
    // Data de nascimento estragada é o mesmo que não ter.
    expect(duplicarCaso(registro({ ...COMPLETO, idadeAnos: 35 }), contador('copia'), { hoje: '2026-11-03', nascimento: '20/03/1991' }).caso.estaturaCm).toBe(170)
  })

  it('CA-2087 (spec antropometria-completa): altura do joelho, semienvergadura e diâmetros vão como a estatura', () => {
    const OSSOS = ['diametroPunhoCm', 'diametroCotoveloCm', 'diametroJoelhoCm', 'alturaDoJoelhoCm', 'semienvergaduraCm'] as const
    const ossos = (caso: Caso) => OSSOS.map((k) => caso.medidasCorporais[k])
    const adulto = duplicarCaso(registro(COMPLETO), contador('copia'), { hoje: '2026-11-03', nascimento: '1991-03-20' }).caso
    expect(ossos(adulto)).toEqual(ossos(registro(COMPLETO).caso))
    expect(ossos(adulto).every((v) => v !== null)).toBe(true)
    expect(adulto.medidasCorporais.quadrilCm).toBeNull()
    expect(adulto.composicao.dobras.tricipital).toBeNull()
    const adolescente = duplicarCaso(registro(COMPLETO), contador('copia'), { hoje: '2026-11-03', nascimento: '2009-05-01' }).caso
    expect(ossos(adolescente)).toEqual([null, null, null, null, null])
    const semIdade = duplicarCaso(registro({ ...COMPLETO, idadeAnos: null }), contador('copia'), { hoje: '2026-11-03', nascimento: null }).caso
    expect(ossos(semIdade)).toEqual([null, null, null, null, null])
  })

  it('CB-359: sem idade conhecida, a estatura fica vazia', () => {
    const copia = duplicarCaso(registro({ ...COMPLETO, idadeAnos: null }), contador('copia'), { hoje: '2026-11-03', nascimento: null })
    expect(copia.caso.estaturaCm).toBeNull()
  })

  it('CA-1098: plano sem paciente leva todas as medidas', () => {
    const original = registro({ ...COMPLETO, pacienteId: null, idadeAnos: 12 })
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-11-03' })

    const semOsNovos = (caso: Caso): Caso => ({ ...caso, id: '', nome: '', dataConsulta: null })
    expect(semOsNovos(copia.caso)).toEqual(semOsNovos(original.caso))
    expect(copia.caso.estaturaCm).toBe(170)
  })

  it('D-367: duplicar não mexe nas medidas do plano de origem', () => {
    const original = registro(COMPLETO)
    const antes = structuredClone(original.caso)
    duplicarCaso(original, contador('copia'), { hoje: '2026-11-03', nascimento: '2014-05-01' })
    expect(original.caso).toEqual(antes)
  })
})
