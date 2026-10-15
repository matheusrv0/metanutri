import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { assinaturaDoDocumento, ehProposta, tituloDoDocumento } from '@/domain/documentoDoPaciente.ts'
import { linhasDoPedido, type PedidoExames } from '@/domain/exames.ts'
import { FolhaDocumento } from './FolhaDocumento.tsx'

interface FolhaExamesProps {
  readonly paciente: string
  readonly pedido: PedidoExames
  readonly assinatura: AssinaturaDoPlano | null
  /** A data do dia, AAAA-MM-DD. */
  readonly data: string
}

/** A folha de solicitação de exames (CA-580): os marcados na ordem da lista e as linhas de "Outros exames". */
export function FolhaExames({ paciente, pedido, assinatura, data }: FolhaExamesProps) {
  const proposta = ehProposta(assinatura)
  return (
    <FolhaDocumento titulo={tituloDoDocumento('exames', proposta)} paciente={paciente} data={data} assinatura={assinaturaDoDocumento(assinatura)} proposta={proposta}>
      <ul className="flex flex-col gap-2 text-base">
        {linhasDoPedido(pedido).map((linha, i) => (
          <li key={`${i}-${linha}`} className="flex items-start gap-2.5 break-words">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground" />
            <span className="min-w-0">{linha}</span>
          </li>
        ))}
      </ul>
    </FolhaDocumento>
  )
}
