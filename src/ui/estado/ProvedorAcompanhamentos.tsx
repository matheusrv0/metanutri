import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Acompanhamento } from '@/domain/acompanhamento.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos, fonteLocal, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ContextoAcompanhamentos, type ValorAcompanhamentos } from './contextoAcompanhamentos.ts'

function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/**
 * Compartilha os acompanhamentos entre a tela do nutricionista e o link do paciente.
 * Quando o Supabase entrar, é aqui que `fonte` troca de implementação — e só aqui.
 */
export function ProvedorAcompanhamentos({ children, repositorio }: { readonly children: ReactNode; readonly repositorio?: RepositorioAcompanhamentos }) {
  const [repo] = useState<RepositorioAcompanhamentos>(() => repositorio ?? criarRepositorioAcompanhamentos(armazenamentoDoNavegador()))
  const [versao, setVersao] = useState(0)

  const atualizar = useCallback(() => setVersao((v) => v + 1), [])

  // Se o paciente marcar numa aba e o nutricionista estiver com outra aberta, a lista se refaz.
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => {
      if (e.key !== null && e.key !== 'metanutri:acompanhamentos') return
      atualizar()
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [atualizar])

  const salvar = useCallback(
    (acompanhamento: Acompanhamento) => {
      const salvo = repo.salvar(acompanhamento)
      atualizar()
      return salvo
    },
    [repo, atualizar],
  )

  const remover = useCallback(
    (id: string) => {
      repo.remover(id)
      atualizar()
    },
    [repo, atualizar],
  )

  // A tela do paciente grava sem passar pelo contexto; o `atualizar` mantém a lista do nutri em dia.
  const fonte = useMemo(() => {
    const local = fonteLocal(repo)
    return {
      ...local,
      salvar: async (acompanhamento: Acompanhamento) => {
        const salvo = await local.salvar(acompanhamento)
        atualizar()
        return salvo
      },
    }
  }, [repo, atualizar])

  const valor = useMemo<ValorAcompanhamentos>(
    () => ({
      repositorio: repo,
      fonte,
      acompanhamentos: repo.listar(),
      avisoArmazenamento: repo.aviso,
      salvar,
      remover,
    }),
    // versao força recalcular a lista depois de cada mudança
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repo, fonte, salvar, remover, versao],
  )

  return <ContextoAcompanhamentos.Provider value={valor}>{children}</ContextoAcompanhamentos.Provider>
}
