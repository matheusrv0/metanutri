// % de gordura, massa gorda, massa magra e soma de dobras (spec antropometria-completa, D-1018, D-1019 e D-1042).
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { deAte, idadeValida, linhaSemValor, medidaValida, situacaoNaFaixa, type CampoQueFalta, type Detalhe, type FaixaRotulada, type LinhaDoResultado } from './linhaDoResultado.ts'
import {
  NOME_DA_DOBRA,
  aplicacaoDoProtocolo,
  calcularProtocolo,
  protocoloPorId,
  valoresDasDobras,
  type IdProtocolo,
  type OpcoesDoProtocolo,
  type PacienteDoProtocolo,
  type RecusaDoProtocolo,
  type ResultadoDoProtocolo,
} from './protocolosDeDobras.ts'
import type { Caso, Sexo } from './tipos.ts'

export interface OpcoesDaGordura extends OpcoesDoProtocolo {
  /** O protocolo da conta; sem ele, o do plano (`composicao.protocolo`). */
  readonly protocolo?: IdProtocolo
}

export const pacienteDoProtocolo = (caso: Caso): PacienteDoProtocolo => ({
  sexo: caso.sexo,
  idadeAnos: idadeValida(caso.idadeAnos),
  pesoKg: caso.pesoKg,
  estaturaCm: caso.estaturaCm,
  gestante: caso.condicao.tipo === 'gestante',
})

const protocoloDoCaso = (caso: Caso, opcoes: OpcoesDaGordura): IdProtocolo => opcoes.protocolo ?? caso.composicao.protocolo

export const resultadoDasDobras = (caso: Caso, opcoes: OpcoesDaGordura = {}): ResultadoDoProtocolo =>
  calcularProtocolo(protocoloDoCaso(caso, opcoes), pacienteDoProtocolo(caso), caso.composicao.dobras, opcoes)

export interface GorduraDoCaso {
  readonly gorduraPct: number
  readonly origem: 'dobras' | 'bioimpedancia'
  /** "Jackson & Pollock, 3 dobras" ou "Bioimpedância (InBody 270)". */
  readonly metodo: string
  /** A da equação e a da conversão; vazio na bioimpedância. */
  readonly fontes: readonly Fonte[]
  readonly massaGordaKg: number | null
  readonly massaMagraKg: number | null
  readonly detalhes: readonly Detalhe[]
  readonly avisos: readonly string[]
  /** As dobras que recusaram quando a bioimpedância entrou no lugar (D-1042); `null` nos outros casos. */
  readonly dobrasRecusadas: RecusaDoProtocolo | null
}

/** D-1042: a bioimpedância no lugar das dobras que o protocolo recusou. */
export const avisoDaBioimpedanciaNoLugar = (recusa: RecusaDoProtocolo): string => `As dobras não calcularam (${recusa.causa}): usado o % da bioimpedância.`

const NOME_DA_CONVERSAO = { siri: 'Siri', brozek: 'Brozek', lohman: 'Lohman' } as const

/** D-1019: das dobras, quando o protocolo calcula; senão, da bioimpedância (D-1042: dizendo a recusa); nenhum dos dois, `null`. */
export function gorduraDoCaso(caso: Caso, opcoes: OpcoesDaGordura = {}): GorduraDoCaso | null {
  const dobras = resultadoDasDobras(caso, opcoes)
  if (dobras.calculou) {
    const detalhes: Detalhe[] = []
    if (dobras.densidade !== null) detalhes.push({ tipo: 'numero', rotulo: 'Densidade corporal', valor: dobras.densidade, unidade: 'g/ml', casas: 5 })
    if (dobras.conversao !== null) detalhes.push({ tipo: 'texto', rotulo: 'Conversão', texto: NOME_DA_CONVERSAO[dobras.conversao] })
    return {
      gorduraPct: dobras.gorduraPct,
      origem: 'dobras',
      metodo: dobras.protocolo.nome,
      fontes: dobras.fontes,
      massaGordaKg: dobras.massaGordaKg,
      massaMagraKg: dobras.massaMagraKg,
      detalhes,
      avisos: dobras.avisos,
      dobrasRecusadas: null,
    }
  }
  if (caso.condicao.tipo === 'gestante') return null
  const { bioimpedancia } = caso.composicao
  const pct = medidaValida(bioimpedancia.gorduraPct)
  if (pct === null || pct >= 70) return null
  const peso = medidaValida(caso.pesoKg)
  const massaGordaKg = peso === null ? null : (peso * pct) / 100
  // Como `completarBioimpedancia`: a massa magra do aparelho, quando ele dá; senão, peso − massa gorda.
  const massaMagraKg = medidaValida(bioimpedancia.massaMagraKg) ?? (peso === null || massaGordaKg === null ? null : peso - massaGordaKg)
  const aparelho = bioimpedancia.aparelho.trim()
  const { recusa } = dobras
  return {
    gorduraPct: pct,
    origem: 'bioimpedancia',
    metodo: aparelho === '' ? 'Bioimpedância' : `Bioimpedância (${aparelho})`,
    fontes: [],
    massaGordaKg,
    massaMagraKg,
    detalhes: [],
    avisos: recusa === null ? [] : [avisoDaBioimpedanciaNoLugar(recusa)],
    dobrasRecusadas: recusa,
  }
}

