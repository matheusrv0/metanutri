// Excluir a conta pelo site (spec exclusao-de-conta, D-251 e D-255). Confere a senha com a mesma entrada de Entrar
// (que renova a sessão e põe a hora da entrada no token), pede a exclusão à função excluir-conta e, dando certo,
// termina como "Sair": a nuvem para, a cópia de trabalho deste navegador é apagada e a sessão sai.
import { useRef, useState } from 'react'
import { MENSAGEM_ERRO } from '@/domain/conta.ts'
import { marcarContaExcluida } from '../contaExcluida.ts'
import type { ExtraDoPedido } from '../publico/conta/usarVerificacao.ts'
import { useNuvem } from './contextoNuvem.ts'
import { chamar, PEDIDO_EM_ANDAMENTO, SESSAO_TERMINOU } from './usarAssinatura.ts'
import type { ValorConta } from './usarConta.ts'

/** CA-806. */
export const SENHA_INCORRETA = 'Senha incorreta.'
/** CA-809: a mesma frase da função. */
export const EXCLUSAO_NAO_TERMINOU = 'Não deu para terminar a exclusão. Sua conta continua ativa. Tente de novo em alguns minutos.'
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

/**
 * `aoExcluida` é o mesmo de depois de "Sair": vai para a página inicial e recarrega. `agora` só muda nos testes.
 */
export function useExclusaoDaConta(conta: Pick<ValorConta, 'sessao' | 'entrar' | 'sair'>, aoExcluida: () => void, agora: () => number = Date.now): ValorExclusao {
  const nuvem = useNuvem()
  const [excluindo, setExcluindo] = useState(false)
  // CA-807: um pedido por vez; o segundo clique não sai.
  const ocupado = useRef(false)
  // CB-250: quando a senha foi conferida por último neste navegador; lido só nos manipuladores.
  const conferidaEm = useRef<number | null>(null)

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
          return motivo === 'credencial-invalida' ? falhou(SENHA_INCORRETA, true) : falhou(MENSAGEM_ERRO[motivo])
        }
        conferidaEm.current = agora()
      }

      const { dados, falha } = await chamar<{ readonly excluida?: unknown }>('excluir-conta', { acao: 'excluir' })
      if (falha) {
        if (falha.status === 401 && falha.codigo === 'login-antigo') {
          conferidaEm.current = null
          return falhou(CONFIRME_A_SENHA, true)
        }
        // CA-801, CA-810 e CB-253: administrador, pedidos demais e pagamento em andamento, a frase do servidor. 401: a sessão acabou.
        if (falha.status === 403 || falha.status === 409 || falha.status === 429) return falhou(falha.erro ?? EXCLUSAO_NAO_TERMINOU)
        if (falha.status === 401) return falhou(falha.erro ?? SESSAO_TERMINOU)
        return falhou(EXCLUSAO_NAO_TERMINOU)
      }
      if (dados?.excluida !== true) return falhou(EXCLUSAO_NAO_TERMINOU)

      // D-255 (CA-808): como "Sair": a nuvem para antes de a cópia de trabalho ser apagada.
      nuvem?.parar()
      await conta.sair()
      marcarContaExcluida()
      aoExcluida()
      return { ok: true }
    } finally {
      ocupado.current = false
      setExcluindo(false)
    }
  }

  return { excluindo, excluir }
}
