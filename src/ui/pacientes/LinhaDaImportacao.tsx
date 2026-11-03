import { FileSpreadsheet, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { importacoesRecentes, pacientesQueSaem, rotuloDaImportacao, textoDoDesfeito } from '@/domain/importar/importacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useAcompanhamentosOpcional } from '../estado/contextoAcompanhamentos.ts'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'

interface LinhaDaImportacaoProps {
  readonly agora: Date
}

/**
 * D-913 e DP-IP-20: por 24 horas, no topo de Pacientes, uma linha por importação que ainda tem quem desfazer:
 * "Importação de hoje, 14:32 · 5 pacientes · Desfazer". O "Desfazer" tira os que não mudaram, sem pergunta: nada que a
 * nutricionista mexeu se perde. Depois disso, a linha vira "Importação desfeita." (e quantos ficaram).
 */
export function LinhaDaImportacao({ agora }: LinhaDaImportacaoProps) {
  const { pacientes, repositorio, atualizar } = usePacientes()
  const { casos, repositorio: repoCasos } = useCasos()
  const acompanhamentos = useAcompanhamentosOpcional()?.acompanhamentos ?? null
  const [desfeita, setDesfeita] = useState<string | null>(null)
  const recentes = importacoesRecentes(pacientes, casos, acompanhamentos ?? [], agora)

  const desfazer = (importacaoId: string) => {
    const { saem, ficam } = pacientesQueSaem(importacaoId, repositorio.listar(), repoCasos.listar(), acompanhamentos ?? [])
    repositorio.excluirVarios(saem)
    atualizar()
    setDesfeita(textoDoDesfeito(ficam))
  }

  if (recentes.length === 0 && desfeita === null) return null

  return (
    <div className="flex flex-col gap-3">
      {desfeita !== null ? (
        <p role="status" className="rounded-2xl bg-card px-4 py-3 text-sm text-foreground sm:px-5">
          {desfeita}
        </p>
      ) : null}
      {recentes.map((importacao) => {
        const rotulo = rotuloDaImportacao(importacao.em, agora)
        return (
          <div key={importacao.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-card px-4 py-2 sm:px-5">
            <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold text-heading">{rotulo}</span>
              <span className="numeros text-muted-foreground max-sm:block">
                <span className="max-sm:hidden"> · </span>
                {`${importacao.pacientes.toLocaleString('pt-BR')} ${importacao.pacientes === 1 ? 'paciente' : 'pacientes'}`}
              </span>
            </p>
            <Button variant="ghost" size="sm" aria-label={`Desfazer a ${rotulo.charAt(0).toLowerCase()}${rotulo.slice(1)}`} onClick={() => desfazer(importacao.id)}>
              <Undo2 aria-hidden="true" />
              Desfazer
            </Button>
          </div>
        )
      })}
    </div>
  )
}