/** Gallagher et al. 2000, Tabela 4 (brancos e afro-americanos) [V2 em reproduções]: faixa saudável por sexo e idade. */
const gallagher = (saudavel: number, sobrepeso: number, obesidade: number): FaixaRotulada[] => [
  { ...deAte(null, saudavel), rotulo: 'Abaixo do saudável', nivel: 'atencao' },
  { ...deAte(saudavel, sobrepeso), rotulo: 'Saudável', nivel: 'adequado' },
  { ...deAte(sobrepeso, obesidade), rotulo: 'Sobrepeso', nivel: 'atencao' },
  { ...deAte(obesidade, null), rotulo: 'Obesidade', nivel: 'alterado' },
]
const GALLAGHER: Readonly<Record<Sexo, readonly { readonly de: number; readonly ate: number; readonly saudavel: readonly [number, number]; readonly faixas: readonly FaixaRotulada[] }[]>> = {
  M: [
    { de: 20, ate: 39, saudavel: [8, 20], faixas: gallagher(8, 20, 25) },
    { de: 40, ate: 59, saudavel: [11, 22], faixas: gallagher(11, 22, 28) },
    { de: 60, ate: 79, saudavel: [13, 25], faixas: gallagher(13, 25, 30) },
  ],
  F: [
    { de: 20, ate: 39, saudavel: [21, 33], faixas: gallagher(21, 33, 39) },
    { de: 40, ate: 59, saudavel: [23, 34], faixas: gallagher(23, 34, 40) },
    { de: 60, ate: 79, saudavel: [24, 36], faixas: gallagher(24, 36, 42) },
  ],
}

/** Onde começa o sobrepeso de Gallagher 2000 para o sexo e a idade (20 a 79 anos); fora disso, `null`. */
export function inicioDoSobrepesoDeGallagher(sexo: Sexo, idadeAnos: number): number | null {
  return GALLAGHER[sexo].find((f) => idadeAnos >= f.de && idadeAnos <= f.ate)?.saudavel[1] ?? null
}

const faltaDaDobra = (d: keyof Caso['composicao']['dobras']): CampoQueFalta => ({ campo: `composicao.dobras.${d}`, nome: `a dobra ${NOME_DA_DOBRA[d]}` })
const NOME_DA_ENTRADA_NO_PLANO = {
  sexo: { campo: 'sexo', nome: 'o sexo' },
  idade: { campo: 'idadeAnos', nome: 'a idade' },
  peso: { campo: 'pesoKg', nome: 'o peso' },
  estatura: { campo: 'estaturaCm', nome: 'a estatura' },
  maturacao: { campo: 'maturacao', nome: 'a maturação sexual (estágio de Tanner)' },
  grupo: { campo: 'grupo', nome: 'o grupo do estudo (branco ou negro)' },
} as const satisfies Readonly<Record<string, CampoQueFalta>>

/** O que falta para o protocolo do plano calcular: as dobras e as entradas. */
function faltaDoProtocolo(caso: Caso, opcoes: OpcoesDaGordura): CampoQueFalta[] {
  const ap = aplicacaoDoProtocolo(protocoloDoCaso(caso, opcoes), pacienteDoProtocolo(caso), caso.composicao.dobras, opcoes)
  return [...ap.entradasQueFaltam.map((e) => NOME_DA_ENTRADA_NO_PLANO[e]), ...ap.dobrasQueFaltam.map(faltaDaDobra)]
}

/** Sem % de gordura: o motivo da recusa das dobras, sem nada faltando (D-1042), ou o que falta (D-1016). */
function linhaSemGordura(caso: Caso, opcoes: OpcoesDaGordura, linha: Pick<LinhaDoResultado, 'id' | 'nome' | 'unidade' | 'casas'>, avisosDaFalta: readonly string[]): LinhaDoResultado {
  const dobras = resultadoDasDobras(caso, opcoes)
  if (!dobras.calculou && dobras.recusa !== null) return linhaSemValor(linha, [], [dobras.motivo])
  return linhaSemValor(linha, faltaDoProtocolo(caso, opcoes), avisosDaFalta)
}

const detalheDoMetodo = (g: GorduraDoCaso): Detalhe => ({
  tipo: 'texto',
  rotulo: 'Método',
  texto: g.fontes.length === 0 ? g.metodo : `${g.metodo} (${g.fontes.map((f) => f.curta).join('; ')})`,
})

