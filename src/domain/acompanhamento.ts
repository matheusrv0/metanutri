// Acompanhamento: a ponte entre o plano que o nutricionista montou e o paciente
// que precisa cumprir. O plano vira missões (ver `missoes.ts`), o paciente marca o
// que fez num link próprio, e daí sai a única métrica que diz se o produto funciona
// — quem está marcando e quem está sumindo (`docs/plano-negocio.md`).
import type { Missao } from './missoes.ts'

export interface MarcacaoDia {
  /** Dia do calendário, AAAA-MM-DD, no fuso de quem marcou. */
  readonly dia: string
  /** Ids das missões marcadas naquele dia. */
  readonly feitas: readonly string[]
}

export interface Acompanhamento {
  readonly id: string
  /** O que vai no link público. Quem tem o token abre as missões sem conta. */
  readonly token: string
  readonly casoId: string
  readonly pacienteId: string | null
  /** Como o paciente é chamado na tela dele. */
  readonly nome: string
  readonly criadoEm: string
  /**
   * As missões ficam congeladas aqui na hora de gerar o link: se o nutricionista
   * mexer no plano depois, o paciente não vê a lista trocar debaixo do pé. Para
   * atualizar é preciso gerar de novo, e isso é explícito.
   */
  readonly missoes: readonly Missao[]
  readonly marcacoes: readonly MarcacaoDia[]
  /**
   * Link criado por conta de estudante. A tela do paciente avisa, como o WebDiet faz:
   * quem está do outro lado precisa saber que não é atendimento profissional.
   */
  readonly usoNaoComercial: boolean
}

/** Dias sem nenhuma marcação até o paciente contar como sumido. */
export const DIAS_PARA_SUMIR = 4

/** Dias com missão marcada na semana para o paciente contar como em dia (métrica do plano). */
export const DIAS_NA_SEMANA_PARA_EM_DIA = 4

const DIA_EM_MS = 24 * 60 * 60 * 1000

/**
 * Dia do calendário de quem está olhando, não em UTC. `toISOString()` daria o dia
 * errado: às 21h de Brasília já é o dia seguinte em UTC, e as missões de hoje
 * sumiriam da tela do paciente antes da hora de dormir.
 */
export function diaLocal(data: Date = new Date()): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

/** Distância em dias entre dois dias de calendário. Negativo quando `b` é anterior. */
export function diasEntre(a: string, b: string): number {
  const inicio = Date.parse(`${a}T00:00:00Z`)
  const fim = Date.parse(`${b}T00:00:00Z`)
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return Number.NaN
  return Math.round((fim - inicio) / DIA_EM_MS)
}

const ALFABETO = 'abcdefghijkmnopqrstuvwxyz23456789'
const TAMANHO_TOKEN = 12

export type Aleatorio = (tamanho: number) => Uint8Array

const aleatorioPadrao: Aleatorio = (tamanho) => globalThis.crypto.getRandomValues(new Uint8Array(tamanho))

/**
 * Token do link do paciente. Sem "l", "1" e "0" para ninguém errar ao ditar por
 * telefone. Doze caracteres nesse alfabeto dão espaço suficiente para o link não
 * ser adivinhado por tentativa.
 */
export function gerarToken(aleatorio: Aleatorio = aleatorioPadrao): string {
  const bytes = aleatorio(TAMANHO_TOKEN)
  let token = ''
  for (const byte of bytes) token += ALFABETO[byte % ALFABETO.length]
  return token
}

export interface DadosNovoAcompanhamento {
  readonly casoId: string
  readonly pacienteId: string | null
  readonly nome: string
  readonly missoes: readonly Missao[]
  readonly usoNaoComercial?: boolean
}

export interface OpcoesAcompanhamento {
  readonly agora?: () => string
  readonly gerarId?: () => string
  readonly aleatorio?: Aleatorio
}

export function criarAcompanhamento(dados: DadosNovoAcompanhamento, opcoes: OpcoesAcompanhamento = {}): Acompanhamento {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const gerarId = opcoes.gerarId ?? (() => globalThis.crypto.randomUUID())
  return {
    id: gerarId(),
    token: gerarToken(opcoes.aleatorio),
    casoId: dados.casoId,
    pacienteId: dados.pacienteId,
    nome: dados.nome.trim(),
    criadoEm: agora(),
    missoes: dados.missoes,
    marcacoes: [],
    usoNaoComercial: dados.usoNaoComercial ?? false,
  }
}

/**
 * Gera um link novo para o mesmo acompanhamento: token novo (o antigo para de
 * valer) e missões atualizadas com o plano de agora. O histórico de marcações
 * continua, porque quem marcou marcou — e é dele que sai a adesão. Missão que
 * saiu do plano simplesmente não aparece mais na tela do paciente.
 */
export function regerarLink(
  acompanhamento: Acompanhamento,
  dados: { readonly nome?: string; readonly missoes: readonly Missao[] },
  opcoes: Pick<OpcoesAcompanhamento, 'aleatorio'> = {},
): Acompanhamento {
  return {
    ...acompanhamento,
    token: gerarToken(opcoes.aleatorio),
    missoes: dados.missoes,
    nome: dados.nome?.trim() ?? acompanhamento.nome,
  }
}

