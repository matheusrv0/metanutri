// Os nomes do que vai por e-mail ao paciente e à nutricionista (spec lado-do-paciente, D-1224). Puro: o app e as
// funções do servidor usam os mesmos nomes e as mesmas frases curtas.

/** Os três avisos que o paciente aceita (D-1226). */
export type TipoDeAviso = 'plano' | 'semana' | 'lembrete'

export const TIPOS_DE_AVISO: readonly TipoDeAviso[] = ['plano', 'semana', 'lembrete']

export const ehTipoDeAviso = (valor: unknown): valor is TipoDeAviso => valor === 'plano' || valor === 'semana' || valor === 'lembrete'

/** Os nove e-mails (D-1224): serviço (S), aviso (A) e o resumo à nutricionista (N1). */
export type TipoDeEmail = 'S1' | 'S2' | 'S3' | 'S4' | 'A1' | 'A2' | 'A3' | 'A4' | 'N1'

export const EMAILS_DE_SERVICO: readonly TipoDeEmail[] = ['S1', 'S2', 'S3', 'S4']
export const EMAILS_DE_AVISO: readonly TipoDeEmail[] = ['A1', 'A2', 'A3', 'A4']

export const ehAviso = (tipo: TipoDeEmail): boolean => EMAILS_DE_AVISO.includes(tipo)

/** O aviso que cada e-mail de aviso entrega. */
export const AVISO_DO_EMAIL: Readonly<Partial<Record<TipoDeEmail, TipoDeAviso>>> = { A1: 'plano', A2: 'semana', A3: 'lembrete', A4: 'lembrete' }

/**
 * Como um aviso está para o paciente, no link (a folha "Avisos por e-mail", CA-2256): ligado (aceito para o e-mail de
 * agora), desligado (oferecido e não aceito, ou saiu) ou não oferecido pela nutricionista (não aparece, CA-2242).
 */
export type EstadoDoAvisoNoLink = 'ligado' | 'desligado' | 'nao-oferecido'

export type AvisosDoLink = Readonly<Record<TipoDeAviso, EstadoDoAvisoNoLink>>

export const AVISOS_NAO_OFERECIDOS: AvisosDoLink = { plano: 'nao-oferecido', semana: 'nao-oferecido', lembrete: 'nao-oferecido' }

/** O nome de cada aviso na folha "Avisos por e-mail", na ficha e na página do aceite (seção 6 da SPEC). */
export const NOME_DO_AVISO: Readonly<Record<TipoDeAviso, string>> = {
  plano: 'Plano atualizado',
  semana: 'Resumo da semana',
  lembrete: 'Lembrete',
}

/** Como o paciente pede cada aviso, na folha "Receber por e-mail" (CA-2240). */
export const PEDIDO_DO_AVISO: Readonly<Record<TipoDeAviso, string>> = {
  plano: 'Quando o plano mudar',
  semana: 'Resumo da semana',
  lembrete: 'Lembrete se eu ficar 3 dias sem marcar',
}

/** O nome do aviso na frase do descadastro: "Não receber mais o resumo da semana?" (seção 6 da SPEC). */
export const NOME_DO_AVISO_NA_FRASE: Readonly<Record<TipoDeAviso, string>> = {
  plano: 'o aviso de plano atualizado',
  semana: 'o resumo da semana',
  lembrete: 'o lembrete',
}

/** A versão do texto do aceite que fica guardada com ele (D-1226). */
export const VERSAO_DO_ACEITE = 'avisos-v1'

/** Os dias da semana como os e-mails e as telas escrevem ("toda quinta"). 0 é domingo. */
export const DIA_DA_SEMANA: readonly string[] = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** "Toda quinta" ou "Todo domingo": o artigo segue o gênero do dia. */
export const todoDia = (diaDaSemana: number): string => {
  const nome = DIA_DA_SEMANA[((diaDaSemana % 7) + 7) % 7] ?? 'segunda'
  return `${nome === 'domingo' || nome === 'sábado' ? 'Todo' : 'Toda'} ${nome}`
}
