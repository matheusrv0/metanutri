import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { chaveDoEvento } from '@/domain/armazenamentoDaConta.ts'
import { criarRepositorio, type CasoSalvo, type RepositorioCasos } from '@/domain/persistencia.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { ContextoCasos, type ValorCasos } from './contextoCasos.ts'

const ehChaveDeCaso = (chave: string) => chave === 'metanutri:casos' || chave.startsWith('metanutri:caso:')

/** Compartilha o repositório de casos entre a tela Casos e o Planejador. */
export function ProvedorCasos({ children, repositorio }: { readonly children: ReactNode; readonly repositorio?: RepositorioCasos }) {
  // Os planos da conta que entrou (spec dados-por-conta, D-120); a árvore remonta quando ela muda.
  const armazenamento = useArmazenamento()
  const [repo] = useState<RepositorioCasos>(() => repositorio ?? criarRepositorio(armazenamento))
  const [versaoLista, setVersaoLista] = useState(0)
  const [mudouEmOutraAba, setMudouEmOutraAba] = useState(false)

  const atualizar = useCallback(() => setVersaoLista((v) => v + 1), [])
  const dispensarAvisoOutraAba = useCallback(() => setMudouEmOutraAba(false), [])

  // CB-08: o navegador avisa as outras abas quando uma delas grava; a lista se refaz sozinha.
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => {
      // Chave nula: a outra aba limpou tudo. As das outras contas não mudam nada aqui.
      if (e.key !== null) {
        const chave = chaveDoEvento(armazenamento, e.key)
        if (chave === null || !ehChaveDeCaso(chave)) return
      }
      setMudouEmOutraAba(true)
      atualizar()
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [atualizar, armazenamento])

  const salvar = useCallback(
    (registro: Pick<CasoSalvo, 'caso' | 'plano'>) => {
      const salvo = repo.salvar(registro)
      atualizar()
      return salvo
    },
    [repo, atualizar],
  )

  const valor = useMemo<ValorCasos>(
    () => ({
      repositorio: repo,
      casos: repo.listar(),
      avisoArmazenamento: repo.aviso,
      mudouEmOutraAba,
      dispensarAvisoOutraAba,
      atualizar,
      salvar,
    }),
    // versaoLista força recalcular a lista depois de cada mudança
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repo, atualizar, salvar, versaoLista, mudouEmOutraAba, dispensarAvisoOutraAba],
  )

  return <ContextoCasos.Provider value={valor}>{children}</ContextoCasos.Provider>
}
