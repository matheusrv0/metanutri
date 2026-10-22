import { Plus, X } from 'lucide-react'
import type { ExameRecente } from '@/domain/pacientes.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'

interface ListaExamesRecentesProps {
  readonly exames: readonly ExameRecente[]
  readonly aoMudar: (exames: readonly ExameRecente[]) => void
}

/**
 * Exames recentes da anamnese (spec ficha-unica, D-362): data, exame e valor. É o dado bioquímico; o pedido de
 * exames continua na Conduta.
 */
export function ListaExamesRecentes({ exames, aoMudar }: ListaExamesRecentesProps) {
  const mudar = (id: string, mudanca: Partial<ExameRecente>) => aoMudar(exames.map((e) => (e.id === id ? { ...e, ...mudanca } : e)))
  return (
    <div className="flex flex-col gap-3">
      {exames.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum exame registrado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {exames.map((exame, i) => (
            <li
              key={exame.id}
              role="group"
              aria-label={`Exame ${i + 1}`}
              className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 rounded-lg bg-card p-3 sm:grid-cols-[10rem_minmax(0,1fr)_9rem_auto]"
            >
              <CampoTexto rotulo="Data" tipo="date" valor={exame.data} aoMudar={(data) => mudar(exame.id, { data })} />
              <CampoTexto rotulo="Exame" valor={exame.exame} aoMudar={(nome) => mudar(exame.id, { exame: nome })} placeholder="Ferritina…" />
              <CampoTexto rotulo="Valor" valor={exame.valor} aoMudar={(valor) => mudar(exame.id, { valor })} placeholder="12 ng/mL…" />
              <Button
                variant="ghost"
                className="justify-self-start sm:justify-self-auto"
                aria-label={`Tirar o exame ${i + 1}`}
                onClick={() => aoMudar(exames.filter((e) => e.id !== exame.id))}
              >
                <X aria-hidden="true" />
                <span className="sm:sr-only">Tirar</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="self-start max-sm:min-h-11"
        onClick={() => aoMudar([...exames, { id: globalThis.crypto.randomUUID(), data: '', exame: '', valor: '' }])}
      >
        <Plus aria-hidden="true" />
        Adicionar exame
      </Button>
    </div>
  )
}
