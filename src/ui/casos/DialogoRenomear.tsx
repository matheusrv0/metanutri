import { useId, useState, type FormEvent } from 'react'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'
import { Input } from '../componentes/input.tsx'
import { Label } from '../componentes/label.tsx'

interface DialogoRenomearProps {
  /** Nome atual; `null` mantém a janela fechada. */
  readonly nomeAtual: string | null
  readonly aoConfirmar: (nome: string) => void
  readonly aoFechar: () => void
}

export function DialogoRenomear({ nomeAtual, aoConfirmar, aoFechar }: DialogoRenomearProps) {
  return (
    <Dialog open={nomeAtual !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        {nomeAtual !== null ? <Formulario nomeAtual={nomeAtual} aoConfirmar={aoConfirmar} aoFechar={aoFechar} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ nomeAtual, aoConfirmar, aoFechar }: { readonly nomeAtual: string; readonly aoConfirmar: (nome: string) => void; readonly aoFechar: () => void }) {
  const [nome, setNome] = useState(nomeAtual)
  const id = useId()

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    aoConfirmar(nome.trim())
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Renomear caso</DialogTitle>
        <DialogDescription>Use um nome que ajude a achar o caso depois, como "Maria, 28 anos, gestante".</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor={id}>Nome do caso</Label>
        <Input id={id} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoFocus />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">Salvar nome</Button>
      </DialogFooter>
    </form>
  )
}
