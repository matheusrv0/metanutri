import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { Ref } from 'react'
import { LINHAS_POR_PAGINA, type Correcao, type Previa } from '@/domain/importar/previa.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CaixaDeMarcar } from '@ds/componentes/forms/CaixaDeMarcar.tsx'
import { cn } from '@ds/lib/cn.ts'
import type { AvisoDaPrevia } from './estadoDaImportacao.ts'
import { GRADE_DA_PREVIA, LinhaDaPrevia } from './LinhaDaPrevia.tsx'

interface PassoPreviaProps {
  readonly previa: Previa
  readonly paginas: number
  readonly aviso: AvisoDaPrevia | null
  readonly aoMarcar: (numero: number, marcada: boolean) => void
  readonly aoMarcarTodas: (marcadas: boolean) => void
  readonly aoCorrigir: (numero: number, mudanca: Correcao) => void
  readonly aoMostrarMais: () => void
  readonly aoVoltar: () => void
  readonly aoImportar: () => void
  readonly tituloRef: Ref<HTMLHeadingElement>
}

const quantos = (n: number, um: string, varios: string): string => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

/**
 * Passo 3 (D-908, D-909): as contas, os avisos e cada linha com o número dela na planilha, o que vai entrar e o motivo do
 * que não vai. "Importar N pacientes" conta as marcadas (CA-1927). Acima de 50 linhas, 50 por vez (CA-1931).
 */
export function PassoPrevia({ previa, paginas, aviso, aoMarcar, aoMarcarTodas, aoCorrigir, aoMostrarMais, aoVoltar, aoImportar, tituloRef }: PassoPreviaProps) {
  const visiveis = previa.linhas.slice(0, paginas * LINHAS_POR_PAGINA)
  const restantes = previa.linhas.length - visiveis.length
  const marcaveis = previa.linhas.filter((l) => l.podeMarcar)
  const todas = marcaveis.length > 0 && marcaveis.every((l) => l.marcada) ? true : marcaveis.some((l) => l.marcada) ? 'misto' : false
  const semNome = previa.semNome.length

  return (
    <Card className="gap-5">
      <h2 ref={tituloRef} tabIndex={-1} className="sr-only">
        Prévia
      </h2>

      <div role="status" aria-label="Contas da prévia" className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <p className="flex items-baseline gap-2">
          <strong className="numeros text-3xl font-bold tracking-tight text-successtext">{previa.prontos.toLocaleString('pt-BR')}</strong>{' '}
          <span className="text-sm text-foreground">{previa.prontos === 1 ? 'pronto para importar' : 'prontos para importar'}</span>
        </p>
        <p className="flex items-baseline gap-2">
          <strong className={cn('numeros text-3xl font-bold tracking-tight', previa.comProblema > 0 ? 'text-warningtext' : 'text-muted-foreground')}>
            {previa.comProblema.toLocaleString('pt-BR')}
          </strong>{' '}
          <span className="text-sm text-foreground">com problema</span>
        </p>
      </div>

      {aviso?.tipo === 'mudou' ? (
        <Alert variant="warning" role="alert">
          <TriangleAlert aria-hidden="true" />
          <p>A lista de pacientes mudou. Confira a prévia antes de importar.</p>
        </Alert>
      ) : aviso?.tipo === 'nao-cabe' ? (
        <Alert variant="error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>{`Não cabe na conta: cabem mais ${quantos(aviso.cabem, 'paciente', 'pacientes')}.`}</p>
        </Alert>
      ) : null}
      {previa.todasNaConta ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <p>Nada para importar: todos já estão na conta.</p>
        </Alert>
      ) : null}
      {previa.mesDia ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <p>Datas lidas como mês/dia.</p>
        </Alert>
      ) : null}
      {semNome > 0 ? <p className="text-sm text-muted-foreground">{semNome === 1 ? '1 linha sem nome ficou de fora.' : `${quantos(semNome, 'linha', 'linhas')} sem nome ficaram de fora.`}</p> : null}

      {marcaveis.length > 0 ? (
        <CaixaDeMarcar rotulo="Marcar todas" marcada={todas} aoMudar={aoMarcarTodas} className="self-start font-medium" />
      ) : null}

      <div role="table" aria-label="Linhas da planilha" className="-mt-2 flex flex-col">
        <div role="row" className={cn(GRADE_DA_PREVIA, 'hidden items-center rounded-lg bg-surfacesunken px-1 py-2 text-xs font-medium text-muted-foreground lg:grid')}>
          <span role="columnheader">
            <span className="sr-only">Importar</span>
          </span>
          <span role="columnheader">Linha</span>
          <span role="columnheader">Nome</span>
          <span role="columnheader">Sexo</span>
          <span role="columnheader">Nascimento</span>
          <span role="columnheader">Telefone</span>
          <span role="columnheader">Situação</span>
        </div>
        {visiveis.map((linha) => (
          <LinhaDaPrevia key={linha.numero} linha={linha} aoMarcar={aoMarcar} aoCorrigir={aoCorrigir} />
        ))}
      </div>

      {restantes > 0 ? (
        <Button variant="outline" className="self-center" onClick={aoMostrarMais}>
          {`Mostrar mais ${Math.min(LINHAS_POR_PAGINA, restantes)}`}
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={aoVoltar}>
          Voltar
        </Button>
        {previa.todasNaConta ? null : (
          <Button disabled={previa.prontos === 0} onClick={aoImportar}>
            {`Importar ${quantos(previa.prontos, 'paciente', 'pacientes')}`}
          </Button>
        )}
      </div>
    </Card>
  )
}
