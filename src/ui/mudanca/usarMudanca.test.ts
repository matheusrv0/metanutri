import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import type { Rota } from '../navegacao.ts'
import { ESPERA_DA_MUDANCA_MS, useConfirmarMudanca, useMudanca, type ConfirmacaoDaMudanca, type JanelaDoApp } from './usarMudanca.ts'

const SITE = 'https://metanutri.com.br'
const CODIGO = '0123456789abcdef0123456789abcdef'
const ROTA: Rota = { tela: 'mudanca', codigo: CODIGO }
const PENDENTE = JSON.stringify({ versao: 'v1', mudancas: 5, salvas: 3, itens: 1, motor: 2 })
const EM_DIA = JSON.stringify({ versao: 'v2', mudancas: 3, salvas: 3, itens: 1, motor: 2 })

/** A aba do app: o `window.opener` (a aba do site, falsa) e as mensagens que o teste manda. */
function janelaDoApp(comAbaDoSite = true) {
  const site = { postMessage: vi.fn(), closed: false }
  let ouvinte: ((evento: MessageEvent) => void) | null = null
  const janela: JanelaDoApp = {
    opener: comAbaDoSite ? site : null,
    addEventListener: (_tipo: 'message', fazer: (evento: MessageEvent) => void) => {
      ouvinte = fazer
    },
    removeEventListener: () => {
      ouvinte = null
    },
  }
  const receber = (dados: unknown, { origem = SITE, de = site as unknown }: { readonly origem?: string; readonly de?: unknown } = {}) =>
    act(() => ouvinte?.({ origin: origem, source: de, data: dados } as MessageEvent))
  return { janela, site, receber, escutando: () => ouvinte !== null }
}

const montar = (janela: JanelaDoApp, usuarioId: string | null = 'u1', rota: Rota = ROTA) =>
  renderHook((props: { usuarioId: string | null; rota: Rota }) => useMudanca({ ...props, janela }), { initialProps: { usuarioId, rota } })

const dados = (chaves: Record<string, string>, usuarioId = 'u1', codigo = CODIGO) => ({ tipo: 'dados', codigo, usuarioId, chaves })

