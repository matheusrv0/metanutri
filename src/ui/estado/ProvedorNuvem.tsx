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

/** DP-27: com `navigator.locks`, uma aba da conta vai à nuvem por vez; sem ele, cada aba na sua fila. */
function travaEntreAbas(usuarioId: string): { readonly trancar?: <T>(fazer: () => Promise<T>) => Promise<T> } {
  const travas = globalThis.navigator?.locks
  if (travas === undefined) return {}
  return { trancar: <T,>(fazer: () => Promise<T>): Promise<T> => travas.request(`metanutri:nuvem:${usuarioId}`, fazer) }
}

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
      ...travaEntreAbas(usuarioId),
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
      } else if (chave !== null && ehChaveDaNuvem(chave)) {
        sincronia.mudou()
        // CB-124: os produtos da outra aba entram na busca daqui.
        if (chave === 'metanutri:produtos') trocarDadosEmMemoria(conta)
      }
    }
    // DP-27: ao esconder ou fechar a aba, o que falta vai na hora; fechar com pendência avisa.
    const aoSairDaAba = () => {
      if (sincronia.estado.pendente) void sincronia.salvarAgora()
    }
    const aoFechar = (evento: BeforeUnloadEvent) => {
      if (!sincronia.estado.pendente) return
      evento.preventDefault()
      evento.returnValue = ''
    }
    // CB-127: a pessoa voltou para esta aba; antes de deixar editar, confere se outro aparelho salvou (DP-20).
    const aoVoltar = () => void sincronia.conferir(true)
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') aoVoltar()
      else aoSairDaAba()
    }
    window.addEventListener('online', aoConectar)
    window.addEventListener('offline', aoDesconectar)
    window.addEventListener('storage', aoMudarEmOutraAba)
    window.addEventListener('focus', aoVoltar)
    window.addEventListener('pagehide', aoSairDaAba)
    window.addEventListener('beforeunload', aoFechar)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      window.removeEventListener('online', aoConectar)
      window.removeEventListener('offline', aoDesconectar)
      window.removeEventListener('storage', aoMudarEmOutraAba)
      window.removeEventListener('focus', aoVoltar)
      window.removeEventListener('pagehide', aoSairDaAba)
      window.removeEventListener('beforeunload', aoFechar)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
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
