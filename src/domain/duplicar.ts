// Duplicar plano: o retorno do paciente começa do plano anterior, não do zero.
import { IDADE_ADULTO } from './antropometria.ts'
import { clonarPlano } from './modelos.ts'
import { idadeNaData } from './pacientes.ts'
import type { Caso, ComposicaoCorporal, DadosDaAvaliacao, MedidasCorporais, Plano } from './tipos.ts'

export interface OpcoesDuplicar {
  /** Data da nova consulta no formato AAAA-MM-DD; `null` deixa o campo em branco. */
  readonly hoje?: string | null
  /** A data de nascimento da ficha do paciente: a idade na data nova decide se a estatura vai (spec ficha-unica, D-367). */
  readonly nascimento?: string | null
}

const SUFIXO = /\s*\(cópia(?: (\d+))?\)$/

/** "Plano" → "Plano (cópia)" → "Plano (cópia 2)": não empilha parênteses. */
export function nomeDaCopia(nome: string): string {
  const base = nome.trim()
  if (base === '') return 'Cópia do plano'
  const achado = SUFIXO.exec(base)
  if (!achado) return `${base} (cópia)`
  const anterior = achado[1] === undefined ? 1 : Number(achado[1])
  return `${base.replace(SUFIXO, '')} (cópia ${anterior + 1})`
}

/**
 * O que a duplicação faz com cada campo do plano (spec ficha-unica, D-367):
 * - `copiado`: dado do paciente, da prescrição, do documento ou preferência; vai igual;
 * - `novo`: a cópia ganha o seu (id, nome com "(cópia)" e a data da consulta nova);
 * - `medida do dia`: medida tirada na consulta; no retorno de um paciente, vem vazia;
 * - `medida do dia abaixo de 20 anos`: a estatura e os comprimentos e diâmetros ósseos, que só vão para quem já é
 *   adulto na data nova;
 * - `arquivo do dia`: as fotos e os anexos da avaliação, que nunca vão na cópia, com ou sem paciente: o arquivo é da
 *   avaliação de origem (spec antropometria-telas, D-1436).
 */
export type NaDuplicacao = 'copiado' | 'novo' | 'medida do dia' | 'medida do dia abaixo de 20 anos' | 'arquivo do dia'

/** Só campo que aceita vazio (`null`) pode ser medida do dia ou arquivo do dia: a cópia o deixa `null`. */
type ClasseDoCampo<V> = null extends V ? NaDuplicacao : Exclude<NaDuplicacao, 'medida do dia' | 'medida do dia abaixo de 20 anos' | 'arquivo do dia'>

type Classificacao<T> = { readonly [K in keyof T]-?: ClasseDoCampo<T[K]> }

/** Todo campo do plano, um por um: campo novo em `Caso` ou na composição corporal não compila sem entrar aqui. */
export type ClassificacaoDoPlano = Omit<Classificacao<Caso>, 'composicao' | 'medidasCorporais' | 'avaliacao'> & {
  readonly medidasCorporais: Classificacao<MedidasCorporais>
  readonly avaliacao: Classificacao<DadosDaAvaliacao>
  readonly composicao: Omit<Classificacao<ComposicaoCorporal>, 'dobras' | 'bioimpedancia'> & {
    readonly dobras: Classificacao<ComposicaoCorporal['dobras']>
    readonly bioimpedancia: Classificacao<ComposicaoCorporal['bioimpedancia']>
  }
}

