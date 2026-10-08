import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { AvisoPrimeiroAcesso, CHAVE_AVISO_VISTO } from '../casos/AvisoPrimeiroAcesso.tsx'
import { DialogoExcluir } from '../casos/DialogoExcluir.tsx'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import { AvisoNuvem } from './AvisoNuvem.tsx'
import { CHAVE_AVISO_NUVEM } from './chavesDosAvisos.ts'

const NUVEM: ValorNuvem = {
  estado: { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false },
  salvarAgora: async () => true,
  reduzir: () => undefined,
  parar: () => undefined,
}

const TITULO = 'Seus planos e pacientes agora ficam salvos na nuvem, presos à sua conta.'
const conta = () => armazenamentoDaConta(localStorage, 'conta-a')

function comNuvem(filho: ReactNode, nuvem: ValorNuvem | null = NUVEM) {
  return (
    <ContextoArmazenamento.Provider value={conta()}>
      <ContextoNuvem.Provider value={nuvem}>{filho}</ContextoNuvem.Provider>
    </ContextoArmazenamento.Provider>
  )
}

describe('aviso único da nuvem (spec dados-na-nuvem, DP-26)', () => {
  beforeEach(() => localStorage.clear())

  it('quem já usava vê uma vez que os dados agora ficam na nuvem; "Entendi" guarda na conta', async () => {
    conta().setItem(CHAVE_AVISO_VISTO, '1')
    const { unmount } = render(comNuvem(<AvisoNuvem />))
    const aviso = screen.getByRole('dialog')
    expect(aviso).toHaveTextContent(`${TITULO} Assim você abre tudo em qualquer aparelho.`)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(conta().getItem(CHAVE_AVISO_NUVEM)).toBe('1')
    unmount()
    render(comNuvem(<AvisoNuvem />))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('quem é novo não vê este aviso: o de primeiro acesso já diz, e confirmar marca os dois', async () => {
    const { unmount } = render(comNuvem(<AvisoNuvem />))
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument()
    unmount()
    render(comNuvem(<AvisoPrimeiroAcesso />))
    expect(screen.getByText('Os casos ficam salvos na nuvem, presos à sua conta.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Entendi' }))
    expect(conta().getItem(CHAVE_AVISO_NUVEM)).toBe('1')
  })

  it('sem nuvem (modo local), o aviso não aparece', () => {
    conta().setItem(CHAVE_AVISO_VISTO, '1')
    render(comNuvem(<AvisoNuvem />, null))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('excluir um plano (DP-26)', () => {
  it('com a conta na nuvem, diz que some de todos os aparelhos; sem nuvem, do aparelho', () => {
    const { unmount } = render(comNuvem(<DialogoExcluir nome="Plano da Ana" aoConfirmar={vi.fn()} aoFechar={vi.fn()} />))
    expect(screen.getByText('O plano alimentar será apagado da sua conta, em todos os aparelhos. Não dá para desfazer.')).toBeInTheDocument()
    unmount()
    render(<DialogoExcluir nome="Plano da Ana" aoConfirmar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('O plano alimentar será apagado deste aparelho. Não dá para desfazer.')).toBeInTheDocument()
  })
})
