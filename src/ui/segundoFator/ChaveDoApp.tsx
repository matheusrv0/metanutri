import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'

/** CB-268: a chave em grupos de 4, que cabem em 360 px e se digitam sem perder o lugar. */
const emGrupos = (chave: string): string => chave.match(/.{1,4}/g)?.join(' ') ?? chave

/**
 * A chave do app autenticador, para quem não consegue ler o código QR: o celular que mostra a tela é o mesmo
 * do app, ou a câmera não ajuda (spec seguranca-lote-5, CA-835).
 */
export function ChaveDoApp({ chave }: { readonly chave: string }) {
  const [copiada, setCopiada] = useState(false)

  const copiar = () => {
    // Sem a área de transferência (endereço sem https), a chave continua na tela para digitar.
    void navigator.clipboard?.writeText(chave).then(
      () => setCopiada(true),
      () => undefined,
    )
  }

  return (
    <div className="flex flex-col gap-2 border-t border-borderdefault pt-4">
      <p className="text-sm text-muted-foreground">Sem a câmera, digite esta chave no app:</p>
      <div className="flex flex-wrap items-center gap-3">
        <span translate="no" className="numeros select-all rounded-xl bg-surfacerow px-3 py-2.5 text-sm font-semibold tracking-wide break-all text-foreground">
          {emGrupos(chave)}
        </span>
        <Button type="button" variant="outline" size="lg" onClick={copiar}>
          {copiada ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copiada ? 'Chave copiada' : 'Copiar a chave'}
        </Button>
      </div>
    </div>
  )
}
