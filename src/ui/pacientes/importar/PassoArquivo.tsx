import { FileSpreadsheet, LoaderCircle, TriangleAlert, Upload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent, type Ref } from 'react'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button, buttonVariants } from '@ds/componentes/forms/button.tsx'
import { cn } from '@ds/lib/cn.ts'
import { useMediaQuery } from '../../estado/usarMediaQuery.ts'

/** O seletor mostra planilhas; o .xls, o .ods e o .numbers entram para receber a frase de como salvar (D-901). */
const ACEITA = [
  '.csv',
  '.txt',
  '.tsv',
  '.xlsx',
  '.xls',
  '.ods',
  '.numbers',
  'text/csv',
  'text/plain',
  'text/tab-separated-values',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
].join(',')

/** D-917: os sete destinos, com o que é obrigatório e o que aceita várias colunas. */
const COLUNAS_QUE_ENTRAM: readonly (readonly [string, string | null])[] = [
  ['Nome', 'obrigatória'],
  ['Sexo', null],
  ['Data de nascimento', null],
  ['Telefone', null],
  ['E-mail', null],
  ['Objetivo', null],
  ['Observações', 'aceita várias'],
]

interface PassoArquivoProps {
  readonly lendo: boolean
  readonly recusa: string | null
  readonly aoEscolher: (arquivo: File) => void
  readonly aoCancelarLeitura: () => void
  readonly tituloRef: Ref<HTMLHeadingElement>
}

const temArquivos = (evento: DragEvent): boolean => Array.from(evento.dataTransfer?.types ?? []).includes('Files')

/**
 * Passo 1 (D-900, D-917): a área de soltar, com "Escolher arquivo" (o campo de arquivo de verdade, que o teclado
 * alcança e abre com Enter ou Espaço, CA-1947) e, ao lado, as colunas que entram. A leitura mostra "Lendo a
 * planilha…" e "Cancelar" (CB-911); a recusa diz o que fazer (D-917). O lugar das duas é reservado: nada pula.
 */
export function PassoArquivo({ lendo, recusa, aoEscolher, aoCancelarLeitura, tituloRef }: PassoArquivoProps) {
  const id = useId()
  const [sobre, setSobre] = useState(false)
  // O arrastar entra e sai de cada filho da área: conta as entradas para não piscar.
  const entradas = useRef(0)
  // DP-IP-24: no celular não há o que soltar.
  const celular = useMediaQuery('(max-width: 639px)')

  const entrar = (evento: DragEvent) => {
    if (!temArquivos(evento) || lendo) return
    evento.preventDefault()
    entradas.current += 1
    setSobre(true)
  }
  const sair = () => {
    entradas.current = Math.max(0, entradas.current - 1)
    if (entradas.current === 0) setSobre(false)
  }
  const soltar = (evento: DragEvent) => {
    if (!temArquivos(evento)) return
    evento.preventDefault()
    entradas.current = 0
    setSobre(false)
    const escolhido = evento.dataTransfer.files[0]
    if (escolhido && !lendo) aoEscolher(escolhido)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section
        aria-labelledby={`${id}-titulo`}
        onDragEnter={entrar}
        onDragOver={(evento) => {
          if (temArquivos(evento) && !lendo) {
            evento.preventDefault()
            evento.dataTransfer.dropEffect = 'copy'
          }
        }}
        onDragLeave={sair}
        onDrop={soltar}
        className={cn(
          'flex min-h-80 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition-colors duration-150 sm:min-h-96 sm:px-8',
          sobre ? 'border-primary bg-lightprimary' : 'border-borderstrong bg-card',
        )}
      >
        <span aria-hidden="true" className={cn('grid size-14 place-content-center rounded-2xl text-primary transition-colors duration-150', sobre ? 'bg-card' : 'bg-lightprimary')}>
          <FileSpreadsheet className="size-7" strokeWidth={1.75} />
        </span>
        <h2 id={`${id}-titulo`} ref={tituloRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-heading focus:outline-none">
          {celular ? 'Escolha a planilha' : 'Solte a planilha aqui'}
        </h2>
        <label
          className={cn(
            buttonVariants({ size: 'lg' }),
            'cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
            lendo && 'pointer-events-none opacity-50',
          )}
        >
          <Upload aria-hidden="true" />
          Escolher arquivo
          <input
            type="file"
            accept={ACEITA}
            disabled={lendo}
            className="sr-only"
            onChange={(evento) => {
              const escolhido = evento.target.files?.[0]
              // O mesmo arquivo escolhido de novo (depois de corrigido) também dispara a leitura.
              evento.target.value = ''
              if (escolhido) aoEscolher(escolhido)
            }}
          />
        </label>
        <p className="max-w-[44ch] text-sm text-muted-foreground">CSV ou XLSX, até 2.000 linhas. O arquivo não sai deste computador.</p>
        <div className="flex min-h-11 w-full max-w-md flex-col items-center justify-center">
          {lendo ? (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <LoaderCircle aria-hidden="true" className="size-4 text-primary motion-safe:animate-spin" />
                Lendo a planilha…
              </p>
              <Button variant="ghost" size="sm" aria-label="Cancelar a leitura" onClick={aoCancelarLeitura}>
                Cancelar
              </Button>
            </div>
          ) : recusa ? (
            <Alert variant="warning" role="alert" className="text-left">
              <TriangleAlert aria-hidden="true" />
              <p>{recusa}</p>
            </Alert>
          ) : null}
        </div>
      </section>

      <Card role="region" aria-labelledby={`${id}-entram`} className="gap-3">
        <h2 id={`${id}-entram`} className="card-title">
          Colunas que entram
        </h2>
        <ul className="flex flex-col">
          {COLUNAS_QUE_ENTRAM.map(([nome, nota]) => (
            <li key={nome} className="flex min-h-10 items-center justify-between gap-3 border-t border-border text-sm text-foreground first:border-t-0">
              {nome}
              {nota ? <span className="text-xs text-muted-foreground">{nota}</span> : null}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">As outras ficam de fora.</p>
      </Card>
    </div>
  )
}
