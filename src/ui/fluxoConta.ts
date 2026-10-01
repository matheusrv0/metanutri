// Para onde cada botão de plano leva e para onde a pessoa vai depois do cadastro
// (spec estilo-spora, CA-117 e CA-122 a CA-133). Regras puras: a tela só navega.
import { planoSeguinte, type Ciclo, type IdPlano } from '@/domain/conta.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import type { Situacao } from '@/domain/situacao.ts'
import { ehPlanoPago, escreverRota, lerRota, rotaCriarConta, type Rota } from './navegacao.ts'

/** O destino do botão de um plano. `null` no Clínica: ele mostra o contato em vez de navegar. */
export function destinoDoPlano(plano: IdPlano, ciclo: Ciclo, temSessao: boolean): Rota | null {
  if (plano === 'clinica') return null
  if (ehPlanoPago(plano)) return temSessao ? { tela: 'assinar', plano, ciclo } : rotaCriarConta(plano, ciclo)
  // CA-305: com sessão, Comprovar matrícula; a conta de nutricionista vê lá por que não serve.
  if (plano === 'estudante') return temSessao ? { tela: 'comprovar-matricula' } : rotaCriarConta('estudante', 'mensal')
  return temSessao ? { tela: 'painel' } : rotaCriarConta(null, 'mensal')
}

/** Depois do cadastro (ou da confirmação do e-mail): estudante vai comprovar; plano pago vai pagar (CA-270). */
export function destinoDepoisDoCadastro(plano: IdPlano | null, ciclo: Ciclo, situacao: Situacao): Rota {
  if (situacao === 'estudante') return { tela: 'comprovar-matricula' }
  return plano !== null && ehPlanoPago(plano) ? { tela: 'assinar', plano, ciclo } : { tela: 'painel' }
}

/*
 * O destino fica guardado no aparelho, não na aba: a pessoa pode confirmar o e-mail
 * em outra aba e precisa cair no checkout mesmo assim.
 */
export const CHAVE_DESTINO = 'metanutri:destino-pendente'

export function guardarDestino(arm: Armazenamento | null, rota: Rota): void {
  try {
    arm?.setItem(CHAVE_DESTINO, escreverRota(rota))
  } catch {
    // sem armazenamento: depois da confirmação, a pessoa cai no painel
  }
}

/** Devolve o destino guardado e apaga, para ele valer uma vez só. */
export function tirarDestino(arm: Armazenamento | null): Rota | null {
  try {
    const hash = arm?.getItem(CHAVE_DESTINO) ?? null
    arm?.removeItem(CHAVE_DESTINO)
    return hash ? lerRota(hash) : null
  } catch {
    return null
  }
}

/** Do aviso de limite para Preços, com o plano seguinte em destaque (CA-177). */
export function rotaDePlanos(atual: IdPlano): Rota {
  const seguinte = planoSeguinte(atual)
  return seguinte ? { tela: 'precos', destaque: seguinte } : { tela: 'precos' }
}
