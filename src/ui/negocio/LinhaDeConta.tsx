import type { ContaNoPainel } from '@/domain/negocio.ts'
import { dataEmBrasilia, seloDaSituacao, textoDoPlano, ultimoLogin, type TomDoSelo } from '@/domain/negocioTextos.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { TableCell, TableRow } from '@ds/componentes/display/table.tsx'

/** CA-357: as mesmas variantes de Aprovações. */
const VARIANTE: Readonly<Record<TomDoSelo, 'lightSuccess' | 'lightInfo' | 'lightWarning' | 'muted'>> = {
  sucesso: 'lightSuccess',
  info: 'lightInfo',
  aviso: 'lightWarning',
  neutro: 'muted',
}

interface LinhaDeContaProps {
  readonly conta: ContaNoPainel
  readonly agora: Date
}

/** CA-356 a CA-359 e CB-83. */
export function LinhaDeConta({ conta, agora }: LinhaDeContaProps) {
  const { situacao, selo } = seloDaSituacao(conta)
  const plano = textoDoPlano(conta, agora)
  return (
    <TableRow>
      <TableCell>
        <span className="block font-semibold text-heading">{conta.nome || conta.email}</span>
        {conta.nome ? <span className="block text-xs text-muted-foreground">{conta.email}</span> : null}
      </TableCell>
      <TableCell>
        <span className="flex flex-col items-start gap-1">
          <span>{situacao}</span>
          {selo ? <Badge variant={VARIANTE[selo.tom]}>{selo.texto}</Badge> : null}
        </span>
      </TableCell>
      <TableCell>
        <span className="flex flex-col items-start gap-1">
          {plano.tom ? <Badge variant={VARIANTE[plano.tom]}>{plano.texto}</Badge> : <span>{plano.texto}</span>}
          {plano.aviso ? <Badge variant={VARIANTE[plano.aviso.tom]}>{plano.aviso.texto}</Badge> : null}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">{dataEmBrasilia(conta.criadaEm)}</TableCell>
      <TableCell className="whitespace-nowrap">{ultimoLogin(conta.ultimoLoginEm, agora)}</TableCell>
    </TableRow>
  )
}
