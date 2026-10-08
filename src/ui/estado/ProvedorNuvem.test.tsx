import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { CHAVE_MUDANCAS } from '@/domain/copiaDaConta.ts'
import { nuvemFalsa, type NuvemFalsa } from '@/domain/nuvemFalsa.test-utils.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { useNuvem } from './contextoNuvem.ts'
import { ProvedorArmazenamento } from './ProvedorArmazenamento.tsx'
import { ProvedorNuvem } from './ProvedorNuvem.tsx'

const estado = vi.hoisted(() => ({ nuvem: null as unknown }))
vi.mock('./supabase.ts', () => ({ obterSupabase: () => (estado.nuvem as NuvemFalsa | null)?.cliente ?? null, supabaseConfigurado: () => true }))

let montagens = 0

/** Conta as montagens, como uma tela de conta, e grava um paciente pelo armazenamento da árvore. */
function Tela() {
  useState(() => {
    montagens += 1
    return null
  })
  const armazenamento = useArmazenamento()
  const nuvem = useNuvem()
  return (
    <div>
      <p>{nuvem ? `nuvem: ${nuvem.estado.fase}` : 'sem nuvem'}</p>
      <button type="button" onClick={() => armazenamento?.setItem('metanutri:pacientes', '[{"id":"ana","nome":"Ana"}]')}>
        gravar
      </button>
    </div>
  )
}

const arvore = (usuarioId: string | null) => (
  <ProvedorArmazenamento usuarioId={usuarioId}>
    <ProvedorNuvem usuarioId={usuarioId}>
      <Tela />
    </ProvedorNuvem>
  </ProvedorArmazenamento>
)

describe('ProvedorNuvem (spec dados-na-nuvem)', () => {
  beforeEach(() => {
    localStorage.clear()
    montagens = 0
    estado.nuvem = nuvemFalsa()
  })

  it('DP-11 (dados-por-conta): a sessão que chega liga a nuvem sem remontar o que está dentro', async () => {
    const { rerender } = render(arvore(null))
    expect(screen.getByText('sem nuvem')).toBeInTheDocument()
    rerender(arvore('conta-a'))
    expect(await screen.findByText('nuvem: pronta')).toBeInTheDocument()
    expect(montagens).toBe(1)
  })

  it('DP-2: a árvore grava pelo espaço observado, que marca a mudança para a nuvem', async () => {
    render(arvore('conta-a'))
    await screen.findByText('nuvem: pronta')
    act(() => screen.getByRole('button', { name: 'gravar' }).click())
    expect(localStorage.getItem('metanutri:conta:conta-a:pacientes')).toBe('[{"id":"ana","nome":"Ana"}]')
    expect(JSON.parse(localStorage.getItem(`metanutri:conta:conta-a:${CHAVE_MUDANCAS.slice('metanutri:'.length)}`) ?? '{}').alterados).toHaveProperty('pacientes/ana')
  })

  it('DP-14: sem o cliente da nuvem, nada muda', () => {
    estado.nuvem = null
    render(arvore('conta-a'))
    expect(screen.getByText('sem nuvem')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'gravar' }).click())
    expect(localStorage.getItem('metanutri:conta:conta-a:mudancas')).toBeNull()
  })
})
