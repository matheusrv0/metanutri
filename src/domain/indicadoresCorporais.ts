// IMC por fase da vida, cintura, RCQ, RCE, pescoço e panturrilha do idoso (spec antropometria-completa, D-1017 e
// D-1020 a D-1023, D-1029). Medidas em cm e kg; cada linha decide a situação nas casas que a tela mostra (D-1001).
import referencias from '../data/antropometria.json'
import { IDADE_ADULTO, IDADE_IDOSO, avaliarAntropometria, calcularImc } from './antropometria.ts'
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import {
  deAte,
  idadeValida,
  linhaSemValor,
  medidaValida,
  naPrecisao,
  situacaoNaFaixa,
  type CampoQueFalta,
  type Detalhe,
  type FaixaRotulada,
  type LinhaDoResultado,
  type NivelDaSituacao,
} from './linhaDoResultado.ts'
import type { Caso, PontoDaCintura, Sexo } from './tipos.ts'

export type FaseDaVida = 'crianca-adolescente' | 'adulto' | 'idoso' | 'gestante'

/** A fase que escolhe a referência do IMC: até 19 anos, curvas da OMS; de 20 a 59, adulto; de 60 em diante, idoso. */
export function faseDaVida(caso: Pick<Caso, 'idadeAnos' | 'condicao'>): FaseDaVida | null {
  if (caso.condicao.tipo === 'gestante') return 'gestante'
  const idade = idadeValida(caso.idadeAnos)
  if (idade === null) return null
  if (idade < IDADE_ADULTO) return 'crianca-adolescente'
  return idade < IDADE_IDOSO ? 'adulto' : 'idoso'
}

export const CAMPOS = {
  sexo: { campo: 'sexo', nome: 'o sexo' },
  idade: { campo: 'idadeAnos', nome: 'a idade' },
  peso: { campo: 'pesoKg', nome: 'o peso' },
  estatura: { campo: 'estaturaCm', nome: 'a estatura' },
  cintura: { campo: 'circunferenciaCinturaCm', nome: 'a cintura' },
  quadril: { campo: 'medidasCorporais.quadrilCm', nome: 'o quadril' },
  pescoco: { campo: 'medidasCorporais.pescocoCm', nome: 'o pescoço' },
  panturrilha: { campo: 'circunferenciaPanturrilhaCm', nome: 'a panturrilha' },
  pesoPreGestacional: { campo: 'condicao.pesoPreGestacionalKg', nome: 'o peso pré-gestacional' },
} as const satisfies Readonly<Record<string, CampoQueFalta>>

/** Converte as faixas de `antropometria.json` (com `classe`) em faixas com rótulo e nível. */
type FaixaDoJson = { readonly classe: string; readonly min: number | null; readonly minInclusivo: boolean; readonly max: number | null; readonly maxInclusivo: boolean }
const comNivel = (faixas: readonly FaixaDoJson[], nivel: Readonly<Record<string, NivelDaSituacao>>): FaixaRotulada[] =>
  faixas.map((f) => ({ min: f.min, minInclusivo: f.minInclusivo, max: f.max, maxInclusivo: f.maxInclusivo, rotulo: f.classe, nivel: nivel[f.classe] ?? 'informativo' }))

const NIVEL_DO_IMC: Readonly<Record<string, NivelDaSituacao>> = {
  'Baixo peso': 'alterado',
  Eutrofia: 'adequado',
  Sobrepeso: 'atencao',
  'Obesidade grau I': 'alterado',
  'Obesidade grau II': 'grave',
  'Obesidade grau III': 'grave',
  // Curvas da OMS (criança e adolescente).
  'Magreza acentuada': 'grave',
  Magreza: 'alterado',
  'Risco de sobrepeso': 'atencao',
  Obesidade: 'alterado',
  'Obesidade grave': 'grave',
}

/** SISVAN 2011 (Quadro 16) com a obesidade dividida nos graus da OMS 2000, como o motor de hoje (D-1017). */
const IMC_ADULTO: readonly FaixaRotulada[] = comNivel(
  [...referencias.imcAdulto.faixas.filter((f) => f.classe !== 'Obesidade'), ...referencias.imcAdulto.grausObesidade.faixas],
  NIVEL_DO_IMC,
)
/** SISVAN 2011 (Quadro 18), Lipschitz/NSI 1994: ≤ 22,0 baixo peso; > 22,0 e < 27,0 eutrofia; ≥ 27,0 sobrepeso. */
const IMC_IDOSO: readonly FaixaRotulada[] = comNivel(referencias.imcIdoso.faixas, NIVEL_DO_IMC)

