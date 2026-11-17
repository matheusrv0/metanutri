import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import type { Plano } from '@/domain/tipos.ts'
import { ProvedorCasos } from './ProvedorCasos.tsx'
import { useCasoAberto } from './usarCasoAberto.ts'

class Memoria implements Armazenamento {
  private readonly dados = new Map<string, string>()
  getItem(chave: string) {
    return this.dados.get(chave) ?? null
  }
  setItem(chave: string, valor: string) {
    this.dados.set(chave, valor)
  }
  removeItem(chave: string) {
    this.dados.delete(chave)
  }
}

describe('useCasoAberto', () => {
  it('CA-2368 e CA-2402: o plano e o caso mudados no mesmo evento ficam os dois (o "Usar como rascunho" da IA)', () => {
    const repositorio = criarRepositorio(new Memoria())
    const criado = repositorio.criar('Caso de teste')
    const envolver = ({ children }: { readonly children: ReactNode }) => <ProvedorCasos repositorio={repositorio}>{children}</ProvedorCasos>
    const { result } = renderHook(() => useCasoAberto(criado.caso.id), { wrapper: envolver })
    const novo: Plano = { refeicoes: [{ id: 'r1', nome: 'Almoço', horario: '12:00', opcoes: { principal: [{ id: 'i1', alimentoId: 3, gramas: 150 }], substituto1: [], substituto2: [] } }] }
    act(() => {
      result.current.alterarPlano(novo)
      result.current.alterarCaso({ origemIa: { em: '2026-11-17', modelo: 'claude-opus-5-5' } })
    })
    expect(result.current.registro?.plano).toEqual(novo)
    expect(result.current.registro?.caso.origemIa).toEqual({ em: '2026-11-17', modelo: 'claude-opus-5-5' })
    expect(repositorio.obter(criado.caso.id)?.plano).toEqual(novo)
  })
})
