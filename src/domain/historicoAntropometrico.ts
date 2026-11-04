// O Histórico da antropometria (spec antropometria-telas, D-1425 a D-1428 e D-1480 a D-1488): as avaliações do
// paciente, da mais velha à mais nova, com a tabela, os gráficos, a mudança mínima detectável e a leitura em frase.
// Cada número vem do motor (`gorduraDoCaso`, `linhaSomaDeDobras`, `ladoMedido`, `compararAvaliacoes`,
// `compararSomasDeDobras`); aqui só se escolhe o que comparar e como escrever.
//
// Mudança mínima detectável: MMD95 = 1,96 × √2 × ETM (Weir JP, J Strength Cond Res 2005;19(1):231-40), com o ETM padrão
// da ISAK nível 1 (7,5% nas dobras e 1,5% nas outras medidas) e a soma de dobras por √Σ ETM² (D-1035).
import { calcularImc } from './antropometria.ts'
import type { AvaliacaoNaLista } from './avaliacoesDoPaciente.ts'
import { casoComFicha } from './fichaNoPlano.ts'
import { dataCompleta, dataCurta } from './formatarData.ts'
import { ladoMedido } from './indicadoresCorporais.ts'
import { gorduraDoCaso, linhaSomaDeDobras, type OpcoesDaGordura } from './indicadoresDeGordura.ts'
import { medidaValida, naPrecisao } from './linhaDoResultado.ts'
import { compararAvaliacoes, compararSomasDeDobras, type ComparacaoDeAvaliacoes } from './mudancaMinima.ts'
import type { Paciente } from './pacientes.ts'
import { protocoloPorId, valoresDasDobras, type IdProtocolo } from './protocolosDeDobras.ts'
import type { Caso, PontoDaCintura } from './tipos.ts'

/** Uma avaliação do Histórico: o plano completo como vale, com a ficha na data dele (D-340). */
export interface AvaliacaoDoHistorico {
  readonly casoId: string
  /** AAAA-MM-DD: a data da consulta; sem ela, o dia da última alteração (D-1404). */
  readonly data: string
  readonly caso: Caso
}

/** As avaliações da lista (D-1404, da mais nova à mais velha) com a ficha na data de cada uma, da mais velha à mais nova. */
export function avaliacoesParaHistorico(lista: readonly AvaliacaoNaLista[], paciente: Paciente | null, hoje: string): AvaliacaoDoHistorico[] {
  return [...lista].reverse().map((a) => ({ casoId: a.casoId, data: a.data, caso: casoComFicha(a.registro.caso, paciente, hoje).caso }))
}

/** O que o motor pede além do plano: a maturação e o grupo do estudo do Slaughter (D-1012, D-1435). */
export const opcoesDoMotor = (caso: Caso): OpcoesDaGordura => ({ maturacao: caso.avaliacao.maturacao, grupo: caso.avaliacao.grupoDoEstudo })

// --- Números -----------------------------------------------------------------------------------------------------

const formatadores = new Map<number, Intl.NumberFormat>()

/** O número em pt-BR com `casas` casas: "71,5", "1.510". */
export function formatarNumero(valor: number, casas: number): string {
  let f = formatadores.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatadores.set(casas, f)
  }
  return f.format(valor)
}

/** A variação com o sinal do protótipo: "+0,2", "−4,0" (o menos tipográfico) e "0,0" sem sinal. */
export function comSinal(valor: number, casas: number): string {
  const exibido = naPrecisao(valor, casas)
  const sinal = exibido > 0 ? '+' : exibido < 0 ? '−' : ''
  return `${sinal}${formatarNumero(Math.abs(exibido), casas)}`
}

/** "29,5%", "71,5 kg", "0,81": a unidade colada no % e separada nas outras. */
export function numeroComUnidade(valor: number, casas: number, unidade: string): string {
  const numero = formatarNumero(valor, casas)
  if (unidade === '') return numero
  return unidade === '%' ? `${numero}%` : `${numero} ${unidade}`
}

/** A diferença como a tela mostra: entre os dois valores já nas casas da tela, para a conta fechar com a tabela. */
const diferencaExibida = (antes: number, depois: number, casas: number) => naPrecisao(depois, casas) - naPrecisao(antes, casas)

const pontosDePercentual = (diferenca: number) => (Math.abs(naPrecisao(diferenca, 1)) >= 2 ? 'pontos' : 'ponto')

// --- As medidas de uma avaliação ------------------------------------------------------------------------------------

const NOME_DO_PONTO: Readonly<Record<PontoDaCintura, string>> = {
  'ponto-medio': 'ponto médio (OMS)',
  'crista-iliaca': 'crista ilíaca (NIH)',
  'menor-perimetro': 'menor perímetro',
}

/** O nome do ponto da cintura para o texto; o não registrado (e o de uma versão mais nova) também diz isso. */
export const nomeDoPonto = (ponto: PontoDaCintura | null): string => (ponto !== null && ponto in NOME_DO_PONTO ? NOME_DO_PONTO[ponto] : 'ponto não registrado')