describe('a mudança no app (spec separacao-site-app, D-512, D-513 e DP-SA-11)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    window.location.hash = `#/mudanca/${CODIGO}`
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('CA-1431: sem sessão, espera a entrada; os dados da conta ficam parados enquanto a rota é a da mudança', () => {
    const { janela, site } = janelaDoApp()
    const { result } = montar(janela, null)
    expect(result.current.segurar).toBe(true)
    expect(result.current.tela).toBeNull()
    expect(site.postMessage).not.toHaveBeenCalled()
  })

  it('CA-1431: depois da entrada, pede os dados à aba do site, só para o endereço do site, e mostra "Trazendo seus dados…"', () => {
    const { janela, site } = janelaDoApp()
    const { result } = montar(janela)
    expect(site.postMessage).toHaveBeenCalledWith({ tipo: 'pedir', codigo: CODIGO, usuarioId: 'u1' }, SITE)
    expect(result.current.tela).toBe('trazendo')
    expect(result.current.segurar).toBe(true)
  })

  it('CA-1433: espaço vazio no app: grava como veio, abre a conta no Painel e espera a nuvem para confirmar', () => {
    const { janela, site, receber } = janelaDoApp()
    const { result } = montar(janela)
    receber(dados({ 'metanutri:conta:u1:nuvem': PENDENTE, 'metanutri:conta:u1:pacientes': '[{"id":"p1"}]', 'metanutri:casos': '["c1"]' }))
    expect(localStorage.getItem('metanutri:conta:u1:pacientes')).toBe('[{"id":"p1"}]')
    expect(localStorage.getItem('metanutri:casos')).toBe('["c1"]')
    expect(localStorage.getItem('metanutri:dono')).toBe('u1')
    expect(result.current.tela).toBeNull()
    expect(result.current.segurar).toBe(false)
    expect(window.location.hash).toBe('#/painel')
    expect(result.current.confirmacao).toEqual({ codigo: CODIGO, usuarioId: 'u1', aba: site, origem: SITE })
  })

  it('CA-1434: espaço em dia no app: troca pelo que veio', () => {
    localStorage.setItem('metanutri:conta:u1:nuvem', EM_DIA)
    localStorage.setItem('metanutri:conta:u1:modelos', '[{"id":"m1"}]')
    const { janela, receber } = janelaDoApp()
    const { result } = montar(janela)
    receber(dados({ 'metanutri:conta:u1:nuvem': PENDENTE, 'metanutri:conta:u1:pacientes': '[]' }))
    expect(localStorage.getItem('metanutri:conta:u1:modelos')).toBeNull()
    expect(localStorage.getItem('metanutri:conta:u1:nuvem')).toBe(PENDENTE)
    expect(result.current.confirmacao).not.toBeNull()
  })

  it('CA-1435: espaço com algo que ainda não subiu: não grava, abre a conta e não confirma', () => {
    localStorage.setItem('metanutri:conta:u1:nuvem', PENDENTE)
    localStorage.setItem('metanutri:conta:u1:pacientes', '[{"id":"daqui"}]')
    const { janela, receber } = janelaDoApp()
    const { result } = montar(janela)
    receber(dados({ 'metanutri:conta:u1:nuvem': EM_DIA, 'metanutri:conta:u1:pacientes': '[{"id":"de-la"}]' }))
    expect(localStorage.getItem('metanutri:conta:u1:pacientes')).toBe('[{"id":"daqui"}]')
    expect(result.current.confirmacao).toBeNull()
    expect(result.current.segurar).toBe(false)
    expect(window.location.hash).toBe('#/painel')
  })

  it('CB-504: o site não tem nada da conta: abre a conta, sem confirmar', () => {
    const { janela, receber } = janelaDoApp()
    const { result } = montar(janela)
    receber({ tipo: 'nada', codigo: CODIGO, usuarioId: 'u1' })
    expect(result.current.segurar).toBe(false)
    expect(result.current.confirmacao).toBeNull()
  })

  it('CA-1437: a aba do site não responde: em 10 s, abre a conta com a nuvem e não confirma', async () => {
    const { janela, escutando } = janelaDoApp()
    const { result } = montar(janela)
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_DA_MUDANCA_MS - 1))
    expect(result.current.tela).toBe('trazendo')
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(result.current.tela).toBeNull()
    expect(result.current.segurar).toBe(false)
    expect(result.current.confirmacao).toBeNull()
    expect(escutando()).toBe(false)
    expect(ESPERA_DA_MUDANCA_MS).toBe(10_000)
  })

  it('DP-SA-40: sem a aba do site (aberto sem window.opener), abre a conta na hora', () => {
    const { janela } = janelaDoApp(false)
    const { result } = montar(janela)
    expect(result.current.segurar).toBe(false)
    expect(result.current.tela).toBeNull()
    expect(window.location.hash).toBe('#/painel')
  })

  it('CA-1438: mensagem de outro endereço, de outra janela, com outro código, de outra conta ou de tipo desconhecido: ignorada', () => {
    const { janela, receber } = janelaDoApp()
    const { result } = montar(janela)
    const pacote = { 'metanutri:conta:u1:pacientes': '[{"id":"p1"}]' }
    receber(dados(pacote), { origem: 'https://outro.exemplo' })
    receber(dados(pacote), { de: {} })
    receber(dados(pacote, 'u1', 'f'.repeat(32)))
    receber(dados(pacote, 'u2'))
    receber({ tipo: 'apagar', codigo: CODIGO, usuarioId: 'u1' })
    expect(localStorage.length).toBe(0)
    expect(result.current.tela).toBe('trazendo')
  })

  it('CB-502: dados ilegíveis: não grava nem confirma, e a espera segue até os 10 s', async () => {
    const { janela, receber } = janelaDoApp()
    const { result } = montar(janela)
    receber({ tipo: 'dados', codigo: CODIGO, usuarioId: 'u1', chaves: { 'sb-x-auth-token': '{}' } })
    receber({ tipo: 'dados', codigo: CODIGO, usuarioId: 'u1', chaves: 'quebrado' })
    expect(localStorage.length).toBe(0)
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_DA_MUDANCA_MS))
    expect(result.current.confirmacao).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('CB-501: sem espaço, nada fica gravado, a tela diz "Sem espaço" e "Continuar" abre a conta com a nuvem', () => {
    const { janela, receber } = janelaDoApp()
    const { result } = montar(janela)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, chave: string) {
      if (chave.startsWith('metanutri:conta:u1:pacientes')) throw new DOMException('cheio', 'QuotaExceededError')
    })
    try {
      receber(dados({ 'metanutri:conta:u1:nuvem': PENDENTE, 'metanutri:conta:u1:pacientes': '[]' }))
    } finally {
      setItem.mockRestore()
    }
    expect(localStorage.getItem('metanutri:conta:u1:nuvem')).toBeNull()
    expect(result.current.tela).toBe('sem-espaco')
    expect(result.current.segurar).toBe(true)
    act(() => result.current.continuar())
    expect(result.current.tela).toBeNull()
    expect(result.current.segurar).toBe(false)
    expect(result.current.confirmacao).toBeNull()
    expect(window.location.hash).toBe('#/painel')
  })

  it('fora da rota da mudança, nada acontece', () => {
    window.location.hash = '#/pacientes'
    const { janela, site } = janelaDoApp()
    const { result } = montar(janela, 'u1', { tela: 'pacientes' })
    expect(result.current.segurar).toBe(false)
    expect(site.postMessage).not.toHaveBeenCalled()
  })
})