const NIVEL_DA_GESTACAO: Readonly<Record<string, NivelDaSituacao>> = { 'baixo-peso': 'alterado', eutrofia: 'adequado', sobrepeso: 'atencao', obesidade: 'alterado' }

const base = (id: LinhaDoResultado['id'], nome: string, unidade: string, casas: number) => ({ id, nome, unidade, casas })

const faltasDe = (pares: readonly [boolean, CampoQueFalta][]): CampoQueFalta[] => pares.filter(([falta]) => falta).map(([, campo]) => campo)

/** O IMC da fase da vida (D-1017). `null` só quando a pessoa não tem fase (sem idade e fora da gestação não é o caso). */
export function linhaImc(caso: Caso): LinhaDoResultado | null {
  const fase = faseDaVida(caso)
  if (fase === 'gestante') return linhaImcPreGestacional(caso)
  if (fase === 'crianca-adolescente') return linhaImcParaIdade(caso)

  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  const linha = base('imc', 'IMC', 'kg/m²', 2)
  const falta = faltasDe([
    [peso === null, CAMPOS.peso],
    [estatura === null, CAMPOS.estatura],
  ])
  if (peso === null || estatura === null) return linhaSemValor(linha, [...falta, ...(fase === null ? [CAMPOS.idade] : [])])
  const valor = calcularImc(peso, estatura)
  if (fase === null) return { ...linhaSemValor(linha, [CAMPOS.idade]), valor }

  const idoso = fase === 'idoso'
  return {
    ...linha,
    valor,
    recomendacao: idoso
      ? { texto: '> 22,0 e < 27,0 kg/m²', faixa: { min: 22, minInclusivo: false, max: 27, maxInclusivo: false } }
      : { texto: '18,50 – 24,99 kg/m²', faixa: deAte(18.5, 25) },
    situacao: situacaoNaFaixa(valor, linha.casas, idoso ? IMC_IDOSO : IMC_ADULTO),
    fonte: idoso ? FONTES.nsi1994 : FONTES.sisvan2011,
    detalhes: [],
    falta: [],
    avisos: idoso ? ['A Caderneta da Pessoa Idosa usa < 22 e > 27: a classe só muda com IMC de 22,0 ou 27,0 exatos.'] : [],
  }
}

/** Criança e adolescente: o escore-z e a classe do motor de hoje (curvas da OMS), com o IMC no detalhe. */
function linhaImcParaIdade(caso: Caso): LinhaDoResultado {
  const linha = base('imc', 'IMC para a idade', 'escore-z', 2)
  const r = avaliarAntropometria(caso).imcIdade
  if (!r) {
    const falta = faltasDe([
      [caso.sexo === null, CAMPOS.sexo],
      [medidaValida(caso.pesoKg) === null, CAMPOS.peso],
      [medidaValida(caso.estaturaCm) === null, CAMPOS.estatura],
    ])
    return linhaSemValor(linha, falta, falta.length === 0 ? ['Confira a idade, o peso e a estatura.'] : [])
  }
  return {
    ...linha,
    valor: r.z,
    recomendacao: { texto: 'escore-z de −2 a +1', faixa: { min: -2, minInclusivo: true, max: 1, maxInclusivo: true } },
    situacao: { rotulo: r.classe, nivel: NIVEL_DO_IMC[r.classe] ?? 'informativo' },
    fonte: FONTES.who2006e2007,
    detalhes: [
      { tipo: 'numero', rotulo: 'IMC', valor: r.valorImc, unidade: 'kg/m²', casas: 2 },
      { tipo: 'numero', rotulo: 'Idade da curva', valor: r.mesesReferencia, unidade: 'meses', casas: 0 },
    ],
    falta: [],
    avisos: [],
  }
}

