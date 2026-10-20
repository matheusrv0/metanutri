import { useCallback, useMemo, useState } from 'react'
import { CHAVE_RECEITAS, criarRepositorioReceitas, type Receita, type RepositorioReceitas } from '@/domain/receitas.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { useOutraAbaGravou } from './usarOutraAba.ts'

export interface ValorReceitas {
  readonly repositorio: RepositorioReceitas
  /** As receitas da conta, em ordem de nome. */
  readonly lista: readonly Receita[]
  /** Lê de novo depois de gravar. */
  readonly recarregar: () => void
}

/**
 * As receitas da conta (spec receitas-com-calculo, D-272), lidas ao montar e relidas quando esta tela grava ou outra
 * aba da conta grava (CB-124). A nuvem que traz mudança remonta a árvore inteira, e a tela lê de novo (DP-18).
 */
export function useReceitas(): ValorReceitas {
  const armazenamento = useArmazenamento()
  const repositorio = useMemo(() => criarRepositorioReceitas(armazenamento), [armazenamento])
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  useOutraAbaGravou(CHAVE_RECEITAS, recarregar)
  const lista = useMemo(() => {
    void versao
    return repositorio.listar()
  }, [repositorio, versao])
  return { repositorio, lista, recarregar }
}
