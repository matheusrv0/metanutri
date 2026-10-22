// Excluir a conta pelo site (spec exclusao-de-conta, D-251 e D-255). Confere a senha com a mesma entrada de Entrar
// (que renova a sessão e põe a hora da entrada no token), pede a exclusão à função excluir-conta e, dando certo,
// termina como "Sair": a nuvem para, a cópia de trabalho deste navegador é apagada e a sessão sai.
import { useRef, useState } from 'react'
import { MENSAGEM_ERRO } from '@/domain/conta.ts'
import { marcarContaExcluida } from '../contaExcluida.ts'
import { anotarExclusaoPedida, esquecerExclusaoPedida } from '../exclusaoPedida.ts'
import type { ExtraDoPedido } from '../publico/conta/usarVerificacao.ts'
import { useNuvem } from './contextoNuvem.ts'
import { obterSupabase } from './supabase.ts'
import { chamar, PEDIDO_EM_ANDAMENTO, SESSAO_TERMINOU } from './usarAssinatura.ts'
import type { ValorConta } from './usarConta.ts'

/** CA-806. */
export const SENHA_INCORRETA = 'Senha incorreta.'
/** CA-809: a mesma frase da função. */
export const EXCLUSAO_NAO_TERMINOU = 'Não foi possível concluir a exclusão. Sua conta continua ativa. Tente de novo em alguns minutos.'
/** CA-816: a função achou a senha antiga. */
export const CONFIRME_A_SENHA = 'Confirme sua senha de novo.'
/** CB-250: a senha conferida vale para tentar de novo sem conferir outra vez. O servidor aceita 10 minutos; aqui, 9, com folga. */
export const SENHA_CONFERIDA_VALE_MS = 9 * 60_000

/** `naSenha`: a frase é sobre a senha (o campo fica marcado). */
export type ResultadoDaExclusao = { readonly ok: true } | { readonly ok: false; readonly erro: string; readonly naSenha: boolean }

export interface ValorExclusao {
  /** Um pedido está em andamento. */
  readonly excluindo: boolean
  /** `extra` é o token da verificação contra robôs, quando há (D-113). */
  readonly excluir: (senha: string, extra: ExtraDoPedido) => Promise<ResultadoDaExclusao>
}

const falhou = (erro: string, naSenha = false): ResultadoDaExclusao => ({ ok: false, erro, naSenha })

/** O servidor de login diz que o login desta sessão não existe mais. Sem resposta, ou sem sessão, não dá para saber: falso. */
async function loginApagado(): Promise<boolean> {
  try {
    const resposta = await obterSupabase()?.auth.getUser()
    return resposta?.error?.code === 'user_not_found'
  } catch {
    return false
  }
}

export interface OpcoesDaExclusao {
  /** CA-809 (L5 da revisão): o pedido cancelou a assinatura e não terminou; quem chama relê a assinatura. */
  readonly aoCancelarAssinatura?: () => void
  /** O relógio; só muda nos testes. */
  readonly agora?: () => number
}

/**
 * `aoExcluida` é o mesmo de depois de "Sair": vai para a página inicial e recarrega.
 */
export function useExclusaoDaConta(conta: Pick<ValorConta, 'sessao' | 'entrar' | 'sair'>, aoExcluida: () => void, opcoes: OpcoesDaExclusao = {}): ValorExclusao {
  const { aoCancelarAssinatura, agora = Date.now } = opcoes
  const nuvem = useNuvem()
  const [excluindo, setExcluindo] = useState(false)
  // CA-807: um pedido por vez; o segundo clique não sai.
  const ocupado = useRef(false)
  // CB-250: quando a senha foi conferida por último neste navegador; lido só nos manipuladores.
  const conferidaEm = useRef<number | null>(null)

  /** D-255 (CA-808): como "Sair": a nuvem para antes de a cópia de trabalho ser apagada. */
  const terminar = async (): Promise<ResultadoDaExclusao> => {
    nuvem?.parar()
    await conta.sair()
    esquecerExclusaoPedida()
    marcarContaExcluida()
    aoExcluida()
    return { ok: true }
  }

  const excluir = async (senha: string, extra: ExtraDoPedido): Promise<ResultadoDaExclusao> => {
    if (ocupado.current) return falhou(PEDIDO_EM_ANDAMENTO)
    const sessao = conta.sessao
    if (!sessao) return falhou(SESSAO_TERMINOU)
    ocupado.current = true
    setExcluindo(true)
    try {
      const conferida = conferidaEm.current
      if (conferida === null || agora() - conferida > SENHA_CONFERIDA_VALE_MS) {
        conferidaEm.current = null
        // D-251: a mesma entrada de Entrar, com a verificação (CA-811). Errada, a sessão de agora continua.
        const entrou = await conta.entrar(sessao.email, senha, ...extra)
        if (!entrou.ok) {
          const motivo = entrou.erro ?? 'falha-rede'
          if (motivo !== 'credencial-invalida') return falhou(MENSAGEM_ERRO[motivo])
          // CB-250 (L6 da revisão): a senha certa não entra num login que já foi apagado por um pedido sem resposta.
          return (await loginApagado()) ? await terminar() : falhou(SENHA_INCORRETA, true)
        }
        conferidaEm.current = agora()
      }

      // L6 da revisão: se a resposta se perder e a sessão cair, quem a vê cair apaga a cópia de trabalho (usarConta.ts).
      anotarExclusaoPedida(sessao.id)
      const { dados, falha } = await chamar<{ readonly excluida?: unknown }>('excluir-conta', { acao: 'excluir' })
      // Uma resposta, sim ou não, diz se a conta existe: a anotação sai. Sem resposta, fica.
      if (falha?.status !== null) esquecerExclusaoPedida()
      if (falha) {
        if (falha.status === 401 && falha.codigo === 'login-antigo') {
          conferidaEm.current = null
          return falhou(CONFIRME_A_SENHA, true)
        }
        // CA-801, CA-810 e CB-253: administrador, pedidos demais e pagamento em andamento, a frase do servidor. 401: a sessão acabou.
        if (falha.status === 403 || falha.status === 409 || falha.status === 429) return falhou(falha.erro ?? EXCLUSAO_NAO_TERMINOU)
        if (falha.status === 401) return falhou(falha.erro ?? SESSAO_TERMINOU)
        if (falha.codigo === 'assinatura-cancelada') {
          aoCancelarAssinatura?.()
          return falhou(falha.erro ?? EXCLUSAO_NAO_TERMINOU)
        }
        return falhou(EXCLUSAO_NAO_TERMINOU)
      }
      if (dados?.excluida !== true) return falhou(EXCLUSAO_NAO_TERMINOU)
      return await terminar()
    } finally {
      ocupado.current = false
      setExcluindo(false)
    }
  }

  return { excluindo, excluir }
}
