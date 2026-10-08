import { Fragment, useState } from 'react'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoSairProps {
  readonly aberto: boolean
  /** A saída já foi pedida e ainda não terminou: nenhum botão aceita outro clique. */
  readonly saindo?: boolean
  readonly aoFechar: () => void
  readonly aoSair: (apagarDoAparelho: boolean) => void
}

/** O texto longo quebra em duas linhas no celular, em vez de passar da largura da janela. */
const QUEBRA = 'h-auto min-h-11 whitespace-normal py-2.5 text-center sm:h-auto sm:min-h-10'

/**
 * D-96: sair pergunta se o computador é compartilhado. "Só sair" vem primeiro e recebe o
 * foco: é a escolha que não perde nada. Apagar pede confirmação, porque o que não foi
 * enviado para a nuvem só existe neste navegador (CA-423 e CA-424).
 */
export function DialogoSair({ aberto, saindo = false, aoFechar, aoSair }: DialogoSairProps) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir || saindo ? undefined : aoFechar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />} onCloseAutoFocus={() => setConfirmando(false)}>
        {/* Chaves diferentes: a etapa nova monta botões novos, em vez de reaproveitar o que tinha o foco. */}
        {confirmando ? (
          <Fragment key="confirmar">
            <DialogHeader>
              <DialogTitle>Apagar os seus dados deste aparelho?</DialogTitle>
              <DialogDescription>O que você não enviou para a nuvem em Configurações se perde.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {/* O botão que abriu esta etapa sumiu: o foco vai para a escolha segura. */}
              <Button variant="outline" autoFocus onClick={() => setConfirmando(false)} disabled={saindo}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                // O segundo clique de um duplo clique em "Sair e apagar" cai neste botão: não conta como confirmação.
                onClick={(evento) => (evento.detail > 1 ? undefined : aoSair(true))}
                disabled={saindo}
                aria-busy={saindo || undefined}
              >
                {saindo ? <PontosDaMarca pulsando /> : null}
                Apagar e sair
              </Button>
            </DialogFooter>
          </Fragment>
        ) : (
          <Fragment key="escolher">
            <DialogHeader>
              <DialogTitle>Sair da conta</DialogTitle>
              <DialogDescription>Outras pessoas usam este computador? Apague os seus pacientes e planos guardados neste navegador.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => aoSair(false)} disabled={saindo} aria-busy={saindo || undefined}>
                {saindo ? <PontosDaMarca pulsando /> : null}
                Só sair
              </Button>
              <Button variant="lighterror" className={QUEBRA} onClick={() => setConfirmando(true)} disabled={saindo}>
                Sair e apagar os meus dados deste aparelho
              </Button>
            </DialogFooter>
          </Fragment>
        )}
      </DialogContent>
    </Dialog>
  )
}
