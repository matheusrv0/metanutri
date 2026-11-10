// Criação e validação do caso (SPEC CA-01, CB-01, CB-02, CB-02a, CB-02b, CB-03, CB-12).
import type { Caso, ComposicaoCorporal, DadosDaAvaliacao, MedidasCorporais, ModoQuantidade, OrigemIa } from './tipos.ts'

export type CampoCaso = keyof Caso

export interface ResultadoValidacao {
  /** Mensagem por campo inválido. */
  readonly erros: Partial<Record<CampoCaso, string>>
  /** Campos obrigatórios para os cálculos que ainda estão vazios, na ordem do formulário. */
  readonly faltando: readonly CampoCaso[]
  /** Dados que não bloqueiam o cálculo básico, mas limitam algum resultado. */
  readonly avisos: readonly string[]
  /** Verdadeiro quando energia, IMC e referências podem ser calculados. */
  readonly podeCalcular: boolean
}

export const FAIXAS = {
  metaEnergiaKcal: { min: 500, max: 6000 },
  idadeAnos: { min: 1, max: 120 },
  pesoKg: { min: 5, max: 350 },
  estaturaCm: { min: 45, max: 250 },
  circunferenciaCinturaCm: { min: 30, max: 250 },
  circunferenciaPanturrilhaCm: { min: 10, max: 80 },
  semanasGestacao: { min: 1, max: 42 },
  mesesPosParto: { min: 0, max: 60 },
  idadeGestacaoLactacao: { min: 14, max: 50 },
} as const

/** As medidas da antropometria completa, todas vazias (spec antropometria-completa, CA-2000). */
export const MEDIDAS_CORPORAIS_VAZIAS: MedidasCorporais = {
  bracoRelaxadoDireitoCm: null,
  bracoRelaxadoEsquerdoCm: null,
  bracoContraidoDireitoCm: null,
  bracoContraidoEsquerdoCm: null,
  antebracoCm: null,
  punhoCm: null,
  pescocoCm: null,
  ombroCm: null,
  peitoralCm: null,
  pontoDaCintura: null,
  abdomenCm: null,
  quadrilCm: null,
  coxaDireitaCm: null,
  coxaEsquerdaCm: null,
  coxaProximalDireitaCm: null,
  coxaProximalEsquerdaCm: null,
  panturrilhaEsquerdaCm: null,
  diametroPunhoCm: null,
  diametroCotoveloCm: null,
  diametroJoelhoCm: null,
  alturaDoJoelhoCm: null,
  semienvergaduraCm: null,
}

/** O que a tela da avaliação guarda, tudo vazio (spec antropometria-telas, CA-2464). */
export const AVALIACAO_VAZIA: DadosDaAvaliacao = {
  origemPesoEstatura: null,
  modalidade: null,
  adipometro: null,
  maturacao: null,
  grupoDoEstudo: null,
  perfil: null,
  imcAlvo: null,
  gorduraAlvoPct: null,
  baseDaProteina: null,
  doencaRenalGrave: null,
  diagnostico: null,
  observacoesDaMedida: null,
  fotosAutorizadasEm: null,
  fotos: null,
  anexos: null,
}

const DOBRAS_VAZIAS: ComposicaoCorporal['dobras'] = {
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
}

export function criarCasoVazio(id: string): Caso {
  return {
    id,
    pacienteId: null,
    nome: '',
    diagnosticoClinico: '',
    dataConsulta: null,
    sexo: null,
    idadeAnos: null,
    idadeMesesAdicionais: 0,
    pesoKg: null,
    estaturaCm: null,
    ocupacao: '',
    estagiario: '',
    preceptor: '',
    objetivo: null,
    observacoes: '',
    circunferenciaCinturaCm: null,
    circunferenciaPanturrilhaCm: null,
    medidasCorporais: MEDIDAS_CORPORAIS_VAZIAS,
    avaliacao: AVALIACAO_VAZIA,
    condicao: { tipo: 'nenhuma' },
    modo: 'completo',
    metaEnergiaKcal: null,
    composicao: {
      protocolo: 'jackson-pollock-3',
      dobras: DOBRAS_VAZIAS,
      bioimpedancia: { gorduraPct: null, massaMagraKg: null, aguaPct: null, aparelho: '' },
    },
    energia: { fator: 1.2, formula: 'mifflin', getManual: null },
    metasMacros: {},
    adequacao: { preset: { tipo: 'individual' }, porcaoMaximaG: 200, incluirIngredientes: false, ocultos: [] },
    orientacoes: '',
    receitas: '',
    // D-376 (spec alimentos-e-gramaturas): plano novo mostra a medida com o peso ao lado.
    quantidades: 'medida-e-gramas',
    linhaDaAgua: null,
    metodoAgua: 'ml-kg',
    aguaLitros: null,
    origemIa: null,
  }
}

