import { BookmarkPlus, Trash } from 'lucide-react'
import type { Suplemento } from '@/domain/suplementos.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface LinhaSuplementoProps {
  readonly suplemento: Suplemento
  /** A posição na lista, para nomear o suplemento ainda sem nome ("Suplemento 2"). */
  readonly posicao: number
  readonly aoMudar: (suplemento: Suplemento) => void
  readonly aoTirar: () => void
  readonly aoSalvarModelo: () => void
}

/** Um suplemento da ficha, com os cinco campos (CA-571), "Salvar como modelo" (CA-573) e "Tirar" (CA-572). */
export function LinhaSuplemento({ suplemento, posicao, aoMudar, aoTirar, aoSalvarModelo }: LinhaSuplementoProps) {
  const nome = suplemento.nome.trim()
  const mudar = (campo: keyof Omit<Suplemento, 'id'>) => (valor: string) => aoMudar({ ...suplemento, [campo]: valor })
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-lg bg-surfacerow p-3">
      <legend className="sr-only">{nome || `Suplemento ${posicao}`}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto rotulo="Nome" valor={suplemento.nome} aoMudar={mudar('nome')} />
        <CampoTexto rotulo="Dose" valor={suplemento.dose} aoMudar={mudar('dose')} placeholder="1 cápsula…" />
        <CampoTexto rotulo="Horário" valor={suplemento.horario} aoMudar={mudar('horario')} placeholder="No almoço…" />
        <CampoTexto rotulo="Por quanto tempo" valor={suplemento.duracao} aoMudar={mudar('duracao')} placeholder="3 meses…" />
      </div>
      <CampoTexto rotulo="Observação" valor={suplemento.observacao} aoMudar={mudar('observacao')} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={nome === ''} onClick={aoSalvarModelo}>
          <BookmarkPlus aria-hidden="true" />
          Salvar como modelo
        </Button>
        <Button size="sm" variant="ghost" onClick={aoTirar}>
          <Trash aria-hidden="true" />
          Tirar
        </Button>
      </div>
    </fieldset>
  )
}
