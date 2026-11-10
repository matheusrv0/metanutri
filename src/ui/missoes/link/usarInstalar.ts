// O "Instalar o Meu plano" da tela do link (spec lado-do-paciente, D-1219, CA-2229 a CA-2232, CB-1219 e CB-1220): junta a
// regra pura (`instalarMeuPlano.ts`), o que o aparelho guardou e o que o navegador oferece.
import { useCallback, useEffect, useState } from 'react'
import {
  gravarEstadoDoInstalar,
  instalou,
  lerEstadoDoInstalar,
  marcou,
  mostrarCartaoInstalar,
  oferecerNaFolha,
  plataformaDoAgente,
  recusou,
  usou,
  type ContextoDoInstalar,
  type EstadoDoInstalar,
  type Plataforma,
} from '@/domain/instalarMeuPlano.ts'
import { armazenamentoLocal } from '../../estado/armazenamentoLocal.ts'
import { noAppInstalado, pedirInstalacao, usePedidoDeInstalacao } from './pedidoDeInstalacao.ts'

export interface ValorInstalar {
  readonly plataforma: Plataforma
  /** O cartão Instalar em Hoje. */
  readonly mostrarCartao: boolean
  /** "Instalar na tela inicial" na folha "Meu plano". */
  readonly naFolha: boolean
  /** A folha com os passos (iPhone, ou o navegador de dentro de outro app). */
  readonly folhaAberta: boolean
  readonly instalar: () => void
  readonly agoraNao: () => void
  readonly fecharFolha: () => void
  /** A primeira marcação neste aparelho conta para o cartão aparecer (CA-2232). */
  readonly registrarMarcacao: () => void
}

export function useInstalar(hoje: string): ValorInstalar {
  const [estado, setEstado] = useState<EstadoDoInstalar>(() => usou(lerEstadoDoInstalar(armazenamentoLocal()), hoje))
  const [folhaAberta, setFolhaAberta] = useState(false)
  const [plataforma] = useState<Plataforma>(() => plataformaDoAgente(globalThis.navigator?.userAgent ?? ''))
  const [instaladoAoAbrir] = useState(noAppInstalado)
  const pedido = usePedidoDeInstalacao()

  const mudar = useCallback((proximo: (atual: EstadoDoInstalar) => EstadoDoInstalar) => {
    setEstado((atual) => {
      const novo = proximo(atual)
      if (novo !== atual) gravarEstadoDoInstalar(armazenamentoLocal(), novo)
      return novo
    })
  }, [])

  // O primeiro dia de uso fica guardado ao abrir.
  useEffect(() => {
    gravarEstadoDoInstalar(armazenamentoLocal(), estado)
    // Só ao abrir: as mudanças depois disso gravam por `mudar`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CA-2229: o Chrome instalou (pelo pedido ou pelo menu dele): o cartão some e não volta. O aviso do navegador já gravou
  // isso no aparelho (`pedidoDeInstalacao.ts`); aqui, a tela só deixa de oferecer.
  const efetivo = pedido.instalado ? instalou(estado) : estado
  const contexto: ContextoDoInstalar = { hoje, plataforma, temPedido: pedido.temPedido, noAppInstalado: instaladoAoAbrir || pedido.instalado }

  const instalar = useCallback(() => {
    if (plataforma === 'iphone' || plataforma === 'dentro-de-app') {
      setFolhaAberta(true)
      return
    }
    void pedirInstalacao().then((resultado) => {
      // CB-1220: o pedido recusado conta como "Agora não".
      if (resultado === 'aceito') mudar(instalou)
      else if (resultado === 'recusado') mudar((atual) => recusou(atual, hoje))
    })
  }, [plataforma, hoje, mudar])

  return {
    plataforma,
    mostrarCartao: mostrarCartaoInstalar(efetivo, contexto),
    naFolha: oferecerNaFolha(efetivo, contexto),
    folhaAberta,
    instalar,
    agoraNao: () => mudar((atual) => recusou(atual, hoje)),
    fecharFolha: () => setFolhaAberta(false),
    registrarMarcacao: () => mudar(marcou),
  }
}
