// A conta está em dia neste navegador? (spec separacao-site-app, D-511, D-513, D-517 e DP-SA-7.)
//
// Em dia quer dizer que a nuvem tem tudo o que está no espaço da conta: apagar o espaço não perde nada. Quem usa: a
// saída por tempo (apaga só em dia, D-517), o site do endereço antigo (D-511) e o app que recebe os dados (D-513).
// Puro, sem React e sem o cliente do Supabase: o site também usa.
import { armazenamentoDaConta, PREFIXO_DE_CONTA } from './armazenamentoDaConta.ts'
import { CHAVE_RETIDOS, ehChaveDaNuvem, lerRetidos } from './copiaDaConta.ts'
import { CHAVE_DONO, chavesSemConta } from './donoDosDados.ts'
import type { ArmazenamentoListavel } from './persistencia.ts'
import { CHAVE_ACOMPANHAMENTOS } from './repositorioAcompanhamentos.ts'
import { CHAVE_NUVEM, lerSituacao } from './sincronia.ts'

export interface OpcoesEmDia {
  /**
   * O valor retido (DP-39) fica aqui e não sobe (D-173). O site e o app que recebe contam com ele: pode ser a única
   * cópia de algo. A saída por tempo, como o "Sair" (D-131), não conta.
   */
  readonly contarRetidos: boolean
}

/** Algum link de paciente com mudança daqui que não chegou à nuvem (CB-108). */
function temLinkPendente(guardado: string | null): boolean {
  if (guardado === null) return false
  try {
    const arquivo: unknown = JSON.parse(guardado)
    if (typeof arquivo !== 'object' || arquivo === null) return false
    const pendentes = (arquivo as Record<string, unknown>)['pendentes']
    return Array.isArray(pendentes) && pendentes.length > 0
  } catch {
    return false
  }
}

/**
 * D-511: em dia é a situação da nuvem existir, as mudanças não passarem das salvas, a cópia não estar parcial, não haver
 * valor retido (quando conta), nenhum link de paciente pendente e nenhum dado de antes das contas cujo dono seja ela ou
 * esteja vazio. DP-SA-23: sem dado da nuvem no espaço e sem dado de antes, não há o que perder, e está em dia. Sem
 * conseguir ler o navegador, não dá para afirmar: não está.
 */
export function contaEmDia(base: ArmazenamentoListavel, usuarioId: string, { contarRetidos }: OpcoesEmDia): boolean {
  try {
    if (chavesSemConta(base).length > 0) {
      const dono = base.getItem(CHAVE_DONO) || null
      if (dono === null || dono === usuarioId) return false
    }
    const conta = armazenamentoDaConta(base, usuarioId)
    const chaves: string[] = []
    for (let i = 0; i < conta.length; i += 1) {
      const chave = conta.key(i)
      if (chave !== null) chaves.push(chave)
    }
    const temDado = chaves.some((chave) => chave !== CHAVE_NUVEM && ehChaveDaNuvem(chave))
    const situacao = lerSituacao(conta)
    if (situacao === null) return !temDado && !chaves.includes(CHAVE_NUVEM)
    if (situacao.mudancas > situacao.salvas || situacao.parcial === true) return false
    if (contarRetidos && Object.keys(lerRetidos(conta.getItem(CHAVE_RETIDOS))).length > 0) return false
    return !temLinkPendente(conta.getItem(CHAVE_ACOMPANHAMENTOS))
  } catch {
    return false
  }
}

/** As contas que têm espaço neste navegador, cada uma uma vez (o site percorre todas, D-511). */
export function contasComEspaco(base: ArmazenamentoListavel): string[] {
  const contas = new Set<string>()
  try {
    for (let i = 0; i < base.length; i += 1) {
      const chave = base.key(i)
      if (!chave?.startsWith(PREFIXO_DE_CONTA)) continue
      const fim = chave.indexOf(':', PREFIXO_DE_CONTA.length)
      if (fim > PREFIXO_DE_CONTA.length) contas.add(decodeURIComponent(chave.slice(PREFIXO_DE_CONTA.length, fim)))
    }
  } catch {
    return []
  }
  return [...contas]
}