interface GorduraDaAvaliacao {
  readonly pct: number
  readonly origem: 'dobras' | 'bioimpedancia'
  /** "Jackson & Pollock, 7 dobras" ou "Bioimpedância (InBody 270)". */
  readonly metodo: string
  /** O protocolo nas dobras; `bioimpedancia` no aparelho: o que decide se dois % se comparam (D-1480). */
  readonly chave: IdProtocolo | 'bioimpedancia'
  /** "Siri", "Lohman", "Brozek"; `null` nas equações que dão o % direto e na bioimpedância. */
  readonly conversao: string | null
  readonly massaGorda: number | null
  readonly massaMagra: number | null
}

interface MedidasDaAvaliacao {
  readonly avaliacao: AvaliacaoDoHistorico
  readonly peso: number | null
  readonly imc: number | null
  readonly cintura: number | null
  /** O ponto como vale na comparação: o não registrado conta como o médio, como o motor assume (D-1482). */
  readonly ponto: PontoDaCintura
  readonly pontoRegistrado: boolean
  readonly quadril: number | null
  readonly rcq: number | null
  readonly rce: number | null
  readonly braco: { readonly valor: number; readonly lado: 'direito' | 'esquerdo' } | null
  readonly protocolo: IdProtocolo
  readonly nomeDoProtocolo: string | null
  /** Quantas dobras o protocolo pede para o sexo; `null` sem sexo ou com protocolo desconhecido. */
  readonly dobrasDoProtocolo: number | null
  /** Os valores das dobras do protocolo, na ordem dele (a suprailíaca pela linha, D-1039). */
  readonly valoresDasDobras: readonly (number | null)[] | null
  readonly soma: number | null
  /** Alguma dobra digitada: só então o protocolo da avaliação conta para comparar (o plano sem dobra tem o padrão). */
  readonly temDobra: boolean
  readonly gordura: GorduraDaAvaliacao | null
}

function gorduraDa(caso: Caso): GorduraDaAvaliacao | null {
  const g = gorduraDoCaso(caso, opcoesDoMotor(caso))
  if (g === null) return null
  const conversao = g.detalhes.find((d) => d.tipo === 'texto' && d.rotulo === 'Conversão')
  return {
    pct: g.gorduraPct,
    origem: g.origem,
    metodo: g.metodo,
    chave: g.origem === 'dobras' ? caso.composicao.protocolo : 'bioimpedancia',
    conversao: conversao?.tipo === 'texto' ? conversao.texto : null,
    massaGorda: g.massaGordaKg,
    massaMagra: g.massaMagraKg,
  }
}

function medidasDa(avaliacao: AvaliacaoDoHistorico): MedidasDaAvaliacao {
  const { caso } = avaliacao
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  const cintura = medidaValida(caso.circunferenciaCinturaCm)
  const quadril = medidaValida(caso.medidasCorporais.quadrilCm)
  const registrado = caso.medidasCorporais.pontoDaCintura
  const lado = ladoMedido(caso.medidasCorporais.bracoRelaxadoDireitoCm, caso.medidasCorporais.bracoRelaxadoEsquerdoCm)
  const protocolo = protocoloPorId(caso.composicao.protocolo)
  const exigidas = protocolo && caso.sexo ? protocolo.porSexo[caso.sexo].dobras : null
  const soma = linhaSomaDeDobras(caso, opcoesDoMotor(caso))?.valor ?? null
  return {
    avaliacao,
    peso,
    imc: peso !== null && estatura !== null ? calcularImc(peso, estatura) : null,
    cintura,
    ponto: registrado ?? 'ponto-medio',
    pontoRegistrado: registrado !== null,
    quadril,
    rcq: cintura !== null && quadril !== null ? cintura / quadril : null,
    rce: cintura !== null && estatura !== null ? cintura / estatura : null,
    braco: lado === null ? null : { valor: lado.valor, lado: lado.detalhe === null ? 'direito' : 'esquerdo' },
    protocolo: caso.composicao.protocolo,
    nomeDoProtocolo: protocolo?.nome ?? null,
    dobrasDoProtocolo: exigidas?.length ?? null,
    valoresDasDobras: exigidas ? valoresDasDobras(exigidas, caso.composicao.dobras).valores : null,
    soma,
    temDobra: Object.values(caso.composicao.dobras).some((v) => medidaValida(v) !== null),
    gordura: gorduraDa(caso),
  }
}

// --- A variação entre duas avaliações (D-1428, D-1480 a D-1482, D-1485) ---------------------------------------------

export type IdDaMedidaDoHistorico = 'peso' | 'imc' | 'cintura' | 'quadril' | 'rcq' | 'rce' | 'braco' | 'soma' | 'gordura' | 'massa-gorda' | 'massa-magra'