/** D-1352: a marca da IA guardada; estragada, ou de antes desta versão, vira nula. */
export function lerOrigemIa(valor: unknown): OrigemIa | null {
  if (typeof valor !== 'object' || valor === null) return null
  const o = valor as Record<string, unknown>
  const em = o['em']
  const modelo = o['modelo']
  return typeof em === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(em) && typeof modelo === 'string' && modelo.length <= 64 ? { em, modelo } : null
}

/** O objeto gravado, ou `{}` quando o plano antigo não tem o grupo. */
const grupoGravado = (valor: unknown): Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {}

/**
 * O plano gravado por uma versão anterior, completo (spec antropometria-completa, CA-2001): todo campo que ele não tem
 * vem do plano vazio, também dentro da composição, das dobras, das medidas corporais e da avaliação (spec
 * antropometria-telas, CA-2464). Nenhum valor gravado muda, nem o
 * de uma versão mais nova que esta não conhece (CB-1008).
 */
export function completarCasoLido(lido: Caso): Caso {
  const vazio = criarCasoVazio(lido.id)
  const composicao = grupoGravado(lido.composicao)
  // Os grupos vêm do JSON gravado: o que a versão antiga não tinha é completado; o que ela tinha fica como veio.
  return {
    ...vazio,
    ...lido,
    composicao: {
      ...vazio.composicao,
      ...(composicao as Partial<ComposicaoCorporal>),
      dobras: { ...vazio.composicao.dobras, ...(grupoGravado(composicao['dobras']) as Partial<ComposicaoCorporal['dobras']>) },
    },
    medidasCorporais: { ...MEDIDAS_CORPORAIS_VAZIAS, ...(grupoGravado(lido.medidasCorporais) as Partial<MedidasCorporais>) },
    // Spec antropometria-telas (CA-2464): o grupo da avaliação, completado como as medidas.
    avaliacao: { ...AVALIACAO_VAZIA, ...(grupoGravado(lido.avaliacao) as Partial<DadosDaAvaliacao>) },
    origemIa: lerOrigemIa(lido.origemIa),
  }
}

/**
 * A escolha de quantidade do plano (spec conduta-da-nutricionista, D-297; spec alimentos-e-gramaturas, D-376). Sem o
 * campo, ou com valor que esta versão não conhece, vale "Só medida" (`medida-caseira`, CB-290, CB-291 e CB-365): o plano
 * gravado antes desta versão não muda sem a nutricionista pedir.
 */
export function modoDeQuantidade(caso: { readonly quantidades?: unknown }): ModoQuantidade {
  return caso.quantidades === 'gramas' || caso.quantidades === 'medida-e-gramas' ? caso.quantidades : 'medida-caseira'
}

/**
 * Converte o texto digitado em número aceitando vírgula decimal (CB-12).
 * "68,5" e "68.5" viram 68,5; "1.234,5" vira 1234,5. Texto inválido ou vazio vira `null`.
 */
