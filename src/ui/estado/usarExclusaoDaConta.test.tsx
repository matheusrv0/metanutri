import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ErroConta } from '@/domain/conta.ts'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { contaFoiExcluida } from '../contaExcluida.ts'
import { ContextoNuvem, type ValorNuvem } from './contextoNuvem.ts'
import { CONFIRME_A_SENHA, EXCLUSAO_NAO_TERMINOU, SENHA_CONFERIDA_VALE_MS, SENHA_INCORRETA, useExclusaoDaConta } from './usarExclusaoDaConta.ts'

const { cliente } = vi.hoisted(() => {
  const cliente = { invocar: vi.fn(), functions: { invoke: (...args: unknown[]) => cliente.invocar(...args) } }
  return { cliente }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente }))

const SESSAO = { id: 'u1', email: 'ana@exemplo.com', nome: 'Ana' }
const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }

/** Erro de função com corpo, como o supabase-js entrega (a resposta fica em `context`). */
const respondeu = (status: number, corpo: unknown) => ({ data: null, error: { context: { status, json: async () => corpo } } })
const EXCLUIDA = { data: { excluida: true }, error: null }

function montar({ entrar = { ok: true, erro: null as ErroConta | null }, comNuvem = true } = {}) {
  const ordem: string[] = []
  let relogio = 1_000_000
  const conta = {
    sessao: SESSAO,
    entrar: vi.fn(async () => {
      ordem.push('entrar')
      return entrar
    }),
    sair: vi.fn(async () => {
      ordem.push('sair')
    }),
  }
  const nuvem: ValorNuvem = {
    estado: PRONTA,
    salvarAgora: vi.fn(async () => true),
    reduzir: vi.fn(),
    parar: vi.fn(() => {
      ordem.push('parar')
    }),
  }
  const aoExcluida = vi.fn(() => {
    ordem.push('excluida')
  })
  cliente.invocar.mockImplementation(async (...args: unknown[]) => {
    ordem.push(`invocar ${String(args[0])}`)
    return EXCLUIDA
  })
  const envolver = ({ children }: { children: ReactNode }) => <ContextoNuvem.Provider value={comNuvem ? nuvem : null}>{children}</ContextoNuvem.Provider>
  const hook = renderHook(() => useExclusaoDaConta(conta, aoExcluida, () => relogio), { wrapper: envolver })
  return {
    hook,
    conta,
    nuvem,
    aoExcluida,
    ordem,
    andar: (ms: number) => {
      relogio += ms
    },
  }
}

