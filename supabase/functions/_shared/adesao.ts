// A conta da adesão: quantos dias da semana o paciente marcou, quando marcou pela última vez e o estado que a
// nutricionista vê (em dia, atenção, parou de marcar, ainda não começou). Mora aqui, em `_shared`, para o app e as
// funções do servidor fazerem a mesma conta (spec lado-do-paciente, DP-LP-15): o resumo da semana que o paciente
// recebe por e-mail e a Adesão da nutricionista não podem discordar (D-1207, CA-2211).
//
// Puro: sem Deno, sem DOM, sem relógio. O app reexporta tudo isto de `src/domain/acompanhamento.ts`.

export interface MarcacaoDia {
  /** Dia do calendário, AAAA-MM-DD, no fuso de quem marcou. */
  readonly dia: string
  /** Ids das missões marcadas naquele dia. */
  readonly feitas: readonly string[]
}

/** O que a conta da adesão lê de um link: as marcações e o dia em que ele foi criado. */
export interface MarcacoesDoLink {
  readonly marcacoes: readonly MarcacaoDia[]
}

export interface LinkParaAdesao extends MarcacoesDoLink {
  /** ISO; só o dia (os 10 primeiros caracteres) conta. */
  readonly criadoEm: string
}

/** Dias sem nenhuma marcação até o paciente contar como sumido. */
export const DIAS_PARA_SUMIR = 4

/** Dias com missão marcada na semana para o paciente contar como em dia (métrica do plano). */
export const DIAS_NA_SEMANA_PARA_EM_DIA = 4

const DIA_EM_MS = 24 * 60 * 60 * 1000

/** Distância em dias entre dois dias de calendário. Negativo quando `b` é anterior. */
export function diasEntre(a: string, b: string): number {
  const inicio = Date.parse(`${a}T00:00:00Z`)
  const fim = Date.parse(`${b}T00:00:00Z`)
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return Number.NaN
  return Math.round((fim - inicio) / DIA_EM_MS)
}

/** Quantos dos últimos sete dias, contando hoje, tiveram ao menos uma missão marcada. */
export function diasMarcadosNaSemana(link: MarcacoesDoLink, hoje: string): number {
  return link.marcacoes.filter((m) => {
    if (m.feitas.length === 0) return false
    const atras = diasEntre(m.dia, hoje)
    return !Number.isNaN(atras) && atras >= 0 && atras < 7
  }).length
}

/** Dia da marcação mais recente, ou nulo se o paciente nunca marcou nada. */
export function ultimaMarcacao(link: MarcacoesDoLink): string | null {
  const dias = link.marcacoes.filter((m) => m.feitas.length > 0).map((m) => m.dia)
  return dias.length === 0 ? null : (dias.sort((a, b) => b.localeCompare(a))[0] ?? null)
}

export type EstadoAcompanhamento = 'em-dia' | 'atencao' | 'sumindo' | 'nao-comecou'

/**
 * O estado que o nutricionista vê na lista. A ordem das perguntas importa:
 * quem sumiu precisa aparecer como sumindo mesmo que tenha ido bem na semana passada.
 */
export function estadoDoAcompanhamento(link: LinkParaAdesao, hoje: string): EstadoAcompanhamento {
  const ultima = ultimaMarcacao(link)

  if (ultima === null) {
    const desdeCriacao = diasEntre(link.criadoEm.slice(0, 10), hoje)
    return !Number.isNaN(desdeCriacao) && desdeCriacao >= DIAS_PARA_SUMIR ? 'sumindo' : 'nao-comecou'
  }

  const atras = diasEntre(ultima, hoje)
  if (!Number.isNaN(atras) && atras >= DIAS_PARA_SUMIR) return 'sumindo'
  return diasMarcadosNaSemana(link, hoje) >= DIAS_NA_SEMANA_PARA_EM_DIA ? 'em-dia' : 'atencao'
}

export const ROTULO_ESTADO: Readonly<Record<EstadoAcompanhamento, string>> = {
  'em-dia': 'Em dia',
  atencao: 'Atenção',
  sumindo: 'Parou de marcar',
  'nao-comecou': 'Ainda não começou',
}