export function lerNumero(texto: string): number | null {
  let s = texto.trim()
  if (s === '') return null
  const temPonto = s.includes('.')
  const temVirgula = s.includes(',')
  if (temPonto && temVirgula) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    s = s.replace(',', '.')
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

const fora = (valor: number, faixa: { readonly min: number; readonly max: number }) => valor < faixa.min || valor > faixa.max

/** As medidas que a etapa 1 confere pela faixa (CB-02); a avaliação completa confere as mesmas (spec antropometria-telas, D-1522). */
export type MedidaComFaixa = 'pesoKg' | 'estaturaCm' | 'circunferenciaCinturaCm' | 'circunferenciaPanturrilhaCm'

const NOME_DA_MEDIDA: Readonly<Record<MedidaComFaixa, readonly [nome: string, unidade: string]>> = {
  pesoKg: ['Peso', 'kg'],
  estaturaCm: ['Estatura', 'cm'],
  circunferenciaCinturaCm: ['Circunferência da cintura', 'cm'],
  circunferenciaPanturrilhaCm: ['Circunferência da panturrilha', 'cm'],
}

/** A frase de `validarCaso` para o valor fora da faixa ("Peso deve estar entre 5 e 350 kg."); dentro dela, `null`. */
export function erroDaFaixa(campo: MedidaComFaixa, valor: number): string | null {
  const faixa = FAIXAS[campo]
  if (!fora(valor, faixa)) return null
  const [nome, unidade] = NOME_DA_MEDIDA[campo]
  return `${nome} deve estar entre ${faixa.min} e ${faixa.max} ${unidade}.`
}

const naFaixa = (campo: MedidaComFaixa, valor: number | null): number | null => (valor === null || erroDaFaixa(campo, valor) !== null ? null : valor)

/**
 * O plano com o que está fora da faixa da etapa 1 deixado vazio (spec antropometria-telas, D-1523): é o que a avaliação
 * completa, o Histórico e o documento calculam e imprimem. A panturrilha esquerda usa a faixa da direita (D-1522). O
 * plano gravado não muda: a etapa 1 continua mostrando o número com o aviso.
 */
export function casoNasFaixas(caso: Caso): Caso {
  const pesoKg = naFaixa('pesoKg', caso.pesoKg)
  const estaturaCm = naFaixa('estaturaCm', caso.estaturaCm)
  const circunferenciaCinturaCm = naFaixa('circunferenciaCinturaCm', caso.circunferenciaCinturaCm)
  const circunferenciaPanturrilhaCm = naFaixa('circunferenciaPanturrilhaCm', caso.circunferenciaPanturrilhaCm)
  const panturrilhaEsquerdaCm = naFaixa('circunferenciaPanturrilhaCm', caso.medidasCorporais.panturrilhaEsquerdaCm)
  const igual =
    pesoKg === caso.pesoKg &&
    estaturaCm === caso.estaturaCm &&
    circunferenciaCinturaCm === caso.circunferenciaCinturaCm &&
    circunferenciaPanturrilhaCm === caso.circunferenciaPanturrilhaCm &&
    panturrilhaEsquerdaCm === caso.medidasCorporais.panturrilhaEsquerdaCm
  if (igual) return caso
  return { ...caso, pesoKg, estaturaCm, circunferenciaCinturaCm, circunferenciaPanturrilhaCm, medidasCorporais: { ...caso.medidasCorporais, panturrilhaEsquerdaCm } }
}

/** Cada campo que falta, com o artigo, como a frase da tela pede (spec ficha-unica, D-461). */
const CAMPO_COM_ARTIGO: Readonly<Partial<Record<CampoCaso, string>>> = { sexo: 'o sexo', idadeAnos: 'a idade', pesoKg: 'o peso', estaturaCm: 'a estatura' }

/** "o peso e a estatura", "o sexo, a idade, o peso e a estatura": a lista em frase, com "e" antes do último. */
export function oQueFalta(campos: readonly CampoCaso[]): string {
  const nomes = campos.map((c) => CAMPO_COM_ARTIGO[c] ?? c)
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1] ?? ''}`
}

export function validarCaso(caso: Caso): ResultadoValidacao {
  const erros: Partial<Record<CampoCaso, string>> = {}
  const faltando: CampoCaso[] = []
  const avisos: string[] = []

  if (caso.sexo === null) faltando.push('sexo')

  if (caso.idadeAnos === null) {
    faltando.push('idadeAnos')
  } else if (!Number.isInteger(caso.idadeAnos)) {
    erros.idadeAnos = 'Informe a idade em anos completos.'
  } else if (caso.idadeAnos < FAIXAS.idadeAnos.min) {
    erros.idadeAnos = 'O MetaNutri calcula para pacientes a partir de 1 ano.'
  } else if (caso.idadeAnos > FAIXAS.idadeAnos.max) {
    erros.idadeAnos = `Idade acima de ${FAIXAS.idadeAnos.max} anos não é plausível.`
  }

  if (!Number.isInteger(caso.idadeMesesAdicionais) || caso.idadeMesesAdicionais < 0 || caso.idadeMesesAdicionais > 11) {
    erros.idadeMesesAdicionais = 'Os meses adicionais vão de 0 a 11.'
  }

  if (caso.modo === 'rapido') {
    // No modo rápido a meta de energia substitui o cálculo: peso e estatura deixam de ser obrigatórios.
    if (caso.metaEnergiaKcal === null) {
      avisos.push('Informe a meta de energia para acompanhar quanto o plano já cobre.')
    } else if (fora(caso.metaEnergiaKcal, FAIXAS.metaEnergiaKcal)) {
      erros.metaEnergiaKcal = `A meta de energia deve estar entre ${FAIXAS.metaEnergiaKcal.min} e ${FAIXAS.metaEnergiaKcal.max} kcal.`
    }
  }

  if (caso.pesoKg === null) {
    // No modo rápido peso é opcional; no completo, sem ele não há cálculo.
    if (caso.modo === 'completo') faltando.push('pesoKg')
  } else {
    const erro = erroDaFaixa('pesoKg', caso.pesoKg)
    if (erro !== null) erros.pesoKg = erro
  }

  if (caso.estaturaCm === null) {
    if (caso.modo === 'completo') faltando.push('estaturaCm')
  } else {
    const erro = erroDaFaixa('estaturaCm', caso.estaturaCm)
    if (erro !== null) erros.estaturaCm = erro
  }

  const erroDaCintura = caso.circunferenciaCinturaCm === null ? null : erroDaFaixa('circunferenciaCinturaCm', caso.circunferenciaCinturaCm)
  if (erroDaCintura !== null) erros.circunferenciaCinturaCm = erroDaCintura
  const erroDaPanturrilha = caso.circunferenciaPanturrilhaCm === null ? null : erroDaFaixa('circunferenciaPanturrilhaCm', caso.circunferenciaPanturrilhaCm)
  if (erroDaPanturrilha !== null) erros.circunferenciaPanturrilhaCm = erroDaPanturrilha

  const { condicao } = caso
  if (condicao.tipo !== 'nenhuma') {
    const nomeCondicao = condicao.tipo === 'gestante' ? 'Gestação' : 'Lactação'
    const faixa = FAIXAS.idadeGestacaoLactacao
    if (caso.sexo === 'M') {
      erros.condicao = `${nomeCondicao} só pode ser marcada para o sexo feminino.`
    } else if (caso.idadeAnos !== null && fora(caso.idadeAnos, faixa)) {
      erros.condicao = `As referências de ${nomeCondicao.toLowerCase()} cobrem de ${faixa.min} a ${faixa.max} anos.`
    } else if (condicao.tipo === 'gestante') {
      if (condicao.semanasGestacao === null) {
        avisos.push('Informe a idade gestacional para calcular o adicional de energia e o ganho de peso.')
      } else if (!Number.isInteger(condicao.semanasGestacao) || fora(condicao.semanasGestacao, FAIXAS.semanasGestacao)) {
        erros.condicao = `A idade gestacional vai de ${FAIXAS.semanasGestacao.min} a ${FAIXAS.semanasGestacao.max} semanas.`
      }
      if (condicao.pesoPreGestacionalKg === null) {
        avisos.push('Informe o peso pré-gestacional para classificar o IMC pré-gestacional.')
      } else if (fora(condicao.pesoPreGestacionalKg, FAIXAS.pesoKg)) {
        erros.condicao = `Peso pré-gestacional deve estar entre ${FAIXAS.pesoKg.min} e ${FAIXAS.pesoKg.max} kg.`
      }
    } else if (condicao.mesesPosParto === null) {
      avisos.push('Informe o tempo pós-parto para calcular o adicional de energia da lactação.')
    } else if (!Number.isInteger(condicao.mesesPosParto) || fora(condicao.mesesPosParto, FAIXAS.mesesPosParto)) {
      erros.condicao = `O tempo pós-parto vai de ${FAIXAS.mesesPosParto.min} a ${FAIXAS.mesesPosParto.max} meses.`
    }
  }

  return {
    erros,
    faltando,
    avisos,
    podeCalcular: faltando.length === 0 && Object.keys(erros).length === 0,
  }
}
