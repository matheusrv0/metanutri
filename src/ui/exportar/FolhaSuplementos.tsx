import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { assinaturaDoDocumento, ehProposta, tituloDoDocumento } from '@/domain/documentoDoPaciente.ts'
import { descreverSuplemento, suplementosParaDocumento, type Suplemento } from '@/domain/suplementos.ts'
import { FolhaDocumento } from './FolhaDocumento.tsx'

interface FolhaSuplementosProps {
  readonly paciente: string
  readonly suplementos: readonly Suplemento[]
  readonly assinatura: AssinaturaDoPlano | null
  /** A data do dia, AAAA-MM-DD. */
  readonly data: string
}

/** A folha de suplementação (CA-576): o nome em destaque, a dose, o horário e por quanto tempo, e a observação. */
export function FolhaSuplementos({ paciente, suplementos, assinatura, data }: FolhaSuplementosProps) {
  const proposta = ehProposta(assinatura)
  return (
    <FolhaDocumento titulo={tituloDoDocumento('suplementos', proposta)} paciente={paciente} data={data} assinatura={assinaturaDoDocumento(assinatura)} proposta={proposta}>
      <ol className="flex flex-col">
        {suplementosParaDocumento(suplementos).map((s) => {
          const linha = descreverSuplemento(s)
          const observacao = s.observacao.trim()
          return (
            <li key={s.id} className="flex break-inside-avoid flex-col gap-1 border-b border-border py-3 last:border-0">
              <strong className="text-lg font-bold leading-snug text-heading">{s.nome.trim()}</strong>
              {linha ? <span>{linha}</span> : null}
              {observacao ? <span className="whitespace-pre-wrap break-words text-muted-foreground">{observacao}</span> : null}
            </li>
          )
        })}
      </ol>
    </FolhaDocumento>
  )
}
