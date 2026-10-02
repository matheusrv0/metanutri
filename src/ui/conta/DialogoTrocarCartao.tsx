import { useRef, useState } from 'react'
import { CARTAO_ANTIGO, type DadosDoCartao } from '@/domain/cartao.ts'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaMudanca } from '../estado/usarAssinatura.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import { FormularioCartao } from '../pagamento/FormularioCartao.tsx'
import type { ControleDoCartao, CriarProcessador } from '../pagamento/processadorCartao.ts'

interface DialogoTrocarCartaoProps {
  readonly aberto: boolean
  readonly criarProcessador: CriarProcessador
  readonly trocarCartao: (cartao: DadosDoCartao) => Promise<ResultadoDaMudanca>
  readonly aoFechar: () => void
  readonly aoTrocado: () => void
}

/** CA-379: o mesmo formulário do checkout. Recusado, o cartão antigo continua e a mensagem aparece. */
export function DialogoTrocarCartao({ aberto, criarProcessador, trocarCartao, aoFechar, aoTrocado }: DialogoTrocarCartaoProps) {
  const controle = useRef<ControleDoCartao>(null)
  const enviandoRef = useRef(false)
  const [pronto, setPronto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async () => {
    const formulario = controle.current
    // CB-92: o segundo clique não sai.
    if (enviandoRef.current || !formulario || !formulario.conferir()) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const gerado = await formulario.gerar()
    const resultado: ResultadoDaMudanca = gerado.ok ? await trocarCartao(gerado.dados) : { ok: false, erro: `${gerado.erro} ${CARTAO_ANTIGO}` }
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) {
      aoTrocado()
      return
    }
    setErro(resultado.erro)
    if (gerado.ok) formulario.limparCodigo()
  }

  const fechar = () => {
    if (enviandoRef.current) return
    setErro(null)
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void salvar()
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Trocar cartão</DialogTitle>
            <DialogDescription>As próximas cobranças vão para o cartão novo. Nada é cobrado agora.</DialogDescription>
          </DialogHeader>
          <FormularioCartao ref={controle} criarProcessador={criarProcessador} travado={enviando} aoMudarPronto={setPronto} />
          {erro ? <AvisoPagamento tipo="erro">{erro}</AvisoPagamento> : null}
          <DialogFooter>
            <Button variant="outline" onClick={fechar} disabled={enviando}>
              Voltar
            </Button>
            <Button type="submit" disabled={!pronto || enviando} aria-busy={enviando || undefined}>
              {enviando ? (
                <>
                  <PontosDaMarca pulsando />
                  Confirmando com o banco…
                </>
              ) : (
                'Salvar cartão'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
