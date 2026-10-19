import { act, render } from '@testing-library/react'
import { CHAVE_TEMA } from './contextoTema.ts'
import { ProvedorTema } from './ProvedorTema.tsx'

const escuro = () => document.documentElement.classList.contains('dark')

describe('Imprimir no tema escuro (spec revisao-geral-trabalho, D-240)', () => {
  beforeEach(() => {
    localStorage.setItem(CHAVE_TEMA, 'escuro')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('CA-772: a impressão sai no tema claro, e o escuro volta quando ela termina', () => {
    render(<ProvedorTema>conteúdo</ProvedorTema>)
    expect(escuro()).toBe(true)

    act(() => {
      globalThis.dispatchEvent(new Event('beforeprint'))
    })
    expect(escuro()).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')

    act(() => {
      globalThis.dispatchEvent(new Event('afterprint'))
    })
    expect(escuro()).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('CB-246: cancelar a caixa de impressão devolve o tema escuro igual, e o tema claro fica claro', () => {
    const { unmount } = render(<ProvedorTema>conteúdo</ProvedorTema>)
    act(() => {
      globalThis.dispatchEvent(new Event('beforeprint'))
      globalThis.dispatchEvent(new Event('afterprint'))
    })
    expect(escuro()).toBe(true)
    unmount()

    localStorage.setItem(CHAVE_TEMA, 'claro')
    render(<ProvedorTema>conteúdo</ProvedorTema>)
    act(() => {
      globalThis.dispatchEvent(new Event('beforeprint'))
    })
    expect(escuro()).toBe(false)
    act(() => {
      globalThis.dispatchEvent(new Event('afterprint'))
    })
    expect(escuro()).toBe(false)
  })
})