/** Gestante: o IMC pré-gestacional e o ganho de peso das curvas brasileiras (Kac 2021), como o motor de hoje. */
function linhaImcPreGestacional(caso: Caso): LinhaDoResultado {
  const linha = base('imc', 'IMC pré-gestacional', 'kg/m²', 2)
  const r = avaliarAntropometria(caso)
  const g = r.gestacao
  if (!g) {
    const preGestacional = caso.condicao.tipo === 'gestante' ? caso.condicao.pesoPreGestacionalKg : null
    const falta = faltasDe([
      [medidaValida(caso.pesoKg) === null, CAMPOS.peso],
      [medidaValida(caso.estaturaCm) === null, CAMPOS.estatura],
      [medidaValida(preGestacional) === null, CAMPOS.pesoPreGestacional],
    ])
    return linhaSemValor(linha, falta, falta.length === 0 ? r.avisos : [])
  }
  const detalhes: Detalhe[] = [
    { tipo: 'numero', rotulo: 'Ganho recomendado até 40 semanas, mínimo', valor: g.ganhoRecomendadoKg.min, unidade: 'kg', casas: 1 },
    { tipo: 'numero', rotulo: 'Ganho recomendado até 40 semanas, máximo', valor: g.ganhoRecomendadoKg.max, unidade: 'kg', casas: 1 },
    { tipo: 'numero', rotulo: 'Ganho de peso até agora', valor: g.ganhoAtualKg, unidade: 'kg', casas: 1 },
  ]
  return {
    ...linha,
    valor: g.imcPreGestacional,
    recomendacao: { texto: '18,50 – 24,99 kg/m²', faixa: deAte(18.5, 25) },
    situacao: { rotulo: g.rotulo, nivel: NIVEL_DA_GESTACAO[g.classe] ?? 'informativo' },
    fonte: FONTES.kac2021,
    detalhes,
    falta: [],
    avisos: r.avisos,
  }
}

/** Adulto de 20 anos ou mais, fora da gestação: onde cintura, RCQ, RCE e pescoço valem. */
const adultoForaDaGestacao = (caso: Caso) => (idadeValida(caso.idadeAnos) ?? -1) >= IDADE_ADULTO && caso.condicao.tipo !== 'gestante'

const PONTOS: readonly PontoDaCintura[] = ['ponto-medio', 'crista-iliaca', 'menor-perimetro']
/** O ponto gravado; um valor que esta versão não conhece vira `desconhecido` (CB-1008). */
function pontoDaCintura(caso: Caso): PontoDaCintura | null | 'desconhecido' {
  const p: unknown = caso.medidasCorporais.pontoDaCintura
  if (p === null || p === undefined) return null
  return PONTOS.find((conhecido) => conhecido === p) ?? 'desconhecido'
}

const AVISO_SEM_PONTO = 'O ponto da cintura não foi registrado: a referência assume o ponto médio entre a última costela e a crista ilíaca.'
const AVISO_PONTO_SEM_CORTE = 'Os cortes da OMS foram definidos no ponto médio entre a última costela e a crista ilíaca: neste ponto, sem classificação.'

const NIVEL_DA_CINTURA: Readonly<Record<string, NivelDaSituacao>> = {
  'Sem risco aumentado': 'adequado',
  'Risco aumentado': 'atencao',
  'Risco substancialmente aumentado': 'alterado',
}

/** OMS 2000 (TRS 894, Tabela 2.2) e SISVAN: ≥ 94 e ≥ 102 cm (homem); ≥ 80 e ≥ 88 cm (mulher) (D-1020). */
const CINTURA_OMS: Readonly<Record<Sexo, readonly FaixaRotulada[]>> = {
  M: comNivel(referencias.cintura.M, NIVEL_DA_CINTURA),
  F: comNivel(referencias.cintura.F, NIVEL_DA_CINTURA),
}
/** NHLBI 1998, cintura no topo da crista ilíaca: > 102 cm (homem) e > 88 cm (mulher) (D-1004). */
const corteNih = (corte: number): FaixaRotulada[] => [
  { min: null, minInclusivo: false, max: corte, maxInclusivo: true, rotulo: 'Sem risco aumentado', nivel: 'adequado' },
  { min: corte, minInclusivo: false, max: null, maxInclusivo: false, rotulo: 'Risco aumentado', nivel: 'alterado' },
]
const CINTURA_NIH: Readonly<Record<Sexo, readonly FaixaRotulada[]>> = { M: corteNih(102), F: corteNih(88) }