export type NotaDaVariacao =
  | 'balança'
  | 'calculado'
  | 'mudança real'
  | 'dentro do erro'
  | 'veja a soma'
  | 'bioimpedância'
  | 'protocolo diferente'
  | 'método diferente'
  | 'ponto diferente'
  | 'lado diferente'
  | ''

export interface VariacaoDaMedida {
  /** "−4,0"; "—" quando falta uma das duas ou a comparação não vale (D-1481). */
  readonly texto: string
  readonly nota: NotaDaVariacao
  /** Pela MMD do motor; `null` onde a medida não tem MMD ou não se compara. */
  readonly leitura: 'real' | 'erro' | null
  /** Nas casas da tela; `null` com "—". */
  readonly diferenca: number | null
  readonly mmd: number | null
}

interface DefinicaoDaMedida {
  readonly casas: number
  readonly unidade: string
  readonly valor: (m: MedidasDaAvaliacao) => number | null
}

const MEDIDAS: Readonly<Record<IdDaMedidaDoHistorico, DefinicaoDaMedida>> = {
  peso: { casas: 1, unidade: 'kg', valor: (m) => m.peso },
  imc: { casas: 2, unidade: 'kg/m²', valor: (m) => m.imc },
  cintura: { casas: 1, unidade: 'cm', valor: (m) => m.cintura },
  quadril: { casas: 1, unidade: 'cm', valor: (m) => m.quadril },
  rcq: { casas: 2, unidade: '', valor: (m) => m.rcq },
  rce: { casas: 2, unidade: '', valor: (m) => m.rce },
  braco: { casas: 1, unidade: 'cm', valor: (m) => m.braco?.valor ?? null },
  soma: { casas: 1, unidade: 'mm', valor: (m) => m.soma },
  gordura: { casas: 1, unidade: '%', valor: (m) => m.gordura?.pct ?? null },
  'massa-gorda': { casas: 1, unidade: 'kg', valor: (m) => m.gordura?.massaGorda ?? null },
  'massa-magra': { casas: 1, unidade: 'kg', valor: (m) => m.gordura?.massaMagra ?? null },
}

const SEM_VARIACAO: VariacaoDaMedida = { texto: '—', nota: '', leitura: null, diferenca: null, mmd: null }
const naoSeCompara = (nota: NotaDaVariacao): VariacaoDaMedida => ({ texto: '—', nota, leitura: null, diferenca: null, mmd: null })

const mesmoProtocolo = (a: MedidasDaAvaliacao, b: MedidasDaAvaliacao) => a.protocolo === b.protocolo
const mesmoPonto = (a: MedidasDaAvaliacao, b: MedidasDaAvaliacao) => a.ponto === b.ponto

/** D-1480: o % (e as massas) só se comparam no mesmo método. */
function notaDaGordura(a: GorduraDaAvaliacao, b: GorduraDaAvaliacao): NotaDaVariacao {
  if (a.origem !== b.origem) return 'método diferente'
  if (a.origem === 'bioimpedancia') return 'bioimpedância'
  return a.chave === b.chave ? 'veja a soma' : 'protocolo diferente'
}

const pelaMmd = (comparacao: ComparacaoDeAvaliacoes | null): Pick<VariacaoDaMedida, 'nota' | 'leitura' | 'mmd'> =>
  comparacao === null
    ? { nota: '', leitura: null, mmd: null }
    : comparacao.interpretacao === 'provavelmente-real'
      ? { nota: 'mudança real', leitura: 'real', mmd: comparacao.mmd }
      : { nota: 'dentro do erro', leitura: 'erro', mmd: comparacao.mmd }

function variacao(id: IdDaMedidaDoHistorico, a: MedidasDaAvaliacao, b: MedidasDaAvaliacao): VariacaoDaMedida {
  const { casas, valor } = MEDIDAS[id]
  const antes = valor(a)
  const depois = valor(b)
  if (antes === null || depois === null) return SEM_VARIACAO
  const diferenca = diferencaExibida(antes, depois, casas)
  const comNota = (resto: Pick<VariacaoDaMedida, 'nota' | 'leitura' | 'mmd'>): VariacaoDaMedida => ({ texto: comSinal(diferenca, casas), diferenca, ...resto })
  switch (id) {
    case 'peso':
      return comNota({ nota: 'balança', leitura: null, mmd: null })
    case 'imc':
      return comNota({ nota: 'calculado', leitura: null, mmd: null })
    case 'rcq':
    case 'rce':
      return mesmoPonto(a, b) ? comNota({ nota: 'calculado', leitura: null, mmd: null }) : naoSeCompara('ponto diferente')
    case 'cintura':
      return mesmoPonto(a, b) ? comNota(pelaMmd(compararAvaliacoes(antes, depois, 'outra'))) : naoSeCompara('ponto diferente')
    case 'quadril':
      return comNota(pelaMmd(compararAvaliacoes(antes, depois, 'outra')))
    case 'braco':
      return a.braco?.lado === b.braco?.lado ? comNota(pelaMmd(compararAvaliacoes(antes, depois, 'outra'))) : naoSeCompara('lado diferente')
    case 'soma':
      return mesmoProtocolo(a, b) && a.valoresDasDobras && b.valoresDasDobras
        ? comNota(pelaMmd(compararSomasDeDobras(a.valoresDasDobras, b.valoresDasDobras)))
        : naoSeCompara('protocolo diferente')
    case 'gordura':
    case 'massa-gorda':
    case 'massa-magra': {
      const nota = a.gordura && b.gordura ? notaDaGordura(a.gordura, b.gordura) : ''
      return nota === 'método diferente' || nota === 'protocolo diferente' ? naoSeCompara(nota) : comNota({ nota, leitura: null, mmd: null })
    }
  }
}

