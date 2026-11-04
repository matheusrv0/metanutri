// O "Documento da avaliação" (spec antropometria-telas, D-1429 a D-1433 e D-1490 a D-1498): os blocos do prontuário da
// avaliação antropométrica pela CFN 594/2017 (arts. 4º, 5º e 8º) e pela pesquisa de 03/11/2026 (seção 7.3), só com o
// que tem dado. Cada número, classificação e fonte vem do motor (`resultadoAntropometrico`, `gorduraDoCaso`,
// `comparacaoEntre`); aqui só se escolhe o que entra e como escrever. A foto nunca vai ao documento (CFN 599/2018,
// art. 58). Quem assina e o contato da nutricionista são da folha (a interface), não deste módulo.
import { dataCompleta } from './formatarData.ts'
import { comparacaoEntre, formatarNumero, numeroComUnidade, opcoesDoMotor, type AvaliacaoDoHistorico, type ComparacaoDasAvaliacoes } from './historicoAntropometrico.ts'
import { gorduraDoCaso, type GorduraDoCaso } from './indicadoresDeGordura.ts'
import { medidaValida, type LinhaDoResultado } from './linhaDoResultado.ts'
import type { Paciente } from './pacientes.ts'
import { protocoloPorId, type DobraCutanea } from './protocolosDeDobras.ts'
import { resultadoAntropometrico } from './resultadoAntropometrico.ts'
import type { Caso, OrigemDasMedidas, Sexo } from './tipos.ts'

export interface EntradaDoDocumento {
  /** A avaliação aberta, com a ficha na data dela (D-1429). */
  readonly atual: AvaliacaoDoHistorico
  /** As avaliações do paciente, com a aberta, em qualquer ordem; vazio no plano sem paciente (D-1498). */
  readonly avaliacoes: readonly AvaliacaoDoHistorico[]
  readonly paciente: Paciente | null
  /** AAAA-MM-DD. */
  readonly hoje: string
}

export interface CampoDoDocumento {
  readonly rotulo: string
  readonly valor: string
}

export interface MedidaBasica {
  readonly rotulo: 'Peso' | 'Estatura' | 'IMC'
  readonly valor: string
  /** A origem ("aferido") ou a classificação do IMC com a fonte ("Sobrepeso · SISVAN, 2011"); vazio sem nada. */
  readonly nota: string
}

export type MedidaDeMembro = { readonly nome: string; readonly direito: string; readonly esquerdo: string } | { readonly nome: string; readonly unico: string }

export interface DobraDoDocumento {
  readonly nome: string
  readonly valor: string
  /** O "●": a dobra cujo valor entrou na conta (D-1493). */
  readonly usada: boolean
}

export interface ResultadoDoDocumento {
  /** O nome do protótipo do documento onde ele tem; senão, o do motor (D-1491, DP-AT-8). */
  readonly nome: string
  readonly linha: LinhaDoResultado
}

export interface DocumentoDaAvaliacao {
  /** "03/11/2026". */
  readonly data: string
  /** O nome para o topo e a linha fina: o paciente, ou o plano sem paciente. */
  readonly nome: string
  readonly paciente: readonly CampoDoDocumento[]
  readonly metodos: readonly string[]
  readonly basicas: readonly MedidaBasica[]
  readonly membros: readonly MedidaDeMembro[]
  readonly tronco: readonly { readonly nome: string; readonly valor: string }[]
  readonly dobras: readonly DobraDoDocumento[]
  /** "Soma das 7 dobras: 158,0 mm"; `null` sem soma. */
  readonly somaDasDobras: string | null
  /** "Punho (biestiloide) 5,1 · Cotovelo (úmero) 6,2 · Joelho (fêmur) 9,1 cm"; `null` sem nenhum. */
  readonly diametros: string | null
  readonly resultados: readonly ResultadoDoDocumento[]
  /** Com a avaliação anterior à aberta, pela data (D-1494); `null` na primeira e sem paciente. */
  readonly comparacao: ComparacaoDasAvaliacoes | null
  /** Escrito pela nutricionista (D-1432); vazio, o papel mostra linhas para escrever à mão. */
  readonly diagnostico: string
  readonly observacoes: string
  /** As citações completas das fontes usadas, na ordem em que aparecem, sem repetir. */
  readonly referencias: readonly string[]
}

