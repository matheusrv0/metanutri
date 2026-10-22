import { useCallback, useMemo, useState } from 'react'
import { registrarMedidasProprias } from '@/domain/busca.ts'
import { CHAVE_MEDIDAS_PROPRIAS, criarRepositorioMedidasProprias, type MedidaPropria } from '@/domain/medidasProprias.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { useOutraAbaGravou } from './usarOutraAba.ts'

export interface ValorMedidasProprias {
  /** Muda a cada gravação: quem mostra medidas relê. */
  readonly versao: number
  readonly doAlimento: (alimentoId: number) => readonly MedidaPropria[]
  readonly salvar: (dados: { readonly alimentoId: number; readonly nome: string; readonly gramas: number }) => MedidaPropria
  readonly excluir: (id: string) => void
}

/**
 * As medidas da conta para alimentos da base (spec alimentos-e-gramaturas, D-387). Cada gravação, daqui ou de outra
 * aba (CB-374), refaz as medidas que a busca e a linha do plano conhecem.
 */
export function useMedidasProprias(): ValorMedidasProprias {
  const armazenamento = useArmazenamento()
  const repositorio = useMemo(() => criarRepositorioMedidasProprias(armazenamento), [armazenamento])
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => {
    registrarMedidasProprias(repositorio.listar())
    setVersao((v) => v + 1)
  }, [repositorio])
  useOutraAbaGravou(CHAVE_MEDIDAS_PROPRIAS, recarregar)
  const doAlimento = useCallback((alimentoId: number) => repositorio.doAlimento(alimentoId), [repositorio])
  const salvar = useCallback(
    (dados: { readonly alimentoId: number; readonly nome: string; readonly gramas: number }) => {
      const salva = repositorio.salvar(dados)
      recarregar()
      return salva
    },
    [repositorio, recarregar],
  )
  const excluir = useCallback(
    (id: string) => {
      repositorio.excluir(id)
      recarregar()
    },
    [repositorio, recarregar],
  )
  return { versao, doAlimento, salvar, excluir }
}