/** O que o paciente marcou num dia. Dia sem registro devolve lista vazia. */
export function feitasNoDia(acompanhamento: Acompanhamento, dia: string): readonly string[] {
  return acompanhamento.marcacoes.find((m) => m.dia === dia)?.feitas ?? []
}

/**
 * Marca ou desmarca uma missão no dia e devolve um acompanhamento novo.
 * Missão que não existe na lista congelada é ignorada: link adulterado não cria dado.
 */
export function marcarMissao(acompanhamento: Acompanhamento, dia: string, missaoId: string, feita: boolean): Acompanhamento {
  if (!acompanhamento.missoes.some((m) => m.id === missaoId)) return acompanhamento

  const atuais = feitasNoDia(acompanhamento, dia)
  if (feita === atuais.includes(missaoId)) return acompanhamento

  const novas = feita ? [...atuais, missaoId] : atuais.filter((id) => id !== missaoId)
  const outras = acompanhamento.marcacoes.filter((m) => m.dia !== dia)
  const marcacoes =
    novas.length === 0 ? outras : [...outras, { dia, feitas: novas }].sort((a, b) => a.dia.localeCompare(b.dia))

  return { ...acompanhamento, marcacoes }
}

export interface MissaoDoDia extends Missao {
  readonly feita: boolean
}

/** As missões do dia com o estado de cada uma, na ordem em que foram geradas. */
export function missoesDoDia(acompanhamento: Acompanhamento, dia: string): readonly MissaoDoDia[] {
  const feitas = feitasNoDia(acompanhamento, dia)
  return acompanhamento.missoes.map((missao) => ({ ...missao, feita: feitas.includes(missao.id) }))
}

export interface ProgressoDia {
  readonly feitas: number
  readonly total: number
  /** Inteiro de 0 a 100. Zero quando não há missão nenhuma. */
  readonly pct: number
}

export function progressoDoDia(acompanhamento: Acompanhamento, dia: string): ProgressoDia {
  const total = acompanhamento.missoes.length
  const feitas = feitasNoDia(acompanhamento, dia).length
  return { feitas, total, pct: total === 0 ? 0 : Math.round((feitas / total) * 100) }
}

/** Quantos dos últimos sete dias, contando hoje, tiveram ao menos uma missão marcada. */
export function diasMarcadosNaSemana(acompanhamento: Acompanhamento, hoje: string): number {
  return acompanhamento.marcacoes.filter((m) => {
    if (m.feitas.length === 0) return false
    const atras = diasEntre(m.dia, hoje)
    return !Number.isNaN(atras) && atras >= 0 && atras < 7
  }).length
}

/** Dia da marcação mais recente, ou nulo se o paciente nunca marcou nada. */
export function ultimaMarcacao(acompanhamento: Acompanhamento): string | null {
  const dias = acompanhamento.marcacoes.filter((m) => m.feitas.length > 0).map((m) => m.dia)
  return dias.length === 0 ? null : (dias.sort((a, b) => b.localeCompare(a))[0] ?? null)
}

/**
 * Última vez que este paciente deu sinal de vida. É o que a cobrança olha para
 * saber se ele conta como paciente ativo (`ehPacienteAtivo` em `conta.ts`).
 * Sem marcação nenhuma, vale a criação do link: o plano foi entregue.
 */
export function ultimaAtividade(acompanhamento: Acompanhamento): string {
  const marcacao = ultimaMarcacao(acompanhamento)
  return marcacao ? `${marcacao}T12:00:00.000Z` : acompanhamento.criadoEm
}

export type EstadoAcompanhamento = 'em-dia' | 'atencao' | 'sumindo' | 'nao-comecou'

/**
 * O estado que o nutricionista vê na lista. A ordem das perguntas importa:
 * quem sumiu precisa aparecer como sumindo mesmo que tenha ido bem na semana passada.
 */
export function estadoDoAcompanhamento(acompanhamento: Acompanhamento, hoje: string): EstadoAcompanhamento {
  const ultima = ultimaMarcacao(acompanhamento)

  if (ultima === null) {
    const desdeCriacao = diasEntre(acompanhamento.criadoEm.slice(0, 10), hoje)
    return !Number.isNaN(desdeCriacao) && desdeCriacao >= DIAS_PARA_SUMIR ? 'sumindo' : 'nao-comecou'
  }

  const atras = diasEntre(ultima, hoje)
  if (!Number.isNaN(atras) && atras >= DIAS_PARA_SUMIR) return 'sumindo'
  return diasMarcadosNaSemana(acompanhamento, hoje) >= DIAS_NA_SEMANA_PARA_EM_DIA ? 'em-dia' : 'atencao'
}

export const ROTULO_ESTADO: Readonly<Record<EstadoAcompanhamento, string>> = {
  'em-dia': 'Em dia',
  atencao: 'Atenção',
  sumindo: 'Sumindo',
  'nao-comecou': 'Ainda não começou',
}

export const EXPLICACAO_ESTADO: Readonly<Record<EstadoAcompanhamento, string>> = {
  'em-dia': `Marcou missão em ${DIAS_NA_SEMANA_PARA_EM_DIA} dias ou mais na última semana.`,
  atencao: 'Está marcando, mas menos do que a meta da semana.',
  sumindo: `Sem marcar nada há ${DIAS_PARA_SUMIR} dias ou mais. É a hora de chamar.`,
  'nao-comecou': 'O link foi criado e o paciente ainda não marcou nada.',
}