const SEXO: Readonly<Record<Sexo, string>> = { F: 'Feminino', M: 'Masculino' }

const textoDaIdade = (caso: Caso): string | null => {
  const anos = caso.idadeAnos
  if (anos === null) return null
  if (anos === 0) return `${caso.idadeMesesAdicionais} ${caso.idadeMesesAdicionais === 1 ? 'mês' : 'meses'}`
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

/** A ordem da D-1425: pela data; na mesma data, a ordem de entrada. */
const daMaisVelha = (avaliacoes: readonly AvaliacaoDoHistorico[]) =>
  avaliacoes
    .map((a, i) => ({ a, i }))
    .sort((x, y) => x.a.data.localeCompare(y.a.data) || x.i - y.i)
    .map((x) => x.a)

function camposDoPaciente(caso: Caso, paciente: Paciente | null, posicao: number): CampoDoDocumento[] {
  const idade = textoDaIdade(caso)
  const nascimento = paciente ? dataCompleta(paciente.nascimento) : ''
  const campos: (CampoDoDocumento | null)[] = [
    { rotulo: 'Nome', valor: paciente ? paciente.nome.trim() || 'Paciente sem nome' : caso.nome.trim() || 'Plano sem nome' },
    nascimento ? { rotulo: 'Nascimento', valor: idade ? `${nascimento} · ${idade}` : nascimento } : idade ? { rotulo: 'Idade', valor: idade } : null,
    caso.sexo ? { rotulo: 'Sexo', valor: SEXO[caso.sexo] } : null,
    paciente && posicao >= 0 ? { rotulo: 'Avaliação', valor: posicao === 0 ? 'Primeira avaliação' : `Retorno · ${posicao + 1}ª avaliação` } : null,
    caso.avaliacao.modalidade ? { rotulo: 'Modalidade', valor: caso.avaliacao.modalidade === 'presencial' ? 'Presencial' : 'Telenutrição' } : null,
  ]
  return campos.filter((c) => c !== null)
}

const NOME_DO_ADIPOMETRO = { lange: 'Lange', harpenden: 'Harpenden', outro: 'de outra marca' } as const

const PONTO_NO_METODO = {
  'ponto-medio': 'Cintura no ponto médio entre a última costela e a crista ilíaca (OMS).',
  'crista-iliaca': 'Cintura na borda superior da crista ilíaca (NIH).',
  'menor-perimetro': 'Cintura no menor perímetro do tronco.',
} as const

const ORIGEM_NO_METODO = (origem: OrigemDasMedidas, sexo: Sexo | null): string =>
  origem === 'aferidas'
    ? 'Peso e estatura aferidos na consulta.'
    : origem === 'estimadas'
      ? 'Peso e estatura estimados por equação.'
      : `Peso e estatura informados ${sexo === 'F' ? 'pela paciente' : sexo === 'M' ? 'pelo paciente' : 'pela pessoa'}.`

const ORIGEM_DA_MEDIDA: Readonly<Record<OrigemDasMedidas, readonly [peso: string, estatura: string]>> = {
  aferidas: ['aferido', 'aferida'],
  informadas: ['informado', 'informada'],
  estimadas: ['estimado', 'estimada'],
}

/** Os pares de lado que o plano guarda (D-1492): braço relaxado, braço contraído, panturrilha, coxa proximal e coxa média. */
function membrosDo(caso: Caso): MedidaDeMembro[] {
  const m = caso.medidasCorporais
  const par = (nome: string, direito: number | null, esquerdo: number | null): MedidaDeMembro | null => {
    const d = medidaValida(direito)
    const e = medidaValida(esquerdo)
    if (d === null && e === null) return null
    return { nome, direito: d === null ? '—' : formatarNumero(d, 1), esquerdo: e === null ? '—' : formatarNumero(e, 1) }
  }
  const unico = (nome: string, valor: number | null): MedidaDeMembro | null => {
    const v = medidaValida(valor)
    return v === null ? null : { nome, unico: formatarNumero(v, 1) }
  }
  return [
    par('Braço relaxado', m.bracoRelaxadoDireitoCm, m.bracoRelaxadoEsquerdoCm),
    par('Braço contraído', m.bracoContraidoDireitoCm, m.bracoContraidoEsquerdoCm),
    unico('Antebraço', m.antebracoCm),
    unico('Punho', m.punhoCm),
    par('Panturrilha', caso.circunferenciaPanturrilhaCm, m.panturrilhaEsquerdaCm),
    par('Coxa proximal', m.coxaProximalDireitaCm, m.coxaProximalEsquerdaCm),
    par('Coxa média', m.coxaDireitaCm, m.coxaEsquerdaCm),
  ].filter((x) => x !== null)
}

const PONTO_NA_TABELA = { 'ponto-medio': 'ponto médio', 'crista-iliaca': 'crista ilíaca', 'menor-perimetro': 'menor perímetro' } as const

function troncoDo(caso: Caso): { readonly nome: string; readonly valor: string }[] {
  const m = caso.medidasCorporais
  const ponto = m.pontoDaCintura !== null && m.pontoDaCintura in PONTO_NA_TABELA ? PONTO_NA_TABELA[m.pontoDaCintura] : 'ponto não registrado'
  const itens: readonly (readonly [string, number | null])[] = [
    ['Pescoço', m.pescocoCm],
    ['Ombro', m.ombroCm],
    ['Peitoral', m.peitoralCm],
    [`Cintura, ${ponto}`, caso.circunferenciaCinturaCm],
    ['Abdômen', m.abdomenCm],
    ['Quadril', m.quadrilCm],
  ]
  return itens.flatMap(([nome, valor]) => {
    const v = medidaValida(valor)
    return v === null ? [] : [{ nome, valor: formatarNumero(v, 1) }]
  })
}

/** As dobras na ordem do protótipo, com os nomes do documento. */
const ORDEM_DAS_DOBRAS: readonly (readonly [DobraCutanea, string])[] = [
  ['tricipital', 'Tríceps'],
  ['bicipital', 'Bíceps'],
  ['subescapular', 'Subescapular'],
  ['peitoral', 'Peitoral'],
  ['axilarMedia', 'Axilar média'],
  ['suprailiacaAnt', 'Suprailíaca, axilar anterior'],
  ['suprailiacaMed', 'Suprailíaca, axilar média'],
  ['suprailiaca', 'Suprailíaca, linha não informada'],
  ['abdominal', 'Abdominal'],
  ['coxa', 'Coxa'],
  ['panturrilhaMedial', 'Panturrilha medial'],
  ['supraespinal', 'Supraespinal'],
]

/** D-1493: as dobras do protocolo; a suprailíaca sem linha (Guedes, Faulkner) é a de linha não informada com valor, senão a média. */
function dobrasUsadas(caso: Caso): ReadonlySet<DobraCutanea> {
  const protocolo = protocoloPorId(caso.composicao.protocolo)
  if (!protocolo || caso.sexo === null) return new Set()
  const dobras = caso.composicao.dobras
  return new Set(protocolo.porSexo[caso.sexo].dobras.map((d) => (d === 'suprailiaca' && medidaValida(dobras.suprailiaca) === null ? 'suprailiacaMed' : d)))
}

function dobrasDo(caso: Caso): DobraDoDocumento[] {
  const usadas = dobrasUsadas(caso)
  return ORDEM_DAS_DOBRAS.flatMap(([chave, nome]) => {
    const v = medidaValida(caso.composicao.dobras[chave])
    return v === null ? [] : [{ nome, valor: formatarNumero(v, 1), usada: usadas.has(chave) }]
  })
}

function diametrosDo(caso: Caso): string | null {
  const m = caso.medidasCorporais
  const partes = (
    [
      ['Punho (biestiloide)', m.diametroPunhoCm],
      ['Cotovelo (úmero)', m.diametroCotoveloCm],
      ['Joelho (fêmur)', m.diametroJoelhoCm],
    ] as const
  ).flatMap(([nome, valor]) => {
    const v = medidaValida(valor)
    return v === null ? [] : [`${nome} ${formatarNumero(v, 1)}`]
  })
  return partes.length === 0 ? null : `${partes.join(' · ')} cm`
}

/** D-1491 e DP-AT-8: os nomes do protótipo do documento; as outras linhas ficam com o nome do motor. */
const NOME_NO_DOCUMENTO: Readonly<Partial<Record<LinhaDoResultado['id'], string>>> = {
  imc: 'IMC',
  gordura: 'Gordura corporal',
  'massa-gorda': 'Massa gorda',
  'massa-magra': 'Massa magra',
  cintura: 'Cintura',
  rcq: 'Cintura/quadril',
  rce: 'Cintura/estatura',
  pescoco: 'Pescoço',
  cb: 'Circunferência do braço (CB)',
  dct: 'Dobra tricipital',
  cmb: 'Músculo do braço (CMB)',
  amb: 'Área muscular corrigida (AMBc)',
  agb: 'Área de gordura do braço (AGB)',
  compleicao: 'Compleição (estatura ÷ punho)',
}

const linhasDoMotor = (caso: Caso): LinhaDoResultado[] => resultadoAntropometrico(caso, opcoesDoMotor(caso))

/** "Jackson & Pollock, 7 dobras, conversão de Siri (Jackson, Pollock e Ward, 1980; Siri, 1961)". */
function metodoDaGordura(g: GorduraDoCaso, comAConversao = true): string {
  const conversao = g.detalhes.find((d) => d.rotulo === 'Conversão')
  const comConversao = comAConversao && conversao?.tipo === 'texto' ? `${g.metodo}, conversão de ${conversao.texto}` : g.metodo
  return g.fontes.length > 0 ? `${comConversao} (${g.fontes.map((f) => f.curta).join('; ')})` : comConversao
}

function metodosDo(caso: Caso, gordura: GorduraDoCaso | null): string[] {
  const m = caso.medidasCorporais
  const metodos: string[] = []
  const adipometro = caso.avaliacao.adipometro ? ` Adipômetro ${NOME_DO_ADIPOMETRO[caso.avaliacao.adipometro]}.` : ''
  const temDobra = ORDEM_DAS_DOBRAS.some(([chave]) => medidaValida(caso.composicao.dobras[chave]) !== null)
  if (gordura?.origem === 'dobras') metodos.push(`Dobras: ${metodoDaGordura(gordura)}.${adipometro}`)
  else if (temDobra) metodos.push(`Dobras cutâneas medidas; o protocolo escolhido não calculou a gordura.${adipometro}`)
  if (gordura?.origem === 'bioimpedancia') metodos.push(`Gordura corporal pela ${gordura.metodo.charAt(0).toLocaleLowerCase('pt-BR')}${gordura.metodo.slice(1)}.`)
  if (medidaValida(caso.circunferenciaCinturaCm) !== null) {
    const ponto = m.pontoDaCintura
    metodos.push(ponto !== null && ponto in PONTO_NO_METODO ? PONTO_NO_METODO[ponto] : 'Cintura sem o ponto registrado; a classificação assume o ponto médio (OMS).')
  }
  if (membrosDo(caso).some((x) => 'direito' in x)) metodos.push('Medidas no lado direito, salvo as da coluna do lado esquerdo.')
  const origem = caso.avaliacao.origemPesoEstatura
  if (origem && (medidaValida(caso.pesoKg) !== null || medidaValida(caso.estaturaCm) !== null)) metodos.push(ORIGEM_NO_METODO(origem, caso.sexo))
  return metodos
}

function basicasDo(caso: Caso, imc: LinhaDoResultado | undefined): MedidaBasica[] {
  const origem = caso.avaliacao.origemPesoEstatura
  const [notaDoPeso, notaDaEstatura] = origem ? ORIGEM_DA_MEDIDA[origem] : ['', '']
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  const basicas: MedidaBasica[] = []
  if (peso !== null) basicas.push({ rotulo: 'Peso', valor: numeroComUnidade(peso, 1, 'kg'), nota: notaDoPeso })
  if (estatura !== null) basicas.push({ rotulo: 'Estatura', valor: numeroComUnidade(estatura, 1, 'cm'), nota: notaDaEstatura })
  if (imc && imc.valor !== null) {
    const nota = [imc.situacao?.rotulo, imc.fonte?.curta].filter((t) => t !== undefined && t !== '').join(' · ')
    basicas.push({ rotulo: 'IMC', valor: numeroComUnidade(imc.valor, imc.casas, imc.unidade), nota })
  }
  return basicas
}

/** O documento da avaliação aberta (D-1430): seção sem dado sai vazia, e a folha não a desenha. */
export function documentoDaAvaliacao({ atual, avaliacoes, paciente }: EntradaDoDocumento): DocumentoDaAvaliacao {
  const caso = atual.caso
  const ordem = paciente ? daMaisVelha(avaliacoes) : []
  const posicao = ordem.findIndex((a) => a.casoId === atual.casoId)
  const anterior = posicao > 0 ? ordem[posicao - 1] : undefined
  const gordura = gorduraDoCaso(caso, opcoesDoMotor(caso))
  const linhas = linhasDoMotor(caso)
  const comValor = linhas.filter((l) => l.valor !== null)
  const soma = comValor.find((l) => l.id === 'soma-de-dobras')
  const nDobras = dobrasUsadas(caso).size
  const resultados = comValor.filter((l) => l.id !== 'soma-de-dobras').map((linha) => ({ nome: NOME_NO_DOCUMENTO[linha.id] ?? linha.nome, linha }))
  const referencias = [...new Set([...(gordura?.fontes ?? []), ...comValor.flatMap((l) => (l.fonte ? [l.fonte] : []))].map((f) => f.citacao))]
  const campos = camposDoPaciente(caso, paciente, posicao)
  return {
    data: dataCompleta(atual.data),
    nome: campos[0]?.valor ?? '',
    paciente: campos,
    metodos: metodosDo(caso, gordura),
    basicas: basicasDo(caso, comValor.find((l) => l.id === 'imc')),
    membros: membrosDo(caso),
    tronco: troncoDo(caso),
    dobras: dobrasDo(caso),
    somaDasDobras: soma && soma.valor !== null ? `Soma das ${nDobras} dobras: ${numeroComUnidade(soma.valor, 1, 'mm')}` : null,
    diametros: diametrosDo(caso),
    resultados,
    comparacao: anterior ? comparacaoEntre(anterior, atual) : null,
    diagnostico: caso.avaliacao.diagnostico?.trim() ?? '',
    observacoes: caso.avaliacao.observacoesDaMedida?.trim() ?? '',
    referencias,
  }
}

/**
 * D-1497 (DP-AT-18; CFN 594, art. 4º §1º): o rascunho que "Usar o resumo das classificações" escreve. O método da
 * gordura com a fonte e uma linha por indicador classificado do motor, na ordem dele, sem adjetivo e sem conclusão; a
 * nutricionista revisa. Sem nenhum, vazio.
 */
export function rascunhoDoDiagnostico(caso: Caso): string {
  const gordura = gorduraDoCaso(caso, opcoesDoMotor(caso))
  const linhas: string[] = []
  if (gordura?.origem === 'dobras') linhas.push(`Gordura corporal estimada por ${metodoDaGordura(gordura, false)}.`)
  else if (gordura) linhas.push(`Gordura corporal pela ${gordura.metodo.charAt(0).toLocaleLowerCase('pt-BR')}${gordura.metodo.slice(1)}.`)
  for (const l of linhasDoMotor(caso)) {
    if (l.valor === null || l.situacao === null || l.situacao.nivel === 'informativo') continue
    const apoio = [numeroComUnidade(l.valor, l.casas, l.unidade), l.fonte?.curta].filter((t) => t !== undefined && t !== '').join('; ')
    linhas.push(`${NOME_NO_DOCUMENTO[l.id] ?? l.nome}: ${l.situacao.rotulo} (${apoio}).`)
  }
  return linhas.join('\n')
}