export function linhaCintura(caso: Caso): LinhaDoResultado | null {
  if (!adultoForaDaGestacao(caso)) return null
  const linha = base('cintura', 'Cintura', 'cm', 1)
  const cintura = medidaValida(caso.circunferenciaCinturaCm)
  const { sexo } = caso
  if (cintura === null || sexo === null) return linhaSemValor(linha, faltasDe([[sexo === null, CAMPOS.sexo], [cintura === null, CAMPOS.cintura]]))
  const ponto = pontoDaCintura(caso)
  const semClassificacao = (aviso: string): LinhaDoResultado => ({ ...linhaSemValor(linha, []), valor: cintura, avisos: [aviso] })
  if (ponto === 'crista-iliaca') {
    const corte = sexo === 'M' ? 102 : 88
    return {
      ...linha,
      valor: cintura,
      recomendacao: { texto: `Até ${corte} cm`, faixa: { min: null, minInclusivo: false, max: corte, maxInclusivo: true } },
      situacao: situacaoNaFaixa(cintura, linha.casas, CINTURA_NIH[sexo]),
      fonte: FONTES.nhlbi1998,
      detalhes: [{ tipo: 'texto', rotulo: 'Ponto', texto: 'topo da crista ilíaca' }],
      falta: [],
      avisos: [],
    }
  }
  if (ponto === 'menor-perimetro') return semClassificacao('Os cortes da OMS e do NIH não foram definidos para o menor perímetro: sem classificação.')
  if (ponto === 'desconhecido') return semClassificacao('Ponto da cintura não reconhecido: sem classificação.')
  const corte = sexo === 'M' ? 94 : 80
  return {
    ...linha,
    valor: cintura,
    recomendacao: { texto: `Abaixo de ${corte} cm`, faixa: deAte(null, corte) },
    situacao: situacaoNaFaixa(cintura, linha.casas, CINTURA_OMS[sexo]),
    fonte: FONTES.cinturaOms,
    detalhes: [],
    falta: [],
    avisos: ponto === null ? [AVISO_SEM_PONTO] : [],
  }
}

/** OMS 2011, Tabela A1: ≥ 0,90 (homem) e ≥ 0,85 (mulher), risco substancialmente aumentado (D-1021). */
const rcqOms = (corte: number): FaixaRotulada[] => [
  { ...deAte(null, corte), rotulo: 'Sem risco aumentado', nivel: 'adequado' },
  { ...deAte(corte, null), rotulo: 'Risco substancialmente aumentado', nivel: 'alterado' },
]
const RCQ_OMS: Readonly<Record<Sexo, { readonly corte: number; readonly faixas: readonly FaixaRotulada[] }>> = {
  M: { corte: 0.9, faixas: rcqOms(0.9) },
  F: { corte: 0.85, faixas: rcqOms(0.85) },
}

/**
 * Bray & Gray 1988, in Heyward & Stolarczyk 1996 [V2 em reproduções]: abaixo do teto do baixo; [x, y] inclusivos no
 * moderado e no alto; acima do teto do alto, muito alto (pesquisa 3.5).
 */
const brayGray = (baixo: number, moderadoMax: number, altoMin: number, altoMax: number): FaixaRotulada[] => [
  { ...deAte(null, baixo), rotulo: 'Risco baixo', nivel: 'adequado' },
  { min: baixo, minInclusivo: true, max: moderadoMax, maxInclusivo: true, rotulo: 'Risco moderado', nivel: 'atencao' },
  { min: altoMin, minInclusivo: true, max: altoMax, maxInclusivo: true, rotulo: 'Risco alto', nivel: 'alterado' },
  { min: altoMax, minInclusivo: false, max: null, maxInclusivo: false, rotulo: 'Risco muito alto', nivel: 'grave' },
]
const BRAY_GRAY: Readonly<Record<Sexo, readonly { readonly de: number; readonly ate: number; readonly baixo: number; readonly faixas: readonly FaixaRotulada[] }[]>> = {
  M: [
    { de: 20, ate: 29, baixo: 0.83, faixas: brayGray(0.83, 0.88, 0.89, 0.94) },
    { de: 30, ate: 39, baixo: 0.84, faixas: brayGray(0.84, 0.91, 0.92, 0.96) },
    { de: 40, ate: 49, baixo: 0.88, faixas: brayGray(0.88, 0.95, 0.96, 1.0) },
    { de: 50, ate: 59, baixo: 0.9, faixas: brayGray(0.9, 0.96, 0.97, 1.02) },
    { de: 60, ate: 69, baixo: 0.91, faixas: brayGray(0.91, 0.98, 0.99, 1.03) },
  ],
  F: [
    { de: 20, ate: 29, baixo: 0.71, faixas: brayGray(0.71, 0.77, 0.78, 0.82) },
    { de: 30, ate: 39, baixo: 0.72, faixas: brayGray(0.72, 0.78, 0.79, 0.84) },
    { de: 40, ate: 49, baixo: 0.73, faixas: brayGray(0.73, 0.79, 0.8, 0.87) },
    { de: 50, ate: 59, baixo: 0.74, faixas: brayGray(0.74, 0.81, 0.82, 0.88) },
    { de: 60, ate: 69, baixo: 0.76, faixas: brayGray(0.76, 0.83, 0.84, 0.9) },
  ],
}

