// A aba do site na mudança dos dados (spec separacao-site-app, D-512, D-527 e DP-SA-12).
//
// "Continuar" abre o app em aba nova, em `#/mudanca/<código>`. A aba nova, depois que a pessoa entra, pede os dados da
// conta dela; esta responde só com o pacote daquela conta (D-512) e, quando o app confirma que a nuvem tem tudo (D-513),
// apaga o que entregou. As mensagens só valem do endereço do app, da janela que esta abriu e com o código desta vez.
// Fora do React, como o vigia da sessão: a tela "Continuar" lê o estado.
import { apagarEntregue, lerMensagem, novoCodigo, pacoteDaConta, type Mensagem } from '@/domain/mudancaDeEndereco.ts'
import type { ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { ENDERECO_DO_APP, telaNoApp } from '@/ui/enderecos.ts'
import { MARCA_DO_ICONE } from './limpeza.ts'

/** D-526: dado só aqui, esperando a outra aba, janela bloqueada e pronto. */
export type EstadoDaMudanca = 'parado' | 'esperando' | 'bloqueada' | 'pronto'

/** O que o remetente usa da janela (os testes passam uma falsa). */
export interface JanelaDoSite {
  open(endereco: string, alvo: string): Window | null
  addEventListener(tipo: 'message', ouvir: (evento: MessageEvent) => void): void
  removeEventListener(tipo: 'message', ouvir: (evento: MessageEvent) => void): void
}

export interface OpcoesDoRemetente {
  readonly base: ArmazenamentoListavel | null
  /** Aberto pelo ícone instalado do endereço antigo: a aba nova leva a marca (D-524). */
  readonly instalado: boolean
  readonly janela?: JanelaDoSite
}

export interface Remetente {
  readonly estado: EstadoDaMudanca
  assinar(ouvinte: () => void): () => void
  /** "Continuar": abre o app em aba nova, com um código novo (CA-1430). */
  continuar(): void
  desligar(): void
}

interface Mudanca {
  readonly codigo: string
  readonly aba: Window
  /** O que foi para o app, e para qual conta: só isso sai quando ele confirmar. */
  entregue: { readonly usuarioId: string; readonly chaves: readonly string[] } | null
}

export function criarRemetente({ base, instalado, janela = globalThis }: OpcoesDoRemetente): Remetente {
  const origemDoApp = new URL(ENDERECO_DO_APP).origin
  const ouvintes = new Set<() => void>()
  let estado: EstadoDaMudanca = 'parado'
  let atual: Mudanca | null = null

  const definir = (novo: EstadoDaMudanca) => {
    if (novo === estado) return
    estado = novo
    for (const ouvir of [...ouvintes]) ouvir()
  }

  const responder = (mudanca: Mudanca, mensagem: Mensagem) => mudanca.aba.postMessage(mensagem, origemDoApp)

  /** CA-1438: só do endereço do app, da janela aberta por esta aba, com o código desta vez. O resto é ignorado. */
  const aoReceber = (evento: MessageEvent) => {
    const mudanca = atual
    if (mudanca === null || evento.origin !== origemDoApp || evento.source !== mudanca.aba) return
    const mensagem = lerMensagem(evento.data)
    if (mensagem === null || mensagem.codigo !== mudanca.codigo) return
    if (mensagem.tipo === 'pedir') {
      // CA-1432: só o pacote da conta pedida; sem nada dela aqui, "nada" (CB-504).
      const pacote = base === null ? null : pacoteDaConta(base, mensagem.usuarioId)
      mudanca.entregue = pacote === null ? null : { usuarioId: mensagem.usuarioId, chaves: Object.keys(pacote) }
      const { codigo, usuarioId } = mensagem
      responder(mudanca, pacote === null ? { tipo: 'nada', codigo, usuarioId } : { tipo: 'dados', codigo, usuarioId, chaves: pacote })
      return
    }
    if (mensagem.tipo === 'recebido' && mudanca.entregue?.usuarioId === mensagem.usuarioId && base !== null) {
      // CA-1436: a nuvem tem tudo; sai o que foi entregue. Repetir não faz mal (CB-507).
      apagarEntregue(base, mensagem.usuarioId, mudanca.entregue.chaves)
      definir('pronto')
    }
  }
  janela.addEventListener('message', aoReceber)

  return {
    get estado() {
      return estado
    },
    assinar(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
    continuar() {
      const codigo = novoCodigo()
      // Sem `noopener`: a aba nova precisa do `window.opener` para pedir os dados (DP-SA-12).
      const aba = janela.open(telaNoApp(`#/mudanca/${codigo}`, instalado ? `?${MARCA_DO_ICONE}` : ''), '_blank')
      if (aba === null) {
        // CB-519: o bloqueador barrou; a tela pede para permitir e clicar de novo.
        atual = null
        definir('bloqueada')
        return
      }
      atual = { codigo, aba, entregue: null }
      definir('esperando')
    },
    desligar() {
      janela.removeEventListener('message', aoReceber)
    },
  }
}