// --- A tabela ---------------------------------------------------------------------------------------------------------

export interface LinhaDoHistorico {
  readonly id: IdDaMedidaDoHistorico
  readonly nome: string
  /** Embaixo do nome: a unidade e o ponto, o lado ou o protocolo ("cm · ponto médio (OMS)"). */
  readonly sub: string
  readonly casas: number
  readonly unidade: string
  /** Um por avaliação, da mais velha à mais nova; `null` sem o valor (nunca 0). */
  readonly valores: readonly (number | null)[]
  /** Os mesmos, escritos: "71,5" ou "—". */
  readonly textos: readonly string[]
  /** Desde a penúltima; `null` com menos de 3 avaliações (com 2, a penúltima é a primeira, D-1486). */
  readonly desdeAnterior: VariacaoDaMedida | null
  /** Desde a primeira; `null` com uma avaliação só. */
  readonly desdePrimeira: VariacaoDaMedida | null
}

export interface GrupoDoHistorico {
  readonly nome: string
  readonly linhas: readonly LinhaDoHistorico[]
}

export interface ColunaDoHistorico {
  readonly casoId: string
  /** "12/05/2026". */
  readonly data: string
  readonly papel: 'primeira' | 'atual' | null
}

// --- Os gráficos ------------------------------------------------------------------------------------------------------

export interface PontoDaSerie {
  readonly chave: string
  /** Dias desde a primeira avaliação. */
  readonly x: number
  readonly valor: number | null
  /** "12/05". */
  readonly rotulo: string
  readonly dica: { readonly titulo: string; readonly valor: string; readonly detalhe: string }
}

export interface SerieDoHistorico {
  readonly id: 'peso' | 'gordura'
  readonly titulo: string
  /** "kg" ou "% · Jackson & Pollock, 7 dobras". */
  readonly sub: string
  readonly pontos: readonly PontoDaSerie[]
  /** "71,5 kg"; `null` sem ponto. */
  readonly rotuloDoUltimo: string | null
  /** Embaixo do gráfico: as avaliações que ficaram fora (D-1484). */
  readonly nota: string | null
  /** O que o lugar do gráfico diz sem nenhum ponto (D-1487). */
  readonly vazio: string
}

// --- A mudança mínima detectável --------------------------------------------------------------------------------------

export interface LinhaDaMudancaMinima {
  readonly nome: string
  /** "13,2 mm" ou "—". */
  readonly valor: string
  readonly detalhe: string
}

export interface MarcaDaComparacao {
  readonly concorda: boolean
  readonly texto: string
}

export interface MudancaMinimaDoHistorico {
  readonly linhas: readonly LinhaDaMudancaMinima[]
  readonly marcas: readonly MarcaDaComparacao[]
}

export interface HistoricoAntropometrico {
  /** Da mais velha à mais nova. */
  readonly avaliacoes: readonly AvaliacaoDoHistorico[]
  /** "4 avaliações · de 12/05/2026 a 03/11/2026". */
  readonly resumo: string
  /** Menos de 2 avaliações: o Histórico diz que começa na segunda e não desenha gráfico (CA-2455). */
  readonly comecaNaSegunda: boolean
  readonly colunas: readonly ColunaDoHistorico[]
  /** "Desde 08/09"; `null` com menos de 3 avaliações. */
  readonly desdeAnterior: string | null
  /** "Desde 12/05"; `null` com uma avaliação só. */
  readonly desdePrimeira: string | null
  readonly grupos: readonly GrupoDoHistorico[]
  readonly graficos: readonly SerieDoHistorico[]
  /** A leitura em uma frase, pela MMD do motor (D-1483); `null` sem soma nem cintura que se comparem. */
  readonly leitura: string | null
  /** Entre a penúltima e a última; `null` com menos de 2 avaliações ou sem soma, cintura e quadril. */
  readonly mudancaMinima: MudancaMinimaDoHistorico | null
  /** "Mesmo protocolo e mesmo ponto de cintura nas quatro"; `null` quando não vale para todas. */
  readonly concordancia: string | null
}

