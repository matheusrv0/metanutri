// O aparelho lembra os links abertos (spec lado-do-paciente, D-1218 e DP-LP-21): quem fecha a aba e abre
// app.metanutri.com.br vê "Abrir meu plano" acima do login. Guarda só o token, o primeiro nome do paciente, o nome da
// nutricionista e o dia do último acesso: nada da dieta nem das missões (a cópia para abrir sem internet é a do CA-754,
// em outro lugar). Até 5 links, o mais recente primeiro. Sem armazenamento (aba anônima), nada é lembrado (CB-1226).
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_DOS_MEUS_PLANOS = 'metanutri:meus-planos'

/** D-1218: até 5 links (CA-2227: com 6, só os 5 mais recentes). */
export const PLANOS_LEMBRADOS = 5

export interface PlanoLembrado {
  readonly token: string
  /** "Juliana"; vazio quando o plano não tem nome (CB-1227). */
  readonly primeiroNome: string
  /** "Ana Lima"; vazio quando a nuvem não disse. */
  readonly nutricionista: string
  /** AAAA-MM-DD. */
  readonly ultimoAcesso: string
}

const TOKEN = /^[a-z0-9]{12,64}$/
const DIA = /^\d{4}-\d{2}-\d{2}$/

const texto = (valor: unknown, maximo: number): string => (typeof valor === 'string' ? valor.trim().slice(0, maximo) : '')

function ehPlano(valor: unknown): PlanoLembrado | null {
  if (typeof valor !== 'object' || valor === null) return null
  const o = valor as Record<string, unknown>
  const token = o['token']
  const ultimoAcesso = o['ultimoAcesso']
  if (typeof token !== 'string' || !TOKEN.test(token) || typeof ultimoAcesso !== 'string' || !DIA.test(ultimoAcesso)) return null
  return { token, primeiroNome: texto(o['primeiroNome'], 60), nutricionista: texto(o['nutricionista'], 120), ultimoAcesso }
}

/** Os links lembrados, do mais recente para o mais antigo. Guardado estragado conta como nada. */
export function lerMeusPlanos(armazenamento: Armazenamento | null): readonly PlanoLembrado[] {
  if (!armazenamento) return []
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE_DOS_MEUS_PLANOS) ?? '[]')
    if (!Array.isArray(bruto)) return []
    const vistos = new Set<string>()
    return bruto
      .map(ehPlano)
      .filter((p): p is PlanoLembrado => p !== null && !vistos.has(p.token) && Boolean(vistos.add(p.token)))
      .slice(0, PLANOS_LEMBRADOS)
  } catch {
    return []
  }
}

function gravar(armazenamento: Armazenamento | null, planos: readonly PlanoLembrado[]): void {
  try {
    armazenamento?.setItem(CHAVE_DOS_MEUS_PLANOS, JSON.stringify(planos.slice(0, PLANOS_LEMBRADOS)))
  } catch {
    // Armazenamento cheio ou bloqueado: o aparelho só não lembra (CB-1226).
  }
}

/**
 * D-1218: ao abrir um link, ele vai para o começo da lista, com o nome e o dia de hoje. O nome da nutricionista que a
 * nuvem não mandou (sem internet) fica o que já estava guardado.
 */
export function lembrarPlano(armazenamento: Armazenamento | null, plano: PlanoLembrado): void {
  if (!TOKEN.test(plano.token)) return
  const antes = lerMeusPlanos(armazenamento)
  const anterior = antes.find((p) => p.token === plano.token)
  const atual: PlanoLembrado = {
    token: plano.token,
    primeiroNome: plano.primeiroNome.trim() || anterior?.primeiroNome || '',
    nutricionista: plano.nutricionista.trim() || anterior?.nutricionista || '',
    ultimoAcesso: plano.ultimoAcesso,
  }
  gravar(armazenamento, [atual, ...antes.filter((p) => p.token !== plano.token)])
}

/** CA-2228: "Esquecer neste aparelho" tira o link da lista; o link continua valendo para quem tem o endereço. */
export function esquecerPlano(armazenamento: Armazenamento | null, token: string): void {
  const antes = lerMeusPlanos(armazenamento)
  if (antes.some((p) => p.token === token)) gravar(armazenamento, antes.filter((p) => p.token !== token))
}

/** O endereço antigo foi trocado pelo do link fixo (D-1217): a lembrança passa para o token novo. */
export function trocarTokenLembrado(armazenamento: Armazenamento | null, antigo: string, novo: string): void {
  if (antigo === novo || !TOKEN.test(novo)) return
  const antes = lerMeusPlanos(armazenamento)
  if (!antes.some((p) => p.token === antigo)) return
  gravar(
    armazenamento,
    antes.flatMap((p) => (p.token === antigo ? [{ ...p, token: novo }] : p.token === novo ? [] : [p])),
  )
}

/** "Juliana · Ana Lima"; sem um dos dois, o que houver; sem nenhum, "Seu plano". */
export function nomeDoPlanoLembrado(plano: PlanoLembrado): string {
  const partes = [plano.primeiroNome, plano.nutricionista].filter((parte) => parte !== '')
  return partes.length === 0 ? 'Seu plano' : partes.join(' · ')
}
