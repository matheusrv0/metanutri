import { act, render, screen } from '@testing-library/react'
import { AVISO_DO_CANCELAR, EsperaDaIa } from './EsperaDaIa.tsx'

describe('EsperaDaIa (spec assistente-ia, D-1306)', () => {
  afterEach(() => vi.useRealTimers())

  it('CA-2366: a frase, o relógio correndo em m:ss e as três etapas', () => {
    vi.useFakeTimers()
    const inicio = Date.now()
    render(<EsperaDaIa inicio={inicio} modo="gerar" />)
    expect(screen.getByText('Montando a sugestão. Leva de 1 a 2 minutos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tempo decorrido 0:00')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(65_000))
    expect(screen.getByLabelText('Tempo decorrido 1:05')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((l) => l.textContent)).toEqual([
      'Pedido enviado, sem nome nem contato (feito)',
      'A IA monta as refeições (agora)',
      'O app confere com a ficha e as regras',
    ])
  })

  it('CA-2401: o aviso do Cancelar é o da spec, e nenhum texto diz que cancelar não conta', () => {
    expect(AVISO_DO_CANCELAR).toBe('Cancelar só fecha a espera; se a IA terminar, conta no limite.')
    render(<EsperaDaIa inicio={Date.now()} modo="ajustar" />)
    expect(document.body.textContent).not.toMatch(/não conta no limite/)
    expect(screen.getByText('A IA monta os ajustes')).toBeInTheDocument()
  })
})
