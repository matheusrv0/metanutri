import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { assinaturaDoDocumento, ehProposta, tituloDoDocumento } from '@/domain/documentoDoPaciente.ts'
import { linhasDoPedido, type PedidoExames } from '@/domain/exames.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import { FolhaDocumento } from './FolhaDocumento.tsx'

interface FolhaExamesProps {
  readonly paciente: string
  /** Data de nascimento da ficha (AAAA-MM-DD), ou `null`: sem ela, a linha não sai. */
  readonly nascimento: string | null
  readonly pedido: PedidoExames
  readonly assinatura: AssinaturaDoPlano | null
  /** A data do dia, AAAA-MM-DD. */
  readonly data: string
}

/**
 * A folha de solicitação de exames (CA-580): a data de nascimento quando a ficha tem, os marcados na ordem da lista e
 * as linhas de "Outros exames".
 */
export function FolhaExames({ paciente, nascimento, pedido, assinatura, data }: FolhaExamesProps) {
  const proposta = ehProposta(assinatura)
  const nascidoEm = dataCompleta(nascimento)
  return (
    <FolhaDocumento titulo={tituloDoDocumento('exames', proposta)} paciente={paciente} data={data} assinatura={assinaturaDoDocumento(assinatura)} proposta={proposta}>
      {nascidoEm ? <p className="text-base">{`Data de nascimento: ${nascidoEm}`}</p> : null}
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
