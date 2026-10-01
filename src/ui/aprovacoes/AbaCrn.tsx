import { ExternalLink } from 'lucide-react'
import { useRef, useState } from 'react'
import { URL_CONSULTA_CFN, type CrnParaConferir } from '@/domain/aprovacoes.ts'
import { formatarDataLonga } from '@/domain/pedidoEstudante.ts'
import { formatarCrn, type StatusCrn } from '@/domain/situacao.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'

interface AbaCrnProps {
  readonly crns: readonly CrnParaConferir[]
  readonly decidirCrn: ValorAprovacoes['decidirCrn']
}

const SELO: Readonly<Record<StatusCrn, { readonly texto: string; readonly variante: 'lightInfo' | 'lightSuccess' | 'lightWarning' }>> = {
  em_conferencia: { texto: 'Em conferência', variante: 'lightInfo' },
  conferido: { texto: 'Conferido', variante: 'lightSuccess' },
  nao_encontrado: { texto: 'Não encontrado', variante: 'lightWarning' },
}

/** CRN para conferir na Consulta Nacional do CFN (CA-296). */
export function AbaCrn({ crns, decidirCrn }: AbaCrnProps) {
  const [erro, setErro] = useState<string | null>(null)
  const decidindoRef = useRef(false)

  const decidir = async (usuario: string, status: StatusCrn) => {
    if (decidindoRef.current) return
    decidindoRef.current = true
    setErro(await decidirCrn(usuario, status))
    decidindoRef.current = false
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5" aria-label="CRN para conferir">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Busque pelo nome na consulta do conselho e confira o número.</p>
        <a
          href={URL_CONSULTA_CFN}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borderdefault px-5 text-sm font-medium hover:border-primary hover:text-primary sm:min-h-10"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Abrir a Consulta Nacional do CFN
        </a>
      </div>
      {erro ? (
        <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
          {erro}
        </p>
      ) : null}
      {crns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum CRN esperando conferência.</p> : null}
      <ul className="flex flex-col gap-2">
        {crns.map((c) => (
          <li key={c.usuario} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surfacerow px-4 py-3 text-sm">
            <span className="min-w-40 flex-1">
              <span className="block font-semibold text-heading">{c.nome || c.email}</span>
              <span className="text-xs text-muted-foreground">{c.email}</span>
            </span>
            <span className="numeros w-32">{formatarCrn(c.crn)}</span>
            <span className="w-40 text-muted-foreground">{formatarDataLonga(c.contaCriadaEm)}</span>
            <Badge variant={SELO[c.status].variante}>{SELO[c.status].texto}</Badge>
            <span className="ml-auto flex gap-2">
              {c.status === 'em_conferencia' ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => void decidir(c.usuario, 'nao_encontrado')}>
                    Não encontrado
                  </Button>
                  <Button size="sm" onClick={() => void decidir(c.usuario, 'conferido')}>
                    Conferido
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void decidir(c.usuario, 'em_conferencia')}>
                  Desfazer
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
