import { useEffect, useState } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

/** A marca que o site põe na consulta quando o ícone antigo o abre (DP-SA-37; a mesma `MARCA_DO_ICONE` do site). */
export const MARCA = 'icone-antigo'

const temMarca = (): boolean => new URLSearchParams(globalThis.location.search).has(MARCA)

/** Tira a marca do endereço, sem recarregar nem mexer no resto da consulta e no `#`. */
function tirarMarca(): void {
  const url = new URL(globalThis.location.href)
  url.searchParams.delete(MARCA)
  globalThis.history.replaceState(globalThis.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

/**
 * O aviso do ícone antigo (spec separacao-site-app, D-524 e D-526): quem abriu o MetaNutri pelo ícone instalado do
 * endereço antigo chega com a marca; o aviso aparece uma vez, e a marca sai do endereço na hora (recarregar não o traz).
 */
export function AvisoIconeAntigo() {
  const [aberto, setAberto] = useState(temMarca)
  useEffect(() => {
    if (temMarca()) tirarMarca()
  }, [])
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo endereço: app.metanutri.com.br.</DialogTitle>
          <DialogDescription>Instale o MetaNutri de novo para o ícone abrir direto aqui.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button autoFocus onClick={() => setAberto(false)}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
