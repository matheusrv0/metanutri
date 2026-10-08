import { useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ehArmazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { ehChaveDaNuvem } from '@/domain/copiaDaConta.ts'
import { apelidoDoAparelho, type ClienteDaCopia } from '@/domain/copiaNaNuvem.ts'
import { CHAVE_NUVEM, criarSincronia, observarMudancas, saiuDaConta } from '@/domain/sincronia.ts'
import { trocarDadosEmMemoria } from './armazenamentoDaSessao.ts'
import { ContextoArmazenamento, ContextoMigracao, useArmazenamento } from './contextoArmazenamento.ts'
import { ContextoNuvem, type ValorNuvem } from './contextoNuvem.ts'
import { obterSupabase } from './supabase.ts'

interface ProvedorNuvemProps {
  /** A conta que está dentro; `null` sem sessão ou sem servidor de conta. */
  readonly usuarioId: string | null
  readonly children: ReactNode
}

const semAssinatura = () => () => undefined

/**
 * Os dados da conta na nuvem (spec dados-na-nuvem, D-128): liga o motor de sincronia da conta que
 * entrou e dá à árvore o espaço da conta observado, por onde toda gravação passa (DP-2). Fica dentro
 * de ProvedorArmazenamento, que já escolheu o espaço da conta e levou para ele os dados de antes.
 * Sem conta ou sem o cliente do Supabase, não faz nada: tudo como antes (DP-14).
 */
export function ProvedorNuvem({ usuarioId, children }: ProvedorNuvemProps) {
  const conta = useArmazenamento()
  const migracao = useContext(ContextoMigracao)
  // O tipo do cliente do Supabase é fundo demais para o TypeScript casar com a interface pequena da
  // cópia (TS2589), como em Configurações. A forma em tempo de execução é a mesma.
  const [cliente] = useState(() => obterSupabase() as unknown as ClienteDaCopia | null)

  // Só cria o motor; ele começa a falar com a nuvem no efeito, ao ligar.
  const sincronia = useMemo(() => {
    if (usuarioId === null || cliente === null || conta === null || !ehArmazenamentoDaConta(conta) || conta.usuarioId !== usuarioId) return null
    return criarSincronia({
      cliente,
      armazenamento: conta,
      usuarioId,
      aparelho: apelidoDoAparelho(globalThis.navigator.userAgent),
      // D-133: os dados de antes que a migração acabou de trazer são juntados à cópia da nuvem.
      sujo: migracao === 'movido' || migracao === 'incompleto',
      conectado: () => globalThis.navigator.onLine !== false,
      // DP-18: a nuvem trouxe mudança: os produtos da busca e a reserva das sugestões ocultas trocam junto.
      aoTrazer: () => trocarDadosEmMemoria(conta),
    })
  }, [cliente, conta, usuarioId, migracao])

  const observado = useMemo(
    () => (sincronia !== null && conta !== null && ehArmazenamentoDaConta(conta) ? observarMudancas(conta, (contou) => sincronia.mudou(contou)) : conta),
    [sincronia, conta],
  )
  const estado = useSyncExternalStore(sincronia?.assinar ?? semAssinatura, () => sincronia?.estado ?? null)

  useEffect(() => {
    if (sincronia === null || conta === null || !ehArmazenamentoDaConta(conta)) return
    sincronia.ligar()
    const aoConectar = () => sincronia.conectou()
    const aoDesconectar = () => sincronia.desconectou()
    // CB-124: outra aba da mesma conta gravou; e se a conta saiu lá, esta para antes de o espaço sumir (DP-11).
    const aoMudarEmOutraAba = (evento: StorageEvent) => {
      if (evento.key === null) return
      const chave = conta.chaveOriginal(evento.key)
      if (chave === CHAVE_NUVEM) {
        if (saiuDaConta(evento.newValue)) sincronia.saiuEmOutraAba()
      } else if (chave !== null && ehChaveDaNuvem(chave)) sincronia.mudou()
    }
    window.addEventListener('online', aoConectar)
    window.addEventListener('offline', aoDesconectar)
    window.addEventListener('storage', aoMudarEmOutraAba)
    return () => {
      window.removeEventListener('online', aoConectar)
      window.removeEventListener('offline', aoDesconectar)
      window.removeEventListener('storage', aoMudarEmOutraAba)
      sincronia.desligar()
    }
  }, [sincronia, conta])

  const valor = useMemo<ValorNuvem | null>(
    () => (sincronia === null || estado === null ? null : { estado, salvarAgora: sincronia.salvarAgora, reduzir: sincronia.reduzir, parar: sincronia.parar }),
    [sincronia, estado],
  )

  // A mesma árvore com e sem nuvem: a sessão que chega não remonta as telas de conta (DP-11 da dados-por-conta).
  return (
    <ContextoArmazenamento.Provider value={observado}>
      <ContextoNuvem.Provider value={valor}>{children}</ContextoNuvem.Provider>
    </ContextoArmazenamento.Provider>
  )
}
