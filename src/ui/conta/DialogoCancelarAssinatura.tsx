import { useRef, useState } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { CONFERINDO_COBRANCA, PREVIA_FALHOU, textoDoCancelamento, type PreviaDoCancelamento } from '@/domain/assinaturaTextos.ts'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaMudanca, ResultadoDaPrevia } from '../estado/usarAssinatura.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'

interface DialogoCancelarAssinaturaProps {
  readonly aberto: boolean
  readonly assinatura: Assinatura
  readonly cancelar: () => Promise<ResultadoDaMudanca>
  /** D-81: pergunta ao servidor se já houve cobrança. */
  readonly previa: () => Promise<ResultadoDaPrevia>
  readonly aoFechar: () => void
  readonly aoCancelada: () => void
  /** Depois de cancelar, o botão que abriu a confirmação some: quem chama leva o foco para outro lugar. */
  readonly aoDevolverFoco: () => void
}

type Conferencia = { readonly fase: 'conferindo' } | { readonly fase: 'falhou' } | { readonly fase: 'pronta'; readonly previa: PreviaDoCancelamento }
const CONFERINDO: Conferencia = { fase: 'conferindo' }

/**
 * CA-377 e CA-395 a CA-397 (D-81): ao abrir, pergunta ao servidor se já houve cobrança e diz o
 * que acontece; "Cancelar assinatura" só libera com a resposta. "Manter assinatura" vem primeiro e recebe o foco.
 */
export function DialogoCancelarAssinatura({ aberto, assinatura, cancelar, previa, aoFechar, aoCancelada, aoDevolverFoco }: DialogoCancelarAssinaturaProps) {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const canceladaRef = useRef(false)
  const manterRef = useRef<HTMLButtonElement>(null)
  const [conferencia, setConferencia] = useState<Conferencia>(CONFERINDO)
  /** Só vale a resposta do último pedido de prévia (fechar e abrir de novo, ou "Tentar de novo"). Lido só em manipulador e em .then. */
  const pedidoRef = useRef(0)
  // Pendente e pausada voltam ao Free na hora, sem período: não há o que conferir (D-81).
  const precisaConferir = assinatura.status === 'ativa'

  const conferir = () => {
    pedidoRef.current += 1
    const meu = pedidoRef.current
    setConferencia(CONFERINDO)
    void previa().then(
      (r) => {
        if (pedidoRef.current === meu) setConferencia(r.ok ? { fase: 'pronta', previa: { cobrada: r.cobrada, expiraEm: r.expiraEm } } : { fase: 'falhou' })
      },
      () => {
        if (pedidoRef.current === meu) setConferencia({ fase: 'falhou' })
      },
    )
  }

  const pronta = !precisaConferir || conferencia.fase === 'pronta'
  const descricao = !precisaConferir
    ? textoDoCancelamento(assinatura, null)
    : conferencia.fase === 'pronta'
      ? textoDoCancelamento(assinatura, conferencia.previa)
      : conferencia.fase === 'falhou'
        ? PREVIA_FALHOU
        : CONFERINDO_COBRANCA

  const confirmar = async () => {
    // CB-92: o segundo clique não sai. D-81: sem a prévia, também não.
    if (enviandoRef.current || !pronta) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const resultado = await cancelar()
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) {
      canceladaRef.current = true
      aoCancelada()
    }
    else setErro(resultado.erro)
  }

  const fechar = () => {
    if (enviandoRef.current) return
    setErro(null)
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent
        iconeFechar={<IconeMarca nome="fechar" />}
        // Cada abertura começa sem o erro de antes, e o fechamento (por qualquer motivo, inclusive
        // `aberto` virar false porque a linha mudou) o apaga. Os dois são avisos do diálogo, não efeitos.
        onOpenAutoFocus={() => {
          setErro(null)
          if (precisaConferir) conferir()
        }}
        onCloseAutoFocus={(e) => {
          setErro(null)
          pedidoRef.current += 1
          setConferencia(CONFERINDO)
          // Cancelada: o foco já foi para o aviso, e o botão que abriu a confirmação sumiu.
          if (canceladaRef.current) {
            canceladaRef.current = false
            e.preventDefault()
            aoDevolverFoco()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Cancelar a assinatura?</DialogTitle>
          <DialogDescription aria-live="polite">{descricao}</DialogDescription>
        </DialogHeader>
        {precisaConferir && conferencia.fase === 'conferindo' ? <PontosDaMarca pulsando className="self-start" /> : null}
        {precisaConferir && conferencia.fase === 'falhou' ? (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              // O botão some ao tentar de novo: o foco vai para um controle que continua na janela.
              manterRef.current?.focus()
              conferir()
            }}
          >
            Tentar de novo
          </Button>
        ) : null}
        {erro ? <AvisoPagamento tipo="erro">{erro}</AvisoPagamento> : null}
        <DialogFooter>
          <Button ref={manterRef} onClick={fechar} disabled={enviando}>
            Manter assinatura
          </Button>
          <Button variant="lighterror" onClick={() => void confirmar()} disabled={enviando || !pronta} aria-busy={enviando || undefined}>
            {enviando ? <PontosDaMarca pulsando /> : null}
            Cancelar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