/** Ex.: 0,83 → "0,83". */
const comVirgula = (n: number) => n.toFixed(2).replace('.', ',')

export function linhaRcq(caso: Caso, referencia: 'oms' | 'bray-gray' = 'oms'): LinhaDoResultado | null {
  if (!adultoForaDaGestacao(caso)) return null
  const linha = base('rcq', 'Razão cintura/quadril', '', 2)
  const cintura = medidaValida(caso.circunferenciaCinturaCm)
  const quadril = medidaValida(caso.medidasCorporais.quadrilCm)
  const { sexo } = caso
  const idadeAnos = idadeValida(caso.idadeAnos)
  if (cintura === null || quadril === null || sexo === null) {
    return linhaSemValor(linha, faltasDe([[sexo === null, CAMPOS.sexo], [cintura === null, CAMPOS.cintura], [quadril === null, CAMPOS.quadril]]))
  }
  const valor = cintura / quadril
  const ponto = pontoDaCintura(caso)
  if (ponto !== null && ponto !== 'ponto-medio') return { ...linhaSemValor(linha, []), valor, avisos: [AVISO_PONTO_SEM_CORTE] }
  const avisos = ponto === null ? [AVISO_SEM_PONTO] : []
  const faixaEtaria = referencia === 'bray-gray' ? BRAY_GRAY[sexo].find((f) => idadeAnos !== null && idadeAnos >= f.de && idadeAnos <= f.ate) : undefined
  if (faixaEtaria) {
    return {
      ...linha,
      valor,
      recomendacao: { texto: `Abaixo de ${comVirgula(faixaEtaria.baixo)}`, faixa: deAte(null, faixaEtaria.baixo) },
      situacao: situacaoNaFaixa(valor, linha.casas, faixaEtaria.faixas),
      fonte: FONTES.brayGray1988,
      detalhes: [],
      falta: [],
      avisos,
    }
  }
  if (referencia === 'bray-gray') avisos.push('Bray & Gray cobre de 20 a 69 anos: usada a referência da OMS.')
  const oms = RCQ_OMS[sexo]
  return {
    ...linha,
    valor,
    recomendacao: { texto: `Abaixo de ${comVirgula(oms.corte)}`, faixa: deAte(null, oms.corte) },
    situacao: situacaoNaFaixa(valor, linha.casas, oms.faixas),
    fonte: FONTES.who2011,
    detalhes: [],
    falta: [],
    avisos,
  }
}

/** NICE NG246 (2025), rec. 1.9.14; rótulos traduzidos por nós (D-1022). */
const RCE_NICE: readonly FaixaRotulada[] = [
  { ...deAte(null, 0.4), rotulo: 'Abaixo da faixa de referência', nivel: 'informativo' },
  { ...deAte(0.4, 0.5), rotulo: 'Saudável', nivel: 'adequado' },
  { ...deAte(0.5, 0.6), rotulo: 'Risco aumentado', nivel: 'atencao' },
  { ...deAte(0.6, null), rotulo: 'Risco alto', nivel: 'alterado' },
]

export function linhaRce(caso: Caso): LinhaDoResultado | null {
  if (!adultoForaDaGestacao(caso)) return null
  const linha = base('rce', 'Razão cintura/estatura', '', 2)
  const cintura = medidaValida(caso.circunferenciaCinturaCm)
  const estatura = medidaValida(caso.estaturaCm)
  if (cintura === null || estatura === null) return linhaSemValor(linha, faltasDe([[cintura === null, CAMPOS.cintura], [estatura === null, CAMPOS.estatura]]))
  const valor = cintura / estatura
  const ponto = pontoDaCintura(caso)
  if (ponto !== null && ponto !== 'ponto-medio') return { ...linhaSemValor(linha, []), valor, avisos: [AVISO_PONTO_SEM_CORTE] }
  const peso = medidaValida(caso.pesoKg)
  if (peso !== null && naPrecisao(calcularImc(peso, estatura), 2) >= 35) {
    return { ...linhaSemValor(linha, []), valor, avisos: ['O NICE não usa a razão cintura/estatura com IMC de 35 ou mais.'] }
  }
  return {
    ...linha,
    valor,
    recomendacao: { texto: '0,40 – 0,49', faixa: deAte(0.4, 0.5) },
    situacao: situacaoNaFaixa(valor, linha.casas, RCE_NICE),
    fonte: FONTES.nice2025,
    detalhes: [],
    falta: [],
    avisos: ponto === null ? [AVISO_SEM_PONTO] : [],
  }
}

