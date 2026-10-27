// A mudança dos dados do endereço antigo, do lado do app (spec separacao-site-app, D-512, D-513, DP-SA-11 e DP-SA-39).
//
// A aba que o "Continuar" do site abriu chega em `#/mudanca/<código>`. Depois que a pessoa entra, o app pede à aba do
// site (o `window.opener`) os dados da conta dela, antes de abrir a área de trabalho: até a mudança terminar, os dados
// da conta ficam parados (DP-SA-11). Grava pelo que o domínio decide (gravar, trocar ou deixar para depois) e, no fim,
// abre o Painel. A confirmação ao site mora dentro dos provedores, onde está a nuvem (DP-SA-39).
import { useCallback, useEffect, useRef, useState } from 'react'
import { contaEmDia } from '@/domain/contaEmDia.ts'
import { comoReceber, gravarPacote, lerMensagem, type Mensagem } from '@/domain/mudancaDeEndereco.ts'
import { ENDERECO_DO_SITE } from '../enderecos.ts'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { useMigracaoIncompleta } from '../estado/contextoArmazenamento.ts'
import { useNuvem } from '../estado/contextoNuvem.ts'
import type { Rota } from '../navegacao.ts'

/** CA-1437: sem resposta da aba do site, o app segue com a nuvem depois deste tempo. */
export const ESPERA_DA_MUDANCA_MS = 10_000

const FORMATO_DO_CODIGO = /^[0-9a-f]{32}$/

/** O que o gancho usa da janela (os testes passam uma falsa). */
export interface JanelaDoApp {
  readonly opener: unknown
  addEventListener(tipo: 'message', ouvir: (evento: MessageEvent) => void): void
  removeEventListener(tipo: 'message', ouvir: (evento: MessageEvent) => void): void
}

/** A aba do site que espera o "recebido" (D-513): só quando os dados foram gravados. */
export interface ConfirmacaoDaMudanca {
  readonly codigo: string
  readonly usuarioId: string
  readonly aba: Window
  readonly origem: string
}

export interface ValorMudanca {
  /** DP-SA-11: os dados da conta esperam a mudança (os provedores recebem a conta nula). */
  readonly segurar: boolean
  /** "Trazendo seus dados…" ou "Sem espaço neste navegador" (D-526); nula fora disso. */
  readonly tela: 'trazendo' | 'sem-espaco' | null
  /** "Continuar" da tela sem espaço: a conta abre com a nuvem (DP-SA-41). */
  readonly continuar: () => void
  readonly confirmacao: ConfirmacaoDaMudanca | null
  /** A confirmação foi mandada: não manda de novo. */
  readonly confirmada: () => void
}

interface OpcoesDaMudanca {
  readonly rota: Rota
  /** A conta que entrou, com a sessão já conferida; nula sem sessão (Entrar aparece no lugar). */
  readonly usuarioId: string | null
  readonly janela?: JanelaDoApp
}

type Fase = 'parada' | 'trazendo' | 'sem-espaco' | 'terminou'

/** No fim, o Painel (CA-1431), sem a rota da mudança no histórico. A consulta fica (a marca do ícone, D-524). */
function irParaOPainel(): void {
  const { pathname, search } = globalThis.location
  globalThis.location.replace(`${pathname}${search}#/painel`)
}

/** A aba do site, se esta aba foi aberta por ela e ela ainda está aberta. */
function abaDoSite(janela: JanelaDoApp): Window | null {
  const aba = janela.opener as Window | null | undefined
  return aba && aba.closed !== true ? aba : null
}