const POR_EXTENSO = ['', '', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'] as const
const nasTodas = (n: number) => (POR_EXTENSO[n] ? `nas ${POR_EXTENSO[n]}` : `em todas as ${n}`)

function diaDoAno(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000 : null
}

/** A ordem da D-1425: pela data; na mesma data, a entrada já vem da alterada por último para trás, e fica. */
const daMaisVelha = (avaliacoes: readonly AvaliacaoDoHistorico[]) =>
  avaliacoes
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a.data.localeCompare(y.a.data) || x.i - y.i)
    .map((x) => x.a)

const todasIguais = <T>(lista: readonly T[]) => lista.every((v) => v === lista[0])

function montarGrupos(medidas: readonly MedidasDaAvaliacao[]): GrupoDoHistorico[] {
  const n = medidas.length
  const ultima = medidas.at(-1)
  const penultima = n >= 3 ? medidas[n - 2] : undefined
  const primeira = medidas[0]
  const comDobra = medidas.filter((m) => m.soma !== null)
  const umProtocolo = comDobra.length > 0 && todasIguais(comDobra.map((m) => m.protocolo))
  const comCintura = medidas.filter((m) => m.cintura !== null)
  const comBraco = medidas.flatMap((m) => (m.braco ? [m.braco.lado] : []))
  const comGordura = medidas.flatMap((m) => (m.gordura ? [m.gordura] : []))
  const gorduraRecente = comGordura.at(-1)

  const pontoDaRecente = comCintura.at(-1)
  const cinturaSub = !todasIguais(comCintura.map((m) => m.ponto))
    ? 'cm · pontos diferentes'
    : `cm · ${nomeDoPonto(pontoDaRecente ? (pontoDaRecente.pontoRegistrado ? pontoDaRecente.ponto : null) : null)}`
  // D-1485: o lado da mais recente; a variação diz quando os lados das duas comparadas não batem.
  const bracoSub = `cm · ${comBraco.at(-1) ?? 'direito'}`
  const protocoloRecente = comDobra.at(-1)
  const nDobras = protocoloRecente?.dobrasDoProtocolo ?? null
  const gorduraSub =
    gorduraRecente?.origem === 'bioimpedancia' ? '% · bioimpedância' : gorduraRecente?.conversao ? `% · ${gorduraRecente.conversao}` : '%'

  const linha = (id: IdDaMedidaDoHistorico, nome: string, sub: string): LinhaDoHistorico | null => {
    const { casas, unidade, valor } = MEDIDAS[id]
    const valores = medidas.map(valor)
    if (valores.every((v) => v === null)) return null
    return {
      id,
      nome,
      sub,
      casas,
      unidade,
      valores,
      textos: valores.map((v) => (v === null ? '—' : formatarNumero(v, casas))),
      desdeAnterior: penultima && ultima ? variacao(id, penultima, ultima) : null,
      desdePrimeira: n >= 2 && primeira && ultima ? variacao(id, primeira, ultima) : null,
    }
  }
  const grupo = (nome: string, linhas: readonly (LinhaDoHistorico | null)[]): GrupoDoHistorico[] => {
    const com = linhas.filter((l): l is LinhaDoHistorico => l !== null)
    return com.length === 0 ? [] : [{ nome, linhas: com }]
  }

  const origens = new Set(comGordura.map((g) => g.origem))
  const nomeDaComposicao = origens.size !== 1 ? 'Composição corporal' : origens.has('dobras') ? 'Composição estimada pelas dobras' : 'Composição pela bioimpedância'
  return [
    ...grupo('Medidas', [
      linha('peso', 'Peso', 'kg'),
      linha('imc', 'IMC', 'kg/m²'),
      linha('cintura', 'Cintura', cinturaSub),
      linha('quadril', 'Quadril', 'cm'),
      linha('rcq', 'Cintura/quadril', ''),
      linha('rce', 'Cintura/estatura', ''),
      linha('braco', 'Braço relaxado', bracoSub),
    ]),
    ...grupo(umProtocolo && protocoloRecente?.nomeDoProtocolo ? `Dobras · ${protocoloRecente.nomeDoProtocolo}` : 'Dobras', [
      linha(
        'soma',
        umProtocolo && nDobras !== null ? `Soma das ${nDobras} dobras` : 'Soma das dobras do protocolo',
        umProtocolo || comDobra.length === 0 ? 'mm' : 'mm · protocolo de cada avaliação',
      ),
    ]),
    ...grupo(nomeDaComposicao, [linha('gordura', 'Gordura corporal', gorduraSub), linha('massa-gorda', 'Massa gorda', 'kg'), linha('massa-magra', 'Massa magra', 'kg')]),
  ]
}

