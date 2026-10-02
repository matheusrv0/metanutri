import { useMemo, useState } from 'react'
import { filtrarContas, type ContaNoPainel, type GrupoDeContas } from '@/domain/negocio.ts'
import { inteiro } from '@/domain/negocioTextos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@ds/componentes/display/table.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { LinhaDeConta } from './LinhaDeConta.tsx'

const GRUPOS: readonly { readonly valor: GrupoDeContas; readonly rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'nutricionistas', rotulo: 'Nutricionistas' },
  { valor: 'estudantes', rotulo: 'Estudantes' },
  { valor: 'assinantes', rotulo: 'Assinantes' },
]

interface ListaDeContasProps {
  readonly contas: readonly ContaNoPainel[]
  readonly agora: Date
}

/** CA-356 a CA-362. */
export function ListaDeContas({ contas, agora }: ListaDeContasProps) {
  const [grupo, setGrupo] = useState<GrupoDeContas>('todas')
  const [busca, setBusca] = useState('')
  const { visiveis, totalDoGrupo } = useMemo(() => filtrarContas(contas, grupo, busca), [contas, grupo, busca])

  return (
    <section aria-labelledby="titulo-contas">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle id="titulo-contas">Contas</CardTitle>
          <p className="text-xs text-muted-foreground">
            <span className="numeros">
              {inteiro(visiveis.length)} de {inteiro(totalDoGrupo)}
            </span>
            , das mais novas para as mais antigas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorSegmentado<GrupoDeContas> rotulo="Grupo de contas" valor={grupo} aoEscolher={setGrupo} opcoes={GRUPOS} className="max-w-full overflow-x-auto" />
          <Input
            type="search"
            aria-label="Buscar nome ou e-mail"
            placeholder="Buscar nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full sm:ml-auto sm:w-64"
          />
        </div>
        {visiveis.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{busca.trim() ? 'Nenhuma conta com esse nome ou e-mail.' : 'Nenhuma conta neste grupo.'}</p>
        ) : (
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Criou a conta</TableHead>
                <TableHead>Último login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((c) => (
                <LinhaDeConta key={c.id} conta={c} agora={agora} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  )
}