const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }

describe('a confirmação, quando a nuvem tem tudo (spec separacao-site-app, D-513 e DP-SA-39)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('metanutri:conta:u1:nuvem', EM_DIA)
    localStorage.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1"}]')
  })

  function confirmar(estado: EstadoDaNuvem) {
    const aba = { postMessage: vi.fn() }
    const pendente: ConfirmacaoDaMudanca = { codigo: CODIGO, usuarioId: 'u1', aba: aba as unknown as Window, origem: SITE }
    const aoConfirmada = vi.fn()
    const nuvem = (e: EstadoDaNuvem): ValorNuvem => ({ estado: e, salvarAgora: vi.fn(async () => true), reduzir: vi.fn(), parar: vi.fn() })
    const valor = { atual: nuvem(estado) }
    const envolver = ({ children }: { children: ReactNode }) => createElement(ContextoNuvem.Provider, { value: valor.atual }, children)
    const hook = renderHook(() => useConfirmarMudanca(pendente, aoConfirmada), { wrapper: envolver })
    const mudar = (e: EstadoDaNuvem) => {
      valor.atual = nuvem(e)
      hook.rerender()
    }
    return { aba, aoConfirmada, mudar }
  }

  it('CA-1436: dados abertos, nada pendente nem salvando, sem trava e em dia: confirma ao site, uma vez', () => {
    const { aba, aoConfirmada, mudar } = confirmar(PRONTA)
    expect(aba.postMessage).toHaveBeenCalledWith({ tipo: 'recebido', codigo: CODIGO, usuarioId: 'u1' }, SITE)
    expect(aoConfirmada).toHaveBeenCalledOnce()
    mudar({ ...PRONTA, geracao: 1 })
    expect(aba.postMessage).toHaveBeenCalledOnce()
  })

  it('D-513 e CB-505: abrindo, pendente, salvando ou sem internet, não confirma; confirma quando a nuvem tem tudo', () => {
    const { aba, mudar } = confirmar({ ...PRONTA, fase: 'abrindo' })
    for (const estado of [{ ...PRONTA, pendente: true }, { ...PRONTA, salvando: true }, { ...PRONTA, trava: 'sem-internet' as const }, { ...PRONTA, fase: 'sem-conexao' as const }]) {
      mudar(estado)
      expect(aba.postMessage, JSON.stringify(estado)).not.toHaveBeenCalled()
    }
    mudar(PRONTA)
    expect(aba.postMessage).toHaveBeenCalledOnce()
  })

  it('CA-1439: o link pendente segura a confirmação até subir; o valor retido fica no app e não segura', () => {
    localStorage.setItem('metanutri:conta:u1:retidos', '{"pacientes/p1":"2026-10-27T10:00:00Z"}')
    localStorage.setItem('metanutri:conta:u1:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ id: 'a1' }], naNuvem: [], pendentes: ['a1'] }))
    const { aba, mudar } = confirmar(PRONTA)
    expect(aba.postMessage).not.toHaveBeenCalled()
    // O reenvio de sempre (CB-108) tirou o pendente e a cópia subiu.
    localStorage.setItem('metanutri:conta:u1:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ id: 'a1' }], naNuvem: ['a1'], pendentes: [] }))
    mudar({ ...PRONTA, geracao: 2 })
    expect(aba.postMessage).toHaveBeenCalledOnce()
    expect(localStorage.getItem('metanutri:conta:u1:retidos')).not.toBeNull()
  })

  it('sem mudança a confirmar, nada acontece', () => {
    const aoConfirmada = vi.fn()
    renderHook(() => useConfirmarMudanca(null, aoConfirmada))
    expect(aoConfirmada).not.toHaveBeenCalled()
  })
})