/** % de gordura com a faixa de Gallagher 2000; fora de 20 a 79 anos, sem referência (D-1018). */
export function linhaGordura(caso: Caso, opcoes: OpcoesDaGordura = {}): LinhaDoResultado | null {
  if (caso.condicao.tipo === 'gestante') return null
  const linha = { id: 'gordura', nome: 'Gordura corporal', unidade: '%', casas: 1 } as const
  const g = gorduraDoCaso(caso, opcoes)
  if (!g) return linhaSemGordura(caso, opcoes, linha, ['Ou informe o % de gordura da bioimpedância.'])
  const { sexo } = caso
  const idadeAnos = idadeValida(caso.idadeAnos)
  const detalhes = [detalheDoMetodo(g), ...g.detalhes]
  // D-1040: sem sexo ou sem idade, a faixa diz o que falta (não "sem referência para a idade").
  if (sexo === null || idadeAnos === null) {
    return { ...linhaSemValor(linha, [...(sexo === null ? [NOME_DA_ENTRADA_NO_PLANO.sexo] : []), ...(idadeAnos === null ? [NOME_DA_ENTRADA_NO_PLANO.idade] : [])]), valor: g.gorduraPct, detalhes, avisos: g.avisos }
  }
  const faixa = GALLAGHER[sexo].find((f) => idadeAnos >= f.de && idadeAnos <= f.ate)
  if (!faixa) {
    return { ...linhaSemValor(linha, []), valor: g.gorduraPct, detalhes, avisos: [...g.avisos, 'Gallagher et al. (2000) cobre de 20 a 79 anos: sem referência para a idade.'] }
  }
  const [min, max] = faixa.saudavel
  return {
    ...linha,
    valor: g.gorduraPct,
    recomendacao: { texto: `${min}% a < ${max}%`, faixa: deAte(min, max) },
    situacao: situacaoNaFaixa(g.gorduraPct, linha.casas, faixa.faixas),
    fonte: FONTES.gallagher2000,
    detalhes,
    falta: [],
    avisos: g.avisos,
  }
}

/** Massa gorda e massa magra (massa livre de gordura): só o valor; nenhuma faixa tem fonte (D-1018). */
function linhaDeMassa(caso: Caso, opcoes: OpcoesDaGordura, id: 'massa-gorda' | 'massa-magra'): LinhaDoResultado | null {
  if (caso.condicao.tipo === 'gestante') return null
  const linha = { id, nome: id === 'massa-gorda' ? 'Massa gorda' : 'Massa magra (livre de gordura)', unidade: 'kg', casas: 1 } as const
  const g = gorduraDoCaso(caso, opcoes)
  if (!g) return linhaSemGordura(caso, opcoes, linha, [])
  // D-1042: com a bioimpedância no lugar das dobras recusadas, as massas também dizem por quê.
  const avisos = g.dobrasRecusadas === null ? [] : [avisoDaBioimpedanciaNoLugar(g.dobrasRecusadas)]
  const valor = id === 'massa-gorda' ? g.massaGordaKg : g.massaMagraKg
  if (valor === null) return linhaSemValor(linha, [{ campo: 'pesoKg', nome: 'o peso' }], avisos)
  return { ...linhaSemValor(linha, []), valor, fonte: g.fontes[0] ?? null, detalhes: [detalheDoMetodo(g)], avisos }
}

export const linhaMassaGorda = (caso: Caso, opcoes: OpcoesDaGordura = {}) => linhaDeMassa(caso, opcoes, 'massa-gorda')
export const linhaMassaMagra = (caso: Caso, opcoes: OpcoesDaGordura = {}) => linhaDeMassa(caso, opcoes, 'massa-magra')

/** Soma das dobras exigidas pelo protocolo, em mm, sem referência; incompleta, sem valor e com a parcial (D-1018). */
export function linhaSomaDeDobras(caso: Caso, opcoes: OpcoesDaGordura = {}): LinhaDoResultado | null {
  if (caso.condicao.tipo === 'gestante') return null
  const protocolo = protocoloPorId(protocoloDoCaso(caso, opcoes))
  const linha = { id: 'soma-de-dobras', nome: 'Soma de dobras', unidade: 'mm', casas: 1 } as const
  if (!protocolo) return null
  if (caso.sexo === null) return linhaSemValor(linha, [{ campo: 'sexo', nome: 'o sexo' }])
  const exigidas = protocolo.porSexo[caso.sexo].dobras
  // D-1039: a suprailíaca pela linha do protocolo, a mesma escolha da conta.
  const { valores: medidas, avisos: avisosDaLinha } = valoresDasDobras(exigidas, caso.composicao.dobras)
  const parcial = medidas.reduce<number>((total, v) => total + (v ?? 0), 0)
  const faltam = exigidas.filter((_, i) => medidas[i] === null)
  const detalhes: Detalhe[] = [{ tipo: 'texto', rotulo: 'Protocolo', texto: protocolo.nome }]
  if (faltam.length > 0) {
    const comParcial: Detalhe[] = faltam.length < exigidas.length ? [...detalhes, { tipo: 'numero', rotulo: 'Soma parcial', valor: parcial, unidade: 'mm', casas: 1 }] : detalhes
    return { ...linhaSemValor(linha, faltam.map(faltaDaDobra), ['A soma está incompleta: faltam dobras do protocolo.', ...avisosDaLinha]), detalhes: comParcial }
  }
  return { ...linhaSemValor(linha, [], avisosDaLinha), valor: parcial, fonte: protocolo.porSexo[caso.sexo].fonte, detalhes }
}
