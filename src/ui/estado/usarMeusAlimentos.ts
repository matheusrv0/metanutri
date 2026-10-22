import { useCallback, useMemo, useState } from 'react'
import { criarRepositorioProdutos, produtoComoAlimento, type DadosParaSalvar, type Produto, type RepositorioProdutos } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { useOutraAbaGravou } from './usarOutraAba.ts'

export interface ValorMeusAlimentos {
  readonly repositorio: RepositorioProdutos
  /** Os alimentos próprios da conta, em ordem de nome. */
  readonly lista: readonly Produto[]
  /** Grava e põe na busca na hora (A24: o registro sai do desenho da tela). */
  readonly salvar: (dados: DadosParaSalvar) => Produto
  readonly excluir: (id: number) => void
}

/**
 * "Meus alimentos" da conta (spec alimentos-e-gramaturas, D-383), lidos ao montar e relidos quando esta tela grava ou
 * outra aba da conta grava (CB-124, CB-374). Cada gravação atualiza a lista que a busca conhece.
 */
export function useMeusAlimentos(): ValorMeusAlimentos {
  const armazenamento = useArmazenamento()
  const repositorio = useMemo(() => criarRepositorioProdutos(armazenamento), [armazenamento])
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => {
    registrarProdutos(repositorio.listar().map(produtoComoAlimento))
    setVersao((v) => v + 1)
  }, [repositorio])
  useOutraAbaGravou('metanutri:produtos', recarregar)
  const lista = useMemo(() => {
    void versao
    return repositorio.listar()
  }, [repositorio, versao])
  const salvar = useCallback(
    (dados: DadosParaSalvar) => {
      const salvo = repositorio.salvar(dados)
      recarregar()
      return salvo
    },
    [repositorio, recarregar],
  )
  const excluir = useCallback(
    (id: number) => {
      repositorio.excluir(id)
      recarregar()
    },
    [repositorio, recarregar],
  )
  return { repositorio, lista, salvar, excluir }
}