function montarSerie(id: 'peso' | 'gordura', medidas: readonly MedidasDaAvaliacao[]): SerieDoHistorico {
  const inicio = diaDoAno(medidas[0]?.avaliacao.data ?? '') ?? 0
  const recente = medidas.flatMap((m) => (m.gordura ? [m.gordura] : [])).at(-1)
  // D-1484: a gordura só no método da mais recente com %.
  const valorDe = (m: MedidasDaAvaliacao): number | null =>
    id === 'peso' ? m.peso : m.gordura && recente && m.gordura.origem === recente.origem && m.gordura.chave === recente.chave ? m.gordura.pct : null
  const fora = id === 'gordura' ? medidas.filter((m) => m.gordura !== null && valorDe(m) === null).length : 0
  const escrever = (v: number) => (id === 'peso' ? numeroComUnidade(v, 1, 'kg') : numeroComUnidade(v, 1, '%'))
  const variacaoDesde = (d: number) => (id === 'peso' ? `${comSinal(d, 1)} kg` : `${comSinal(d, 1)} ${pontosDePercentual(d)}`)
  let anterior: { readonly valor: number; readonly data: string } | null = null
  const pontos = medidas.map((m, i): PontoDaSerie => {
    const valor = valorDe(m)
    const { data, casoId } = m.avaliacao
    const dia = diaDoAno(data)
    let detalhe = ''
    if (valor !== null && anterior === null) detalhe = i === 0 ? 'Primeira avaliação' : id === 'peso' ? 'Primeira com peso' : 'Primeira com o % de gordura'
    else if (valor !== null && anterior !== null) detalhe = `${variacaoDesde(diferencaExibida(anterior.valor, valor, 1))} desde ${dataCurta(anterior.data)}`
    if (valor !== null) anterior = { valor, data }
    return {
      chave: casoId,
      x: dia === null ? i : dia - inicio,
      valor,
      rotulo: dataCurta(data),
      dica: { titulo: dataCompleta(data), valor: valor === null ? '' : escrever(valor), detalhe },
    }
  })
  const ultimo = pontos.flatMap((p) => (p.valor === null ? [] : [p.valor])).at(-1)
  return {
    id,
    titulo: id === 'peso' ? 'Peso' : 'Gordura corporal',
    sub: id === 'peso' ? 'kg' : recente ? `% · ${recente.metodo}` : '%',
    pontos,
    rotuloDoUltimo: ultimo === undefined ? null : escrever(ultimo),
    nota: fora === 0 ? null : fora === 1 ? '1 avaliação por outro método fica fora do gráfico.' : `${fora} avaliações por outro método ficam fora do gráfico.`,
    vazio: id === 'peso' ? 'Nenhuma avaliação tem o peso.' : 'Nenhuma avaliação tem o % de gordura.',
  }
}

const ETM_DAS_DOBRAS = 'ETM de 7,5% em cada dobra, padrão da ISAK nível 1'
const ETM_DAS_CIRCUNFERENCIAS = 'ETM de 1,5% nas circunferências, padrão da ISAK nível 1'

/** "Falta a cintura em 03/11/2026." ou "Falta a cintura nas duas avaliações." */
function emQual(oQueFalta: string, a: MedidasDaAvaliacao, b: MedidasDaAvaliacao, temA: boolean, temB: boolean): string {
  if (!temA && !temB) return `${oQueFalta} nas duas avaliações.`
  return `${oQueFalta} em ${dataCompleta((temA ? b : a).avaliacao.data)}.`
}

const nomeDoProtocoloDa = (m: MedidasDaAvaliacao) => m.nomeDoProtocolo ?? 'protocolo desconhecido'

