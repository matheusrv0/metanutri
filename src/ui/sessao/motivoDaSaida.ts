// O que a saída por tempo deixa para a tela Entrar (spec separacao-site-app, D-517, D-526, DP-SA-5 e DP-SA-19).
//
// Fica fora do espaço da conta. Não diz o motivo: o texto é o mesmo para os 30 minutos, as 12 horas e o administrador
// (D-526). Fica até alguém entrar ou até o "Sair", para todas as abas mostrarem "Entre de novo" (CA-1445).
import type { Armazenamento } from '@/domain/persistencia.ts'
import { textoDaHora } from '@/domain/tempoDeSessao.ts'

export const CHAVE_SAIDA = 'metanutri:sessao:saida'

export interface SaidaGuardada {
  /** O último uso, no relógio deste computador (é a hora que a pessoa vê). */
  readonly ate: number
  /** Ficou no navegador algo que não subiu: o espaço da conta foi guardado (D-517, passo 4). */
  readonly pendente: boolean
}

export function gravarSaida(armazenamento: Armazenamento | null, saida: SaidaGuardada): void {
  try {
    armazenamento?.setItem(CHAVE_SAIDA, JSON.stringify(saida))
  } catch {
    // sem espaço: Entrar aparece sem o aviso
  }
}

export function lerSaida(armazenamento: Armazenamento | null): SaidaGuardada | null {
  try {
    const bruto: unknown = JSON.parse(armazenamento?.getItem(CHAVE_SAIDA) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null) return null
    const { ate, pendente } = bruto as Record<string, unknown>
    if (typeof ate !== 'number' || !Number.isFinite(ate) || typeof pendente !== 'boolean') return null
    return { ate, pendente }
  } catch {
    return null
  }
}

export function esquecerSaida(armazenamento: Armazenamento | null): void {
  try {
    armazenamento?.removeItem(CHAVE_SAIDA)
  } catch {
    // sem armazenamento: não há o que esquecer
  }
}

/** D-526: o aviso de "Entre de novo". */
export function textoDaSaida(saida: SaidaGuardada, agora: number): string {
  if (saida.pendente) return 'Sua sessão terminou. Entre para enviar o que ficou neste navegador.'
  return `Sua sessão terminou. Tudo até ${textoDaHora(saida.ate, agora)} está salvo.`
}