/** A lista única do D-367. O teste confere que ela cobre todo campo do plano, e só os que existem. */
export const NA_DUPLICACAO: ClassificacaoDoPlano = {
  // A cópia ganha os seus.
  id: 'novo',
  nome: 'novo',
  dataConsulta: 'novo',
  // Do paciente: com paciente, a ficha manda (D-340); sem paciente, são do caso de estudo.
  pacienteId: 'copiado',
  sexo: 'copiado',
  idadeAnos: 'copiado',
  idadeMesesAdicionais: 'copiado',
  condicao: 'copiado',
  ocupacao: 'copiado',
  diagnosticoClinico: 'copiado',
  // Medidas da consulta.
  pesoKg: 'medida do dia',
  // A criança e o adolescente crescem entre as consultas; o adulto, não (IDADE_ADULTO, o fim da curva de estatura).
  estaturaCm: 'medida do dia abaixo de 20 anos',
  circunferenciaCinturaCm: 'medida do dia',
  circunferenciaPanturrilhaCm: 'medida do dia',
  // Spec antropometria-completa (CA-2002): as medidas novas são do dia; o ponto da cintura é protocolo e vai igual,
  // como o protocolo das dobras. Diâmetros, altura do joelho e semienvergadura são osso: vão como a estatura (D-1041).
  medidasCorporais: {
    bracoRelaxadoDireitoCm: 'medida do dia',
    bracoRelaxadoEsquerdoCm: 'medida do dia',
    bracoContraidoDireitoCm: 'medida do dia',
    bracoContraidoEsquerdoCm: 'medida do dia',
    antebracoCm: 'medida do dia',
    punhoCm: 'medida do dia',
    pescocoCm: 'medida do dia',
    ombroCm: 'medida do dia',
    peitoralCm: 'medida do dia',
    pontoDaCintura: 'copiado',
    abdomenCm: 'medida do dia',
    quadrilCm: 'medida do dia',
    coxaDireitaCm: 'medida do dia',
    coxaEsquerdaCm: 'medida do dia',
    coxaProximalDireitaCm: 'medida do dia',
    coxaProximalEsquerdaCm: 'medida do dia',
    panturrilhaEsquerdaCm: 'medida do dia',
    diametroPunhoCm: 'medida do dia abaixo de 20 anos',
    diametroCotoveloCm: 'medida do dia abaixo de 20 anos',
    diametroJoelhoCm: 'medida do dia abaixo de 20 anos',
    alturaDoJoelhoCm: 'medida do dia abaixo de 20 anos',
    semienvergaduraCm: 'medida do dia abaixo de 20 anos',
  },
  // Spec antropometria-telas (D-1436): a origem, a maturação, o diagnóstico e as observações são do dia; o instrumento,
  // as escolhas da nutricionista e a autorização de fotos vão iguais; as fotos e os anexos nunca vão.
  avaliacao: {
    origemPesoEstatura: 'medida do dia',
    modalidade: 'copiado',
    adipometro: 'copiado',
    maturacao: 'medida do dia',
    grupoDoEstudo: 'copiado',
    perfil: 'copiado',
    imcAlvo: 'copiado',
    gorduraAlvoPct: 'copiado',
    baseDaProteina: 'copiado',
    doencaRenalGrave: 'copiado',
    diagnostico: 'medida do dia',
    observacoesDaMedida: 'medida do dia',
    fotosAutorizadasEm: 'copiado',
    fotos: 'arquivo do dia',
    anexos: 'arquivo do dia',
  },
  composicao: {
    // Preferências: comparar consultas pede o mesmo protocolo e o mesmo aparelho.
    protocolo: 'copiado',
    dobras: {
      tricipital: 'medida do dia',
      subescapular: 'medida do dia',
      suprailiaca: 'medida do dia',
      abdominal: 'medida do dia',
      peitoral: 'medida do dia',
      coxa: 'medida do dia',
      bicipital: 'medida do dia',
      supraespinal: 'medida do dia',
      axilarMedia: 'medida do dia',
      panturrilhaMedial: 'medida do dia',
      suprailiacaAnt: 'medida do dia',
      suprailiacaMed: 'medida do dia',
    },
    bioimpedancia: {
      gorduraPct: 'medida do dia',
      massaMagraKg: 'medida do dia',
      aguaPct: 'medida do dia',
      aparelho: 'copiado',
    },
  },
  // Da prescrição: conduta, que a nutricionista revê no retorno.
  modo: 'copiado',
  metaEnergiaKcal: 'copiado',
  energia: 'copiado',
  metasMacros: 'copiado',
  adequacao: 'copiado',
  quantidades: 'copiado',
  linhaDaAgua: 'copiado',
  metodoAgua: 'copiado',
  aguaLitros: 'copiado',
  // Do documento.
  orientacoes: 'copiado',
  receitas: 'copiado',
  estagiario: 'copiado',
  preceptor: 'copiado',
  observacoes: 'copiado',
  // Sem uso desde o D-346; continua gravado.
  objetivo: 'copiado',
}

type Ramo = { readonly [chave: string]: NaDuplicacao | Ramo }

/**
 * A cópia do valor com as medidas do dia vazias, descendo onde a lista desce. O original não muda. `soArquivos`: o plano
 * sem paciente, que leva as medidas e perde só os arquivos (D-1436).
 */
function semAsMedidas(valor: object, ramo: Ramo, adulto: boolean, soArquivos: boolean): object {
  const copia: Record<string, unknown> = { ...valor }
  for (const [chave, classe] of Object.entries(ramo)) {
    const atual = copia[chave]
    if (typeof classe !== 'string') {
      if (atual !== null && typeof atual === 'object') copia[chave] = semAsMedidas(atual, classe, adulto, soArquivos)
    } else if (classe === 'arquivo do dia' || (!soArquivos && (classe === 'medida do dia' || (classe === 'medida do dia abaixo de 20 anos' && !adulto)))) {
      copia[chave] = null
    }
  }
  return copia
}

/**
 * Adulto na data nova: pela ficha (D-341); sem data de nascimento nela, pela idade gravada no plano de origem, que só
 * pode ter crescido até a data nova. Sem nenhuma das duas, não é adulto (CB-359: a estatura fica vazia).
 */
function adultoNaData(caso: Caso, nascimento: string | null, dia: string): boolean {
  const idade = idadeNaData(nascimento, dia)?.anos ?? caso.idadeAnos
  return idade !== null && idade >= IDADE_ADULTO
}

/**
 * Cópia independente do caso e do plano: ids novos em tudo, mesmo paciente, data da consulta trocada pela de hoje.
 * No retorno de um paciente, as medidas do dia ficam vazias (peso, cintura, panturrilha, dobras, bioimpedância e
 * circunferências; a estatura, os diâmetros, a altura do joelho e a semienvergadura abaixo de 20 anos), para ninguém salvar a medida velha como nova; a tela mostra o último peso ao lado
 * (spec ficha-unica, D-358 e D-367). Plano sem paciente leva tudo, como sempre (CB-356).
 */
export function duplicarCaso(
  registro: { readonly caso: Caso; readonly plano: Plano },
  gerarId: () => string,
  opcoes: OpcoesDuplicar = {},
): { readonly caso: Caso; readonly plano: Plano } {
  const hojeDeVerdade = new Date().toISOString().slice(0, 10)
  const hoje = opcoes.hoje === undefined ? hojeDeVerdade : opcoes.hoje
  const original = registro.caso
  const adulto = adultoNaData(original, opcoes.nascimento ?? null, hoje ?? hojeDeVerdade)
  // A classificação só põe `null` em campo que aceita `null` (ClasseDoCampo): o resultado continua um Caso. Sem paciente,
  // só os arquivos saem (CB-356; D-1436).
  const medido = semAsMedidas(original, NA_DUPLICACAO, adulto, original.pacienteId === null) as Caso
  return {
    caso: {
      ...medido,
      id: gerarId(),
      nome: nomeDaCopia(original.nome),
      dataConsulta: hoje,
    },
    plano: clonarPlano(registro.plano, gerarId),
  }
}
