import { Check, Download, Undo2 } from 'lucide-react'
import { useId, useState, type Ref } from 'react'
import type { LinhaDeFora } from '@/domain/importar/csvDeFora.ts'
import { LINHAS_POR_PAGINA } from '@/domain/importar/previa.ts'
import { textoDoDesfeito } from '@/domain/importar/importacao.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ResultadoDaImportacao } from './estadoDaImportacao.ts'

interface ConclusaoDaImportacaoProps {
  readonly resultado: ResultadoDaImportacao
  readonly aoDesfazer: () => void
  readonly aoVerPacientes: () => void
  readonly aoBaixarDeFora: () => void
  readonly aoEscolherOutro: () => void
  readonly tituloRef: Ref<HTMLHeadingElement>
}

const quantos = (n: number, um: string, varios: string): string => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

/** Os motivos que são problema da linha (âmbar); "Igual", "Já está na conta", "Desmarcada" e "Sem nome" são neutros. */
const ehProblema = (motivo: string): boolean => /^(Data inválida|Sexo )/.test(motivo)

/** Uma lista longa aparece 50 por vez, como a prévia (DP-IP-21). */
function usePaginas(total: number) {
  const [paginas, setPaginas] = useState(1)
  const visiveis = Math.min(total, paginas * LINHAS_POR_PAGINA)
  return { visiveis, restantes: total - visiveis, mais: () => setPaginas((p) => p + 1) }
}

function MostrarMais({ restantes, aoClicar }: { readonly restantes: number; readonly aoClicar: () => void }) {
  if (restantes <= 0) return null
  return (
    <Button variant="ghost" size="sm" className="self-start" onClick={aoClicar}>
      {`Mostrar mais ${Math.min(LINHAS_POR_PAGINA, restantes)}`}
    </Button>
  )
}

/**
 * A conclusão (D-913, D-915, D-917): quantos entraram, a frase do limite, quem entrou, quem ficou de fora e por quê,
 * "Baixar as que ficaram de fora", "Desfazer" e "Ver pacientes". Depois do "Desfazer", "Importação desfeita." e quantos
 * ficaram porque já foram mudados.
 */
export function ConclusaoDaImportacao({ resultado, aoDesfazer, aoVerPacientes, aoBaixarDeFora, aoEscolherOutro, tituloRef }: ConclusaoDaImportacaoProps) {
  const id = useId()
  const { importados, deFora, desfeita } = resultado
  const comNome = deFora.filter((l) => l.nome !== '')
  const semNome = deFora.length - comNome.length
  const listaDosImportados = usePaginas(importados.length)
  const listaDeFora = usePaginas(comNome.length)

  if (desfeita !== null) {
    const [primeira, ...resto] = textoDoDesfeito(desfeita.ficaram).split('. ')
    return (
      <Card role="region" aria-labelledby={`${id}-desfeita`} className="max-w-xl gap-4">
        <h2 id={`${id}-desfeita`} ref={tituloRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-heading focus:outline-none">
          {resto.length > 0 ? `${primeira}.` : primeira}
        </h2>
        {resto.length > 0 ? <p className="text-sm text-foreground">{resto.join('. ')}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={aoEscolherOutro}>
            Escolher outro arquivo
          </Button>
          <Button onClick={aoVerPacientes}>Ver pacientes</Button>
        </div>
      </Card>
    )
  }

  const titulo = quantos(importados.length, 'paciente importado', 'pacientes importados')

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
      <Card role="region" aria-labelledby={`${id}-titulo`} className="gap-4">
        <span aria-hidden="true" className="grid size-10 place-content-center rounded-full bg-lightsuccess text-successtext">
          <Check className="size-5" strokeWidth={2.5} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-titulo`} ref={tituloRef} tabIndex={-1} className="numeros text-xl font-semibold tracking-tight text-heading focus:outline-none">
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">Entram sem plano e não contam como ativos.</p>
        </div>
        <ul className="flex flex-col">
          {importados.slice(0, listaDosImportados.visiveis).map((paciente) => (
            <li key={paciente.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-t border-border py-2 first:border-t-0">
              <span title={paciente.nome} className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium text-heading">
                {paciente.nome}
              </span>
              <span className="numeros shrink-0 text-xs text-muted-foreground">{paciente.detalhe}</span>
            </li>
          ))}
        </ul>
        <MostrarMais restantes={listaDosImportados.restantes} aoClicar={listaDosImportados.mais} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button variant="outline" onClick={aoDesfazer}>
            <Undo2 aria-hidden="true" />
            Desfazer
          </Button>
          <Button onClick={aoVerPacientes}>Ver pacientes</Button>
        </div>
      </Card>

      {deFora.length > 0 ? (
        <Card role="region" aria-labelledby={`${id}-fora`} className="gap-4">
          <h2 id={`${id}-fora`} className="card-title">
            Ficaram de fora
          </h2>
          <ul className="flex flex-col">
            {comNome.slice(0, listaDeFora.visiveis).map((linha: LinhaDeFora) => (
              <li key={linha.numero} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0">
                <span title={linha.nome} className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium text-heading">
                  {linha.nome}
                </span>
                <Badge variant={ehProblema(linha.motivo) ? 'lightWarning' : 'muted'} className="whitespace-normal">
                  {linha.motivo}
                </Badge>
              </li>
            ))}
            {semNome > 0 && listaDeFora.restantes === 0 ? (
              <li className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0">
                <span className="text-sm font-medium text-muted-foreground">{quantos(semNome, 'linha sem nome', 'linhas sem nome')}</span>
                <Badge variant="muted">Sem nome</Badge>
              </li>
            ) : null}
          </ul>
          <MostrarMais restantes={listaDeFora.restantes} aoClicar={listaDeFora.mais} />
          <Button variant="outline" className="self-start" onClick={aoBaixarDeFora}>
            <Download aria-hidden="true" />
            Baixar as que ficaram de fora
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