function montarMudancaMinima(a: MedidasDaAvaliacao, b: MedidasDaAvaliacao): MudancaMinimaDoHistorico | null {
  const linhas: LinhaDaMudancaMinima[] = []
  const marcas: MarcaDaComparacao[] = []
  const dia = (m: MedidasDaAvaliacao) => dataCurta(m.avaliacao.data)

  if (a.temDobra || b.temDobra) {
    const igual = mesmoProtocolo(a, b)
    const nome = igual && b.dobrasDoProtocolo !== null ? `Soma das ${b.dobrasDoProtocolo} dobras` : 'Soma das dobras'
    if (a.temDobra && b.temDobra && !igual) linhas.push({ nome, valor: '—', detalhe: 'Protocolos diferentes nas duas avaliações.' })
    else if (a.soma === null || b.soma === null || !a.valoresDasDobras || !b.valoresDasDobras) {
      linhas.push({ nome, valor: '—', detalhe: emQual('Falta dobra do protocolo', a, b, a.soma !== null, b.soma !== null) })
    } else {
      const c = compararSomasDeDobras(a.valoresDasDobras, b.valoresDasDobras)
      linhas.push({ nome, valor: c ? numeroComUnidade(c.mmd, 1, 'mm') : '—', detalhe: ETM_DAS_DOBRAS })
    }
    if (a.temDobra && b.temDobra) {
      marcas.push(
        igual
          ? { concorda: true, texto: `Mesmo protocolo: ${nomeDoProtocoloDa(b)}` }
          : { concorda: false, texto: `Protocolos diferentes: ${nomeDoProtocoloDa(a)} em ${dia(a)} e ${nomeDoProtocoloDa(b)} em ${dia(b)}. A soma não se compara.` },
      )
    }
  }

  if (a.cintura !== null || b.cintura !== null) {
    if (a.cintura !== null && b.cintura !== null && !mesmoPonto(a, b)) linhas.push({ nome: 'Cintura', valor: '—', detalhe: 'Pontos de cintura diferentes nas duas avaliações.' })
    else if (a.cintura === null || b.cintura === null) linhas.push({ nome: 'Cintura', valor: '—', detalhe: emQual('Falta a cintura', a, b, a.cintura !== null, b.cintura !== null) })
    else {
      const c = compararAvaliacoes(a.cintura, b.cintura, 'outra')
      linhas.push({ nome: 'Cintura', valor: c ? numeroComUnidade(c.mmd, 1, 'cm') : '—', detalhe: ETM_DAS_CIRCUNFERENCIAS })
    }
    if (a.cintura !== null && b.cintura !== null) {
      const assumido = !a.pontoRegistrado || !b.pontoRegistrado ? ', assumido onde não foi registrado' : ''
      marcas.push(
        mesmoPonto(a, b)
          ? { concorda: true, texto: `Mesmo ponto de cintura: ${nomeDoPonto(b.ponto)}${assumido}` }
          : { concorda: false, texto: `Pontos de cintura diferentes: ${nomeDoPonto(a.ponto)} em ${dia(a)} e ${nomeDoPonto(b.ponto)} em ${dia(b)}. A cintura não se compara.` },
      )
    }
  }

  if (a.quadril !== null || b.quadril !== null) {
    if (a.quadril === null || b.quadril === null) linhas.push({ nome: 'Quadril', valor: '—', detalhe: emQual('Falta o quadril', a, b, a.quadril !== null, b.quadril !== null) })
    else {
      const c = compararAvaliacoes(a.quadril, b.quadril, 'outra')
      linhas.push({ nome: 'Quadril', valor: c ? numeroComUnidade(c.mmd, 1, 'cm') : '—', detalhe: 'Mesmo ETM, sobre a medida do quadril' })
    }
  }

  return linhas.length === 0 ? null : { linhas, marcas }
}

const TEXTO_DA_LEITURA = { real: 'mudança real', erro: 'dentro do erro de medida' } as const

const MEDIDAS_DA_FRASE = [
  ['soma', 'a soma das dobras', 'mm'],
  ['cintura', 'a cintura', 'cm'],
] as const

/** D-1483: a frase de um período, com a soma das dobras e a cintura que se comparam. */
function fraseDoPeriodo(a: MedidasDaAvaliacao, b: MedidasDaAvaliacao): string | null {
  const itens = MEDIDAS_DA_FRASE.flatMap(([id, nome, unidade]) => {
    const v = variacao(id, a, b)
    if (v.leitura === null || v.diferenca === null) return []
    const quanto = formatarNumero(Math.abs(v.diferenca), 1)
    const verbo = v.diferenca < 0 ? `caiu ${quanto} ${unidade}` : v.diferenca > 0 ? `subiu ${quanto} ${unidade}` : 'não mudou'
    return [{ frase: `${nome} ${verbo}`, leitura: v.leitura }]
  })
  const primeiro = itens[0]
  if (!primeiro) return null
  const desde = `Desde ${dataCurta(a.avaliacao.data)}`
  if (todasIguais(itens.map((i) => i.leitura))) return `${desde}, ${itens.map((i) => i.frase).join(' e ')}: ${TEXTO_DA_LEITURA[primeiro.leitura]}.`
  return `${desde}, ${itens.map((i) => `${i.frase} (${TEXTO_DA_LEITURA[i.leitura]})`).join(' e ')}.`
}

function montarConcordancia(medidas: readonly MedidasDaAvaliacao[]): string | null {
  const n = medidas.length
  if (n < 2) return null
  const protocolo = medidas.every((m) => m.temDobra) && todasIguais(medidas.map((m) => m.protocolo))
  const ponto = medidas.every((m) => m.cintura !== null) && todasIguais(medidas.map((m) => m.ponto))
  const nas = nasTodas(n)
  if (protocolo && ponto) return `Mesmo protocolo e mesmo ponto de cintura ${nas}`
  if (protocolo) return `Mesmo protocolo ${nas}`
  if (ponto) return `Mesmo ponto de cintura ${nas}`
  return null
}

