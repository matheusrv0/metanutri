import { useMemo, useState } from 'react'
import { filtrarContas, type ContaNoPainel, type GrupoDeContas } from '@/domain/negocio.ts'
import { dataEmBrasilia, inteiro, seloDaSituacao, textoDoPlano, ultimoLogin, type TomDoSelo } from '@/domain/negocioTextos.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@ds/componentes/display/table.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { useMediaQuery } from '../estado/usarMediaQuery.ts'
import { LinhaDeConta } from './LinhaDeConta.tsx'

const GRUPOS: readonly { readonly valor: GrupoDeContas; readonly rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'nutricionistas', rotulo: 'Nutricionistas' },
  { valor: 'estudantes', rotulo: 'Estudantes' },
  { valor: 'assinantes', rotulo: 'Assinantes' },
]

/** M-016 (spec ajustes-mobile): 400 contas de uma vez davam uma página de 30 mil px no celular. */
const POR_VEZ = 50

/** CA-357: as mesmas variantes de Aprovações (as de `LinhaDeConta`). */
const VARIANTE: Readonly<Record<TomDoSelo, 'lightSuccess' | 'lightInfo' | 'lightWarning' | 'muted'>> = {
  sucesso: 'lightSuccess',
  info: 'lightInfo',
  aviso: 'lightWarning',
  neutro: 'muted',
}

interface ListaDeContasProps {
  readonly contas: readonly ContaNoPainel[]
  readonly agora: Date
}

/**
 * M-016: abaixo de md (768 px), a conta vira um cartão com os mesmos dados da linha da tabela (CA-356 a CA-359). A
 * tabela de 44rem mostrava no celular uma coluna e meia, sem sinal de que havia mais à direita. Só um dos dois vai para a
 * página (nada duplicado escondido); sem `matchMedia` (testes), fica a tabela.
 */
function CartaoDeConta({ conta, agora }: { readonly conta: ContaNoPainel; readonly agora: Date }) {
  const { situacao, selo } = seloDaSituacao(conta)
  const plano = textoDoPlano(conta, agora)
  return (
    <li className="flex flex-col gap-2.5 rounded-lg bg-surfacerow p-3.5 text-sm">
      <p className="min-w-0">
        <span className="block font-semibold text-heading [overflow-wrap:anywhere]">{conta.nome || conta.email}</span>
        {conta.nome ? <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">{conta.email}</span> : null}
      </p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
        <dt className="text-xs text-muted-foreground">Situação</dt>
        <dd className="flex flex-wrap items-center gap-1.5">
          <span>{situacao}</span>
          {selo ? <Badge variant={VARIANTE[selo.tom]}>{selo.texto}</Badge> : null}
        </dd>
        <dt className="text-xs text-muted-foreground">Plano</dt>
        <dd className="flex flex-wrap items-center gap-1.5">
          {plano.tom ? <Badge variant={VARIANTE[plano.tom]}>{plano.texto}</Badge> : <span>{plano.texto}</span>}
          {plano.aviso ? <Badge variant={VARIANTE[plano.aviso.tom]}>{plano.aviso.texto}</Badge> : null}
        </dd>
        <dt className="text-xs text-muted-foreground">Criou a conta</dt>
        <dd className="numeros">{dataEmBrasilia(conta.criadaEm)}</dd>
        <dt className="text-xs text-muted-foreground">Último acesso</dt>
        <dd>{ultimoLogin(conta.ultimoLoginEm, agora)}</dd>
      </dl>
    </li>
  )
}

/** CA-356 a CA-362. */
export function ListaDeContas({ contas, agora }: ListaDeContasProps) {
  const [grupo, setGrupo] = useState<GrupoDeContas>('todas')
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(POR_VEZ)
  const celular = useMediaQuery('(max-width: 767px)')
  const { visiveis, totalDoGrupo } = useMemo(() => filtrarContas(contas, grupo, busca), [contas, grupo, busca])
  const pagina = visiveis.slice(0, limite)
  const faltam = visiveis.length - pagina.length

  // Outro grupo ou outra busca começa de novo pelas 50 mais novas.
  const escolherGrupo = (g: GrupoDeContas) => {
    setGrupo(g)
    setLimite(POR_VEZ)
  }
  const buscar = (texto: string) => {
    setBusca(texto)
    setLimite(POR_VEZ)
  }

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
          {/* M-016: no celular o seletor rola de lado; o degradê na borda direita mostra que há mais. O espaço vazio do
              fim (o ::after) fica embaixo do degradê quando tudo cabe, e a última opção chega inteira ao rolar. */}
          <div className="flex w-full max-md:overflow-x-auto max-md:[mask-image:linear-gradient(to_right,black_calc(100%-var(--space-8)),transparent)] max-md:after:w-8 max-md:after:shrink-0 md:w-auto">
            <SeletorSegmentado<GrupoDeContas> rotulo="Grupo de contas" valor={grupo} aoEscolher={escolherGrupo} opcoes={GRUPOS} className="shrink-0" />
          </div>
          <Input
            type="search"
            aria-label="Buscar nome ou e-mail"
            placeholder="Buscar nome ou e-mail"
            value={busca}
            onChange={(e) => buscar(e.target.value)}
            className="w-full sm:ml-auto sm:w-64"
          />
        </div>
        {visiveis.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{busca.trim() ? 'Nenhuma conta com esse nome ou e-mail.' : 'Nenhuma conta neste grupo.'}</p>
        ) : (
          <>
            {celular ? (
              <ul aria-label="Contas" className="flex flex-col gap-2">
                {pagina.map((c) => (
                  <CartaoDeConta key={c.id} conta={c} agora={agora} />
                ))}
              </ul>
            ) : (
              <Table className="min-w-[44rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Criou a conta</TableHead>
                    <TableHead>Último acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagina.map((c) => (
                    <LinhaDeConta key={c.id} conta={c} agora={agora} />
                  ))}
                </TableBody>
              </Table>
            )}
            {faltam > 0 ? (
              <div className="flex flex-col items-center gap-2 pt-1">
                <p className="numeros text-xs text-muted-foreground">{`Mostrando ${inteiro(pagina.length)} de ${inteiro(visiveis.length)}`}</p>
                <Button variant="outline" onClick={() => setLimite((l) => l + POR_VEZ)}>
                  {`Mostrar mais ${inteiro(Math.min(POR_VEZ, faltam))}`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </section>
  )
}
