import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { lerMeusPlanos, nomeDoPlanoLembrado } from '@/domain/meusPlanos.ts'
import { armazenamentoLocal } from '../../estado/armazenamentoLocal.ts'
import { abrirLink } from '../../missoes/endereco.ts'
import { IconeMeuPlano } from '../../missoes/link/IconeMeuPlano.tsx'

interface CartaoMeusPlanosProps {
  /** Abre o link lembrado; por padrão, vai ao endereço dele. Injetável no teste (o jsdom não navega). */
  readonly aoAbrir?: (token: string) => void
}

/**
 * O aparelho lembra (spec lado-do-paciente, D-1218, CA-2227 e CB-1201): acima do login, "Abrir meu plano" com o primeiro
 * nome do paciente e o nome da nutricionista, um por link lembrado (até 5), e o divisor "Nutricionista" antes do login.
 * Sem link lembrado (ou sem armazenamento, CB-1226), nada aparece.
 */
export function CartaoMeusPlanos({ aoAbrir = abrirLink }: CartaoMeusPlanosProps) {
  const [planos] = useState(() => lerMeusPlanos(armazenamentoLocal()))
  if (planos.length === 0) return null
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Seus planos neste aparelho" className="flex flex-col gap-2">
        {planos.map((plano) => (
          <li key={plano.token}>
            <button
              type="button"
              onClick={() => aoAbrir(plano.token)}
              aria-label={`Abrir meu plano: ${nomeDoPlanoLembrado(plano)}`}
              className="flex min-h-16 w-full items-center gap-3.5 rounded-2xl border border-border bg-card py-3 pr-3 pl-3.5 text-left hover:border-borderstrong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconeMeuPlano className="size-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <strong className="block text-base font-bold text-heading">Abrir meu plano</strong>
                <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">{nomeDoPlanoLembrado(plano)}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">Nutricionista</p>
    </div>
  )
}