/** O Histórico das avaliações (D-1425 a D-1428): a entrada pode vir em qualquer ordem. */
export function historicoAntropometrico(entrada: readonly AvaliacaoDoHistorico[]): HistoricoAntropometrico {
  const avaliacoes = daMaisVelha(entrada)
  const medidas = avaliacoes.map(medidasDa)
  const n = medidas.length
  const primeira = medidas[0]
  const ultima = medidas.at(-1)
  const penultima = n >= 2 ? medidas[n - 2] : undefined
  const datas = avaliacoes.map((a) => dataCompleta(a.data) || 'data não informada')
  const resumo = n === 0 ? 'Nenhuma avaliação' : n === 1 ? `1 avaliação · ${datas[0] ?? ''}` : `${n} avaliações · de ${datas[0] ?? ''} a ${datas.at(-1) ?? ''}`
  const periodos = primeira && penultima ? (n >= 3 ? [primeira, penultima] : [primeira]) : []
  const frases = ultima ? periodos.flatMap((a) => fraseDoPeriodo(a, ultima) ?? []) : []
  return {
    avaliacoes,
    resumo,
    comecaNaSegunda: n < 2,
    colunas: avaliacoes.map((a, i) => ({ casoId: a.casoId, data: datas[i] ?? '', papel: n > 1 && i === n - 1 ? 'atual' : n > 1 && i === 0 ? 'primeira' : null })),
    desdeAnterior: n >= 3 && penultima ? `Desde ${dataCurta(penultima.avaliacao.data)}` : null,
    desdePrimeira: n >= 2 && primeira ? `Desde ${dataCurta(primeira.avaliacao.data)}` : null,
    grupos: montarGrupos(medidas),
    graficos: n < 2 ? [] : [montarSerie('peso', medidas), montarSerie('gordura', medidas)],
    leitura: frases.length === 0 ? null : frases.join(' '),
    mudancaMinima: penultima && ultima ? montarMudancaMinima(penultima, ultima) : null,
    concordancia: montarConcordancia(medidas),
  }
}

// --- A comparação do documento (D-1494) --------------------------------------------------------------------------------

export interface LinhaDaComparacao {
  readonly nome: string
  readonly antes: string
  readonly agora: string
  /** "−1,1 kg" ou "—". */
  readonly variacao: string
  /** "mudança real", "dentro do erro de medida", "protocolo diferente"…; vazio onde não há leitura. */
  readonly leitura: string
}

export interface ComparacaoDasAvaliacoes {
  /** "08/09/2026". */
  readonly antes: string
  readonly agora: string
  readonly linhas: readonly LinhaDaComparacao[]
  /** A MMD das medidas que se comparam, com o ETM da ISAK; `null` sem nenhuma. */
  readonly legenda: string | null
}

const LEITURA_NO_DOCUMENTO: Readonly<Partial<Record<NotaDaVariacao, string>>> = {
  'mudança real': 'mudança real',
  'dentro do erro': 'dentro do erro de medida',
  'protocolo diferente': 'protocolo diferente',
  'método diferente': 'método diferente',
  'ponto diferente': 'ponto diferente',
  'lado diferente': 'lado diferente',
}

const MEDIDAS_DA_COMPARACAO = [
  ['peso', 'Peso (kg)', 'kg'],
  ['cintura', 'Cintura (cm)', 'cm'],
  ['quadril', 'Quadril (cm)', 'cm'],
  ['soma', '', 'mm'],
  ['gordura', 'Gordura corporal (%)', '%'],
  ['massa-magra', 'Massa magra (kg)', 'kg'],
] as const

/** A comparação da avaliação aberta com a anterior, para o documento (D-1430, bloco 10; D-1494). */
export function comparacaoEntre(anterior: AvaliacaoDoHistorico, atual: AvaliacaoDoHistorico): ComparacaoDasAvaliacoes {
  const a = medidasDa(anterior)
  const b = medidasDa(atual)
  const nomeDaSoma = mesmoProtocolo(a, b) && b.dobrasDoProtocolo !== null ? `Soma das ${b.dobrasDoProtocolo} dobras (mm)` : 'Soma das dobras (mm)'
  const linhas = MEDIDAS_DA_COMPARACAO.flatMap(([id, nome, unidade]): LinhaDaComparacao[] => {
    const { casas, valor } = MEDIDAS[id]
    const antes = valor(a)
    const agora = valor(b)
    if (antes === null && agora === null) return []
    const v = variacao(id, a, b)
    const sufixo = v.diferenca === null ? '' : unidade === '%' ? ` ${pontosDePercentual(v.diferenca)}` : ` ${unidade}`
    return [
      {
        nome: id === 'soma' ? nomeDaSoma : nome,
        antes: antes === null ? '—' : formatarNumero(antes, casas),
        agora: agora === null ? '—' : formatarNumero(agora, casas),
        variacao: `${v.texto}${sufixo}`,
        leitura: LEITURA_NO_DOCUMENTO[v.nota] ?? '',
      },
    ]
  })
  const mmd = montarMudancaMinima(a, b)
  const partes = (mmd?.linhas ?? []).flatMap((l) => (l.valor === '—' ? [] : [`${l.nome.startsWith('Soma') ? 'dobras' : l.nome.toLocaleLowerCase('pt-BR')} ${l.valor}`]))
  return {
    antes: dataCompleta(anterior.data),
    agora: dataCompleta(atual.data),
    linhas,
    legenda: partes.length === 0 ? null : `Mudança mínima detectável (95%), com o ETM padrão da ISAK nível 1: ${partes.join('; ')}.`,
  }
}
