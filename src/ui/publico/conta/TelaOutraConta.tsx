import { useState } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaOutraContaProps {
  readonly email: string
  readonly aoSair: () => void
  readonly aoApagar: () => void
}

/**
 * Outra conta entrou num aparelho que já tem dono (spec estilo-spora, CA-152 e CA-153).
 * Nenhum plano ou paciente aparece antes da escolha, e apagar pede confirmação.
 */
export function TelaOutraConta({ email, aoSair, aoApagar }: TelaOutraContaProps) {
  const [confirmando, setConfirmando] = useState(false)
  return (
    <MolduraConta
      titulo="Este aparelho tem dados de outra conta"
      subtitulo={`Você entrou como ${email}. Os planos e pacientes guardados aqui são de outra conta e, por isso, não aparecem.`}
      aoIrParaInicio={aoSair}
    >
      {confirmando ? (
        <AvisoFormulario tipo="erro">
          <p>Vão ser apagados deste aparelho os planos, pacientes, produtos, modelos e acompanhamentos da outra conta. Não tem volta, a menos que exista um backup.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" onClick={aoApagar}>
              Apagar e continuar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
          </div>
        </AvisoFormulario>
      ) : (
        <div className="flex flex-col gap-3">
          <Button size="lg" block onClick={aoSair}>
            Sair e entrar com a outra conta
          </Button>
          <Button variant="outline" size="lg" block onClick={() => setConfirmando(true)}>
            Apagar os dados deste aparelho e continuar
          </Button>
        </div>
      )}
    </MolduraConta>
  )
}
