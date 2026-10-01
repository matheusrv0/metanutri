import { useState } from 'react'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'
import { AbaCrn } from './AbaCrn.tsx'
import { AbaEstudantes } from './AbaEstudantes.tsx'

type Aba = 'estudantes' | 'crn'

/** Aprovações: só para administrador (spec conta-e-verificacao, US-B8; protótipo "Aprovar estudantes" e "Conferir CRN"). */
export function TelaAprovacoes({ aprovacoes }: { readonly aprovacoes: ValorAprovacoes }) {
  const [aba, setAba] = useState<Aba>('estudantes')
  const { pendentes } = aprovacoes

  return (
    <div className="flex flex-col gap-5">
      <SeletorSegmentado<Aba>
        rotulo="Fila"
        valor={aba}
        aoEscolher={setAba}
        opcoes={[
          { valor: 'estudantes', rotulo: `Estudantes ${pendentes.estudantes}` },
          { valor: 'crn', rotulo: `CRN ${pendentes.crn}` },
        ]}
      />
      {aprovacoes.erro ? (
        <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
          {aprovacoes.erro}
        </p>
      ) : null}
      {aba === 'estudantes' ? (
        <AbaEstudantes pedidos={aprovacoes.pedidos} decidirPedido={aprovacoes.decidirPedido} abrirComprovante={aprovacoes.abrirComprovante} />
      ) : (
        <AbaCrn crns={aprovacoes.crns} decidirCrn={aprovacoes.decidirCrn} />
      )}
    </div>
  )
}
