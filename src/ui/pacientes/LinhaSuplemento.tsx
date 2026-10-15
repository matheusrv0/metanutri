import { BookmarkPlus, Trash } from 'lucide-react'
import { useId, useState } from 'react'
import type { Suplemento } from '@/domain/suplementos.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'

interface LinhaSuplementoProps {
  readonly suplemento: Suplemento
  /** A posição na lista, para nomear o suplemento ainda sem nome ("Suplemento 2"). */
  readonly posicao: number
  readonly aoMudar: (suplemento: Suplemento) => void
  readonly aoTirar: () => void
  readonly aoSalvarModelo: () => void
}

const preenchido = (s: Suplemento): boolean => [s.nome, s.dose, s.horario, s.duracao, s.observacao].some((v) => v.trim() !== '')

/**
 * Um suplemento da ficha, com os cinco campos (CA-571), "Salvar como modelo" (CA-573) e "Tirar" (CA-572): vazio sai
 * na hora; com algo escrito, pede confirmação antes.
 */
export function LinhaSuplemento({ suplemento, posicao, aoMudar, aoTirar, aoSalvarModelo }: LinhaSuplementoProps) {
  const [confirmando, setConfirmando] = useState(false)
  const id = useId()
  const nome = suplemento.nome.trim()
  const mudar = (campo: 'nome' | 'dose' | 'horario' | 'duracao' | 'observacao') => (valor: string) => aoMudar({ ...suplemento, [campo]: valor })
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-lg bg-surfacerow p-3">
      <legend className="sr-only">{nome || `Suplemento ${posicao}`}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto rotulo="Nome" valor={suplemento.nome} aoMudar={mudar('nome')} />
        <CampoTexto rotulo="Dose" valor={suplemento.dose} aoMudar={mudar('dose')} placeholder="1 cápsula…" />
        <CampoTexto rotulo="Horário" valor={suplemento.horario} aoMudar={mudar('horario')} placeholder="No almoço…" />
        <CampoTexto rotulo="Por quanto tempo" valor={suplemento.duracao} aoMudar={mudar('duracao')} placeholder="3 meses…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-observacao`}>Observação</Label>
        <Textarea id={`${id}-observacao`} rows={2} className="min-h-16" value={suplemento.observacao} onChange={(e) => mudar('observacao')(e.target.value)} />
      </div>
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="destructive" onClick={aoTirar}>
            <Trash aria-hidden="true" />
            Tirar mesmo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={nome === ''} onClick={aoSalvarModelo}>
            <BookmarkPlus aria-hidden="true" />
            Salvar como modelo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => (preenchido(suplemento) ? setConfirmando(true) : aoTirar())}>
            <Trash aria-hidden="true" />
            Tirar
          </Button>
        </div>
      )}
    </fieldset>
  )
}
