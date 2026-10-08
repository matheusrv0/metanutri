import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { COPIA_GRANDE_DEMAIS } from '../estado/mensagemDoBanco.ts'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import { PortaoDaNuvem } from './PortaoDaNuvem.tsx'

const SEM_INTERNET = 'Sem internet. Suas últimas mudanças ainda não foram salvas na nuvem. Conecte-se para continuar.'
const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }

function montar(estado: Partial<EstadoDaNuvem>, areaDoNutricionista = true) {
  const nuvem: ValorNuvem = { estado: { ...PRONTA, ...estado }, salvarAgora: vi.fn(async () => false), reduzir: vi.fn(), parar: vi.fn() }
  const conta = { sair: vi.fn(async () => undefined) }
  const aoSaiu = vi.fn()
  render(
    <ContextoNuvem.Provider value={nuvem}>
      <PortaoDaNuvem areaDoNutricionista={areaDoNutricionista} conta={conta} aoSaiu={aoSaiu}>
        <button type="button">Novo plano</button>
      </PortaoDaNuvem>
    </ContextoNuvem.Provider>,
  )
  return { nuvem, conta, aoSaiu, usuario: userEvent.setup() }
}

describe('trava da nuvem (spec dados-na-nuvem)', () => {
  it('CA-477: sem internet, a área de trabalho fica coberta pela frase do D-130 e não deixa editar', async () => {
    const { usuario } = montar({ trava: 'sem-internet', pendente: true })
    const trava = screen.getByRole('dialog')
    expect(trava).toHaveTextContent(SEM_INTERNET)
    expect(trava).toHaveAttribute('aria-modal', 'true')
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
    // A área de trás sai da árvore acessível e não recebe o foco.
    expect(screen.queryByRole('button', { name: 'Novo plano' })).not.toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toHaveTextContent(SEM_INTERNET)
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveFocus()
  })

  it('CB-123: a cópia grande demais cobre a área com a frase do CA-445; "Reduzir os dados" tira a capa', async () => {
    const { usuario, nuvem } = montar({ trava: 'grande-demais', pendente: true })
    expect(screen.getByRole('dialog')).toHaveTextContent(COPIA_GRANDE_DEMAIS)
    await usuario.click(screen.getByRole('button', { name: 'Reduzir os dados' }))
    expect(nuvem.reduzir).toHaveBeenCalledOnce()
  })

  it('CB-123: reduzindo, a capa sai e a área volta a aceitar mudança', () => {
    montar({ trava: 'grande-demais', reduzindo: true, pendente: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo plano' })).toBeInTheDocument()
  })

  it('CA-479: pela trava, "Sair" com mudança que não foi para a nuvem pergunta antes; "Ficar" fica', async () => {
    const { usuario, conta } = montar({ trava: 'sem-internet', pendente: true })
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByText('Se sair agora, elas se perdem.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ficar' })).toHaveFocus()
    await usuario.click(screen.getByRole('button', { name: 'Ficar' }))
    await waitFor(() => expect(screen.queryByText('Se sair agora, elas se perdem.')).not.toBeInTheDocument())
    expect(conta.sair).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveTextContent(SEM_INTERNET)
  })

  it('CA-479: pela trava, "Sair mesmo assim" sai', async () => {
    const { usuario, conta, aoSaiu, nuvem } = montar({ trava: 'sem-internet', pendente: true })
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    await usuario.click(await screen.findByRole('button', { name: 'Sair mesmo assim' }))
    await waitFor(() => expect(aoSaiu).toHaveBeenCalledOnce())
    expect(nuvem.parar).toHaveBeenCalledOnce()
    expect(conta.sair).toHaveBeenCalledOnce()
  })

  it('CB-126: o link do paciente não fica coberto', () => {
    montar({ trava: 'sem-internet', pendente: true }, false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo plano' })).toBeInTheDocument()
  })

  it('CB-127: enquanto confere a nuvem ao voltar, a área fica coberta por "Atualizando…" e não deixa editar', () => {
    montar({ conferindo: true })
    expect(screen.getByRole('dialog', { name: 'Atualizando…' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo plano' })).not.toBeInTheDocument()
  })
})