describe('useExclusaoDaConta (spec exclusao-de-conta)', () => {
  beforeEach(() => {
    cliente.invocar.mockReset()
    sessionStorage.clear()
  })

  it('CA-807 e CA-808: confere a senha, pede a exclusão e termina como "Sair": para a nuvem, apaga a cópia, marca o aviso e sai', async () => {
    const { hook, conta, ordem, aoExcluida } = montar()
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('minha-senha', [])
    })
    expect(resultado).toEqual({ ok: true })
    expect(conta.entrar).toHaveBeenCalledWith('ana@exemplo.com', 'minha-senha')
    expect(cliente.invocar).toHaveBeenCalledWith('excluir-conta', { body: { acao: 'excluir' } })
    expect(ordem).toEqual(['entrar', 'invocar excluir-conta', 'parar', 'sair', 'excluida'])
    expect(aoExcluida).toHaveBeenCalledOnce()
    // O aviso é da página que abre depois da recarga.
    expect(contaFoiExcluida(undefined, Number.POSITIVE_INFINITY)).toBe(true)
  })

  it('CA-811: a verificação contra robôs vai junto com a senha', async () => {
    const { hook, conta } = montar()
    await act(() => hook.result.current.excluir('minha-senha', ['tok-excluir']))
    expect(conta.entrar).toHaveBeenCalledWith('ana@exemplo.com', 'minha-senha', 'tok-excluir')
  })

  it('CA-806: senha errada: "Senha incorreta.", e nada é pedido ao servidor', async () => {
    const { hook } = montar({ entrar: { ok: false, erro: 'credencial-invalida' } })
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('errada', [])
    })
    expect(resultado).toEqual({ ok: false, erro: SENHA_INCORRETA, naSenha: true })
    expect(SENHA_INCORRETA).toBe('Senha incorreta.')
    expect(cliente.invocar).not.toHaveBeenCalled()
    expect(contaFoiExcluida(undefined, Number.POSITIVE_INFINITY)).toBe(false)
  })

  it.each<[ErroConta, string]>([
    ['verificacao-pendente', 'Espere a verificação de segurança terminar.'],
    ['verificacao-recusada', 'Não deu para confirmar que é você. Tente de novo.'],
    ['muitas-tentativas', 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
    ['falha-rede', 'Não deu para falar com o servidor. Confira a internet e tente de novo.'],
  ])('CA-811 e CB-257: a conferência da senha falha com %s: a frase de Entrar, e nada é pedido ao servidor', async (erro, frase) => {
    const { hook } = montar({ entrar: { ok: false, erro } })
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('minha-senha', [])
    })
    expect(resultado).toEqual({ ok: false, erro: frase, naSenha: false })
    expect(cliente.invocar).not.toHaveBeenCalled()
  })

  it('CA-809: o servidor não termina: a frase do CA-809, e o navegador não sai', async () => {
    const { hook, conta, nuvem } = montar()
    cliente.invocar.mockResolvedValue(respondeu(502, { erro: 'qualquer coisa' }))
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('minha-senha', [])
    })
    expect(resultado).toEqual({ ok: false, erro: EXCLUSAO_NAO_TERMINOU, naSenha: false })
    expect(EXCLUSAO_NAO_TERMINOU).toBe('Não deu para terminar a exclusão. Sua conta continua ativa. Tente de novo em alguns minutos.')
    expect(conta.sair).not.toHaveBeenCalled()
    expect(nuvem.parar).not.toHaveBeenCalled()
  })

  it('CA-809: sem resposta (a rede caiu): a mesma frase', async () => {
    const { hook } = montar()
    cliente.invocar.mockRejectedValue(new Error('rede caiu'))
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('minha-senha', [])
    })
    expect(resultado).toEqual({ ok: false, erro: EXCLUSAO_NAO_TERMINOU, naSenha: false })
  })

  it.each([
    ['CA-801: administrador (403)', 403, { erro: 'Conta de administrador não é excluída pelo site.', codigo: 'administrador' }],
    ['CA-810: pedidos demais (429)', 429, { erro: 'Muitas tentativas seguidas. Espere uma hora e tente de novo.', codigo: 'muitas-chamadas' }],
    ['CB-253: pagamento em andamento (409)', 409, { erro: 'Já estamos confirmando uma assinatura desta conta. Confira em Conta e plano em um minuto.', codigo: 'em-andamento' }],
  ])('%s: a frase do servidor', async (_caso, status, corpo) => {
    const { hook } = montar()
    cliente.invocar.mockResolvedValue(respondeu(status, corpo))
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('minha-senha', [])
    })
    expect(resultado).toEqual({ ok: false, erro: corpo.erro, naSenha: false })
  })

  it('CB-250: a resposta se perdeu; o clique seguinte não confere a senha de novo, e "já excluída" termina', async () => {
    const { hook, conta, aoExcluida } = montar()
    cliente.invocar.mockRejectedValueOnce(new Error('rede caiu'))
    await act(() => hook.result.current.excluir('minha-senha', []))
    expect(conta.entrar).toHaveBeenCalledOnce()
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('', [])
    })
    expect(resultado).toEqual({ ok: true })
    expect(conta.entrar).toHaveBeenCalledOnce()
    expect(aoExcluida).toHaveBeenCalledOnce()
  })

  it('CB-250: passados 9 minutos da conferência, a senha é conferida de novo', async () => {
    const { hook, conta, andar } = montar()
    cliente.invocar.mockResolvedValueOnce(respondeu(502, { erro: 'x' }))
    await act(() => hook.result.current.excluir('minha-senha', []))
    andar(SENHA_CONFERIDA_VALE_MS + 1)
    await act(() => hook.result.current.excluir('minha-senha', []))
    expect(conta.entrar).toHaveBeenCalledTimes(2)
    expect(SENHA_CONFERIDA_VALE_MS).toBe(9 * 60_000)
  })

  it('CA-816: o servidor diz que a senha é antiga: pede a senha de novo e, no clique seguinte, confere', async () => {
    const { hook, conta } = montar()
    cliente.invocar.mockResolvedValueOnce(respondeu(401, { erro: CONFIRME_A_SENHA, codigo: 'login-antigo' }))
    let resultado
    await act(async () => {
      resultado = await hook.result.current.excluir('minha-senha', [])
    })
    expect(resultado).toEqual({ ok: false, erro: CONFIRME_A_SENHA, naSenha: true })
    await act(() => hook.result.current.excluir('minha-senha', []))
    expect(conta.entrar).toHaveBeenCalledTimes(2)
  })

  it('CA-807: um pedido por vez: o segundo, com o primeiro correndo, nem sai', async () => {
    const { hook, conta } = montar()
    let soltar: (valor: unknown) => void = () => undefined
    cliente.invocar.mockImplementation(() => new Promise((resolver) => (soltar = resolver)))
    let primeiro: Promise<unknown> = Promise.resolve()
    act(() => {
      primeiro = hook.result.current.excluir('minha-senha', [])
    })
    await vi.waitFor(() => expect(hook.result.current.excluindo).toBe(true))
    let segundo
    await act(async () => {
      segundo = await hook.result.current.excluir('minha-senha', [])
    })
    expect(segundo).toMatchObject({ ok: false })
    expect(conta.entrar).toHaveBeenCalledOnce()
    await act(async () => {
      soltar(EXCLUIDA)
      await primeiro
    })
    expect(hook.result.current.excluindo).toBe(false)
    expect(cliente.invocar).toHaveBeenCalledOnce()
  })

  it('sem nuvem (o cliente da nuvem não abriu), termina do mesmo jeito', async () => {
    const { hook, conta } = montar({ comNuvem: false })
    await act(() => hook.result.current.excluir('minha-senha', []))
    expect(conta.sair).toHaveBeenCalledOnce()
  })
})
