import { Info, TriangleAlert } from 'lucide-react'
import { useId, type Ref } from 'react'
import { DESTINOS, temNome, type Destino } from '@/domain/importar/colunas.ts'
import { textoDaRecusa } from '@/domain/importar/textos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { ListaNativa } from '@ds/componentes/forms/ListaNativa.tsx'
import { cn } from '@ds/lib/cn.ts'
import type { PlanilhaCarregada } from './estadoDaImportacao.ts'

interface PassoColunasProps {
  readonly planilha: PlanilhaCarregada
  readonly aba: number
  readonly destinos: readonly Destino[]
  readonly aoEscolherAba: (aba: number) => void
  readonly aoMudarDestino: (indice: number, destino: Destino) => void
  readonly aoTrocarArquivo: () => void
  readonly aoVerPrevia: () => void
  readonly tituloRef: Ref<HTMLHeadingElement>
}

/** O espaço que não quebra: o número fica com a palavra dele ("8 reconhecidas" não se separa). */
const ESPACO_FIRME = String.fromCharCode(160)
const plural = (n: number, um: string, varios: string): string => `${n.toLocaleString('pt-BR')}${ESPACO_FIRME}${n === 1 ? um : varios}`

/** As três colunas da tabela no computador; abaixo de 1024 px, duas linhas por coluna (CA-1948). */
const GRADE = 'grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,15rem)]'

/**
 * Passo 2 (D-904, D-905): cada coluna da planilha, o exemplo da primeira linha e para onde ela vai. Sem coluna em Nome,
 * a prévia não abre (CA-1914). O XLSX com mais de uma aba escolhe a aba aqui (CA-1908).
 */
export function PassoColunas({ planilha, aba, destinos, aoEscolherAba, aoMudarDestino, aoTrocarArquivo, aoVerPrevia, tituloRef }: PassoColunasProps) {
  const id = useId()
  const abas = planilha.lida.abas
  const analise = abas[aba]?.analise
  if (analise === undefined) return null
  const semNome = !temNome(destinos)
  const bloqueada = semNome || analise.excede

  return (
    <Card className="gap-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          {/* D-801: o nome do arquivo identifica: quebra em até duas linhas, com o nome inteiro no `title`. */}
          <h2 ref={tituloRef} tabIndex={-1} title={planilha.nome} className="card-title line-clamp-2 break-words focus:outline-none">
            {planilha.nome}
          </h2>
          <p className="numeros mt-1 text-sm text-muted-foreground">
            {`${plural(analise.linhas.length, 'linha', 'linhas')} · ${plural(analise.colunas.length, 'coluna', 'colunas')} · ${plural(analise.reconhecidas, 'reconhecida', 'reconhecidas')}`}
          </p>
        </div>
        <Button variant="link" size="sm" className="-mx-3.5 sm:mx-0" onClick={aoTrocarArquivo}>
          Trocar arquivo
        </Button>
      </div>

      {abas.length > 1 ? (
        <div className="flex flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor={`${id}-aba`}>Aba</Label>
          <ListaNativa id={`${id}-aba`} value={String(aba)} onChange={(evento) => aoEscolherAba(Number(evento.target.value))}>
            {abas.map((uma, indice) => (
              <option key={indice} value={indice}>
                {uma.nome}
              </option>
            ))}
          </ListaNativa>
        </div>
      ) : null}

      {analise.excede ? (
        <Alert variant="warning" role="alert">
          <TriangleAlert aria-hidden="true" />
          <p>{textoDaRecusa({ tipo: 'linhas' })}</p>
        </Alert>
      ) : null}

      {/* D-919 e CB-926: a planilha com mais de 200 colunas entra com as 200 primeiras. */}
      {analise.colunasCortadas ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <p>Só as 200 primeiras colunas entram.</p>
        </Alert>
      ) : null}

      <div role="table" aria-label="Colunas da planilha" className="flex flex-col">
        <div role="row" className={cn(GRADE, 'hidden rounded-lg bg-surfacesunken px-3 py-2 text-xs font-medium text-muted-foreground lg:grid')}>
          <span role="columnheader">Coluna da planilha</span>
          <span role="columnheader">Primeira linha</span>
          <span role="columnheader">Vai para</span>
        </div>
        {analise.colunas.map((coluna) => {
          const destino = destinos[coluna.indice] ?? 'nao'
          const fora = destino === 'nao'
          return (
            <div key={coluna.indice} role="row" className={cn(GRADE, 'items-center border-b border-border px-0 py-3 last:border-b-0 lg:px-3 lg:py-2')}>
              <span role="cell" title={coluna.nome} className={cn('line-clamp-2 break-words text-sm sm:col-start-1 sm:row-start-1', fora ? 'font-medium text-muted-foreground' : 'font-semibold text-heading')}>
                {coluna.nome}
              </span>
              <span
                role="cell"
                title={coluna.exemplo || undefined}
                className="line-clamp-2 break-words text-sm text-muted-foreground sm:col-start-1 sm:row-start-2 lg:col-start-2 lg:row-start-1"
              >
                {coluna.exemplo || '—'}
              </span>
              <span role="cell" className="pt-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:pt-0 lg:col-start-3 lg:row-span-1">
                <ListaNativa aria-label={`Destino da coluna ${coluna.nome}`} value={destino} onChange={(evento) => aoMudarDestino(coluna.indice, evento.target.value as Destino)}>
                  {DESTINOS.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </ListaNativa>
              </span>
            </div>
          )
        })}
      </div>

      {semNome ? (
        <p id={`${id}-sem-nome`} role="alert" className="flex items-center gap-2 text-sm font-medium text-warningtext">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          Escolha a coluna do nome.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={aoTrocarArquivo}>
          Voltar
        </Button>
        <Button disabled={bloqueada} aria-describedby={semNome ? `${id}-sem-nome` : undefined} onClick={aoVerPrevia}>
          Ver prévia
        </Button>
      </div>
    </Card>
  )
}
