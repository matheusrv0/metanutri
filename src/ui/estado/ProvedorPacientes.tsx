import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { criarRepositorioPacientes, type RepositorioPacientes } from '@/domain/pacientes.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { ContextoPacientes, type ValorPacientes } from './contextoPacientes.ts'

export function ProvedorPacientes({ children, repositorio }: { readonly children: ReactNode; readonly repositorio?: RepositorioPacientes }) {
  // Os pacientes da conta que entrou (spec dados-por-conta, D-120).
  const armazenamento = useArmazenamento()
  const [repo] = useState<RepositorioPacientes>(() => repositorio ?? criarRepositorioPacientes(armazenamento))
  const [versao, setVersao] = useState(0)
  const atualizar = useCallback(() => setVersao((v) => v + 1), [])

  const valor = useMemo<ValorPacientes>(
    () => ({ repositorio: repo, pacientes: repo.listar(), atualizar }),
    // versao força recalcular a lista depois de cada mudança
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repo, atualizar, versao],
  )

  return <ContextoPacientes.Provider value={valor}>{children}</ContextoPacientes.Provider>
}