export function useMudanca({ rota, usuarioId, janela = globalThis }: OpcoesDaMudanca): ValorMudanca {
  const [fase, setFase] = useState<Fase>('parada')
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoDaMudanca | null>(null)
  const codigo = rota.tela === 'mudanca' ? rota.codigo : null
  const origemDoSite = new URL(ENDERECO_DO_SITE).origin

  const terminar = useCallback((pendente: ConfirmacaoDaMudanca | null) => {
    setConfirmacao(pendente)
    setFase('terminou')
  }, [])

  // Começa quando a pessoa entrou, no mesmo desenho (sem esperar um efeito). DP-SA-40: sem a aba do site (ou com código
  // que não é desta mudança), não há o que esperar: a conta abre na hora.
  if (fase === 'parada' && codigo !== null && usuarioId !== null) {
    setFase(!FORMATO_DO_CODIGO.test(codigo) || abaDoSite(janela) === null ? 'terminou' : 'trazendo')
  }

  // No fim, ainda na rota da mudança, o Painel.
  const terminouNaRota = fase === 'terminou' && codigo !== null
  useEffect(() => {
    if (terminouNaRota) irParaOPainel()
  }, [terminouNaRota])

  // Pede e espera, no máximo 10 s (CA-1437).
  useEffect(() => {
    const aba = abaDoSite(janela)
    if (fase !== 'trazendo' || codigo === null || usuarioId === null || aba === null) return
    let acabou = false
    const parar = () => {
      acabou = true
      clearTimeout(relogio)
      janela.removeEventListener('message', aoReceber)
    }
    const fim = (pendente: ConfirmacaoDaMudanca | null) => {
      parar()
      terminar(pendente)
    }
    // CA-1438: só do endereço do site, da aba que abriu esta, com o código desta mudança e da conta que entrou.
    function aoReceber(evento: MessageEvent) {
      if (acabou || evento.origin !== origemDoSite || evento.source !== aba || codigo === null || usuarioId === null) return
      const mensagem = lerMensagem(evento.data)
      if (mensagem === null || mensagem.codigo !== codigo || mensagem.usuarioId !== usuarioId) return
      if (mensagem.tipo === 'nada') return fim(null)
      if (mensagem.tipo !== 'dados' || aba === null) return
      const base = armazenamentoLocal()
      // CA-1435: com algo daqui que ainda não subiu, fica para a próxima visita ao site.
      const modo = base === null ? 'depois' : comoReceber(base, usuarioId)
      if (base === null || modo === 'depois') return fim(null)
      const gravacao = gravarPacote(base, usuarioId, mensagem.chaves, modo)
      if (gravacao === 'gravado') return fim({ codigo, usuarioId, aba, origem: origemDoSite })
      if (gravacao === 'sem-espaco') {
        // CB-501: nada ficou gravado; a tela diz, e "Continuar" abre a conta com a nuvem.
        parar()
        setFase('sem-espaco')
        return
      }
      fim(null)
    }
    janela.addEventListener('message', aoReceber)
    const pedido: Mensagem = { tipo: 'pedir', codigo, usuarioId }
    aba.postMessage(pedido, origemDoSite)
    const relogio = setTimeout(() => fim(null), ESPERA_DA_MUDANCA_MS)
    return parar
  }, [fase, codigo, usuarioId, janela, origemDoSite, terminar])

  const segurar = codigo !== null ? fase !== 'terminou' : fase === 'trazendo' || fase === 'sem-espaco'
  return {
    segurar,
    tela: fase === 'trazendo' ? 'trazendo' : fase === 'sem-espaco' ? 'sem-espaco' : null,
    continuar: () => terminar(null),
    confirmacao,
    confirmada: () => setConfirmacao(null),
  }
}

/**
 * D-513 e DP-SA-39: o app confirma ao site só quando a nuvem tem tudo: dados abertos, nada pendente nem salvando, sem
 * trava, nenhuma migração incompleta e a conta em dia (nenhum link pendente; o valor retido fica aqui e não conta,
 * CA-1439). Mora dentro dos provedores, onde está a nuvem.
 */
export function useConfirmarMudanca(pendente: ConfirmacaoDaMudanca | null, aoConfirmada: () => void): void {
  const nuvem = useNuvem()
  const migracaoIncompleta = useMigracaoIncompleta()
  const estado = nuvem?.estado ?? null
  // Uma vez por mudança, mesmo que a nuvem mude de novo antes de quem chamou esquecer a confirmação.
  const confirmada = useRef<ConfirmacaoDaMudanca | null>(null)
  useEffect(() => {
    if (pendente === null || pendente === confirmada.current || estado === null || migracaoIncompleta) return
    if (estado.fase !== 'pronta' || estado.pendente || estado.salvando || estado.trava !== null) return
    const base = armazenamentoLocal()
    if (base === null || !contaEmDia(base, pendente.usuarioId, { contarRetidos: false })) return
    const recebido: Mensagem = { tipo: 'recebido', codigo: pendente.codigo, usuarioId: pendente.usuarioId }
    pendente.aba.postMessage(recebido, pendente.origem)
    confirmada.current = pendente
    aoConfirmada()
  }, [pendente, estado, migracaoIncompleta, aoConfirmada])
}