/** Ben-Noun 2001: ≥ 37 cm (homem) e ≥ 34 cm (mulher) [V2]; o 2º nível (39,5 / 36,5) é [V1] e fica fora (D-1023). */
const pescocoBenNoun = (corte: number): FaixaRotulada[] => [
  { ...deAte(null, corte), rotulo: 'Sem indicação de excesso de peso', nivel: 'adequado' },
  { ...deAte(corte, null), rotulo: 'Indica avaliar excesso de peso', nivel: 'atencao' },
]

export function linhaPescoco(caso: Caso): LinhaDoResultado | null {
  if (!adultoForaDaGestacao(caso)) return null
  const linha = base('pescoco', 'Pescoço', 'cm', 1)
  const pescoco = medidaValida(caso.medidasCorporais.pescocoCm)
  const { sexo } = caso
  if (pescoco === null || sexo === null) return linhaSemValor(linha, faltasDe([[sexo === null, CAMPOS.sexo], [pescoco === null, CAMPOS.pescoco]]))
  const corte = sexo === 'M' ? 37 : 34
  return {
    ...linha,
    valor: pescoco,
    recomendacao: { texto: `Abaixo de ${corte} cm`, faixa: deAte(null, corte) },
    situacao: situacaoNaFaixa(pescoco, linha.casas, pescocoBenNoun(corte)),
    fonte: FONTES.benNoun2001,
    detalhes: [],
    falta: [],
    avisos: ['Rótulos traduzidos por nós: o corte indica IMC de 25 ou mais (Ben-Noun et al., 2001).'],
  }
}

const NIVEL_DA_PANTURRILHA: Readonly<Record<string, NivelDaSituacao>> = { 'Indicativo de redução de massa muscular': 'alterado', Adequada: 'adequado' }

/** O lado que tem a medida: o direito; sem ele, o outro (D-1003). */
export function ladoMedido(direito: number | null, esquerdo: number | null): { readonly valor: number; readonly detalhe: Detalhe | null } | null {
  const d = medidaValida(direito)
  if (d !== null) return { valor: d, detalhe: null }
  const e = medidaValida(esquerdo)
  return e === null ? null : { valor: e, detalhe: { tipo: 'texto', rotulo: 'Lado', texto: 'esquerdo' } }
}

/** Idoso: Pagotto 2018 (< 34 cm no homem; < 33 cm na mulher), com a nota dos 31 cm da OMS, como hoje (D-1029). */
export function linhaPanturrilha(caso: Caso): LinhaDoResultado | null {
  if ((idadeValida(caso.idadeAnos) ?? -1) < referencias.panturrilha.idadeMin) return null
  const linha = base('panturrilha', 'Panturrilha', 'cm', 1)
  const medida = ladoMedido(caso.circunferenciaPanturrilhaCm, caso.medidasCorporais.panturrilhaEsquerdaCm)
  const { sexo } = caso
  if (medida === null || sexo === null) return linhaSemValor(linha, faltasDe([[sexo === null, CAMPOS.sexo], [medida === null, CAMPOS.panturrilha]]))
  const corte = sexo === 'M' ? 34 : 33
  const fonte: Fonte = FONTES.pagotto2018
  return {
    ...linha,
    valor: medida.valor,
    recomendacao: { texto: `${corte} cm ou mais`, faixa: deAte(corte, null) },
    situacao: situacaoNaFaixa(medida.valor, linha.casas, comNivel(referencias.panturrilha[sexo], NIVEL_DA_PANTURRILHA)),
    fonte,
    detalhes: medida.detalhe ? [medida.detalhe] : [],
    falta: [],
    avisos: [referencias.panturrilha.nota],
  }
}
