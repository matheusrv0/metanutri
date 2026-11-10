import { render, screen, waitFor } from '@testing-library/react'
import type { DependenciasDaSugestao } from '../estado/usarSugestaoIa.ts'
import { UsoDaIa } from './UsoDaIa.tsx'

const deps = (resposta: Awaited<ReturnType<DependenciasDaSugestao['chamar']>>): DependenciasDaSugestao => ({
  chamar: vi.fn(async () => resposta),
  salvarAgora: null,
  online: () => true,
})

describe('UsoDaIa em Conta e assinatura (spec assistente-ia, D-1321 e D-1354)', () => {
  it('CA-2375: "Sugestões com IA", "U de L em <mês>", a barra e "Renovam em 1º de <mês seguinte>"', async () => {
    render(<UsoDaIa agora={new Date('2026-11-10T12:00:00Z')} dependencias={deps({ dados: { uso: { usados: 7, limite: 20, renovaEm: '2026-12-01' } }, falha: null })} />)
    expect(await screen.findByText('Sugestões com IA')).toBeInTheDocument()
    expect(screen.getByText('7 de 20 em novembro')).toBeInTheDocument()
    expect(screen.getByText('Renovam em 1º de dezembro')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '7 de 20 sugestões com IA em novembro' })).toBeInTheDocument()
  })

  it('CB-1321: sem resposta (função não publicada, sem rede), a linha não aparece e não há frase de erro', async () => {
    const d = deps({ dados: null, falha: { status: 404, codigo: null, erro: null } })
    const { container } = render(<UsoDaIa agora={new Date('2026-11-10T12:00:00Z')} dependencias={d} />)
    await waitFor(() => expect(d.chamar).toHaveBeenCalledWith('sugerir-plano', { modo: 'uso' }))
    expect(container).toBeEmptyDOMElement()
  })
})
