import { act, render, screen } from '@testing-library/react'
import { anuncioDaEspera } from '@/domain/iaGaveta.ts'
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

  it('CA-2409: a região viva não tem o relógio, nasce vazia, diz a frase uma vez e só muda a cada 30 s', () => {
    vi.useFakeTimers()
    render(<EsperaDaIa inicio={Date.now()} modo="gerar" />)
    const viva = screen.getByRole('status')
    expect(viva).toHaveTextContent(/^$/)
    const lidos: string[] = []
    for (let s = 1; s <= 95; s++) {
      act(() => vi.advanceTimersByTime(1000))
      const texto = viva.textContent ?? ''
      expect(texto).not.toMatch(/\d:\d\d/)
      if (lidos.at(-1) !== texto) lidos.push(texto)
    }
    expect(lidos).toEqual([
      'Gerando a sugestão. Leva de 1 a 2 minutos.',
      'Ainda gerando: 30 segundos.',
      'Ainda gerando: 1 minuto.',
      'Ainda gerando: 1 minuto e 30 segundos.',
    ])
    // O relógio continua à vista, fora da região viva.
    expect(screen.getByRole('timer')).toHaveTextContent('1:35')
    expect(viva.contains(screen.getByRole('timer'))).toBe(false)
  })

  it('CA-2409: os avisos de cada 30 s, por extenso', () => {
    expect([0, 1, 29, 30, 59, 60, 90, 120, 150].map(anuncioDaEspera)).toEqual([
      '',
      'Gerando a sugestão. Leva de 1 a 2 minutos.',
      'Gerando a sugestão. Leva de 1 a 2 minutos.',
      'Ainda gerando: 30 segundos.',
      'Ainda gerando: 30 segundos.',
      'Ainda gerando: 1 minuto.',
      'Ainda gerando: 1 minuto e 30 segundos.',
      'Ainda gerando: 2 minutos.',
      'Ainda gerando: 2 minutos e 30 segundos.',
    ])
  })
})
