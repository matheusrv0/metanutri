import { useEffect, useId, useState } from 'react'
import { ehEmailValido, MENSAGEM_ERRO, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaConfirmarEmailProps {
  readonly conta: ValorConta
  /** O e-mail do cadastro recém-feito. `null` quando a página foi aberta de novo. */
  readonly email: string | null
  readonly vencido: boolean
  readonly aoIrParaInicio: () => void
  readonly aoEntrar: () => void
}

const ESPERA_S = 60

/** Confira seu e-mail e o link vencido (spec estilo-spora, US-1.5). */
export function TelaConfirmarEmail({ conta, email, vencido, aoIrParaInicio, aoEntrar }: TelaConfirmarEmailProps) {
  const id = useId()
  const [digitado, setDigitado] = useState(email ?? '')
  const [espera, setEspera] = useState(0)
  const [resultado, setResultado] = useState<'nada' | 'enviado' | ErroConta>('nada')

  useEffect(() => {
    if (espera <= 0) return
    const relogio = globalThis.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => globalThis.clearTimeout(relogio)
  }, [espera])

  const reenviar = async () => {
    if (!ehEmailValido(digitado)) {
      setResultado('email-invalido')
      return
    }
    const r = await conta.reenviarConfirmacao(digitado)
    setResultado(r.ok ? 'enviado' : (r.erro ?? 'falha-rede'))
    if (r.ok) setEspera(ESPERA_S)
  }

  const rotuloBotao = espera > 0 ? `Reenviar em ${espera} s` : vencido ? 'Mandar outro link' : 'Reenviar o link'

  return (
    <MolduraConta
      titulo={vencido ? 'Este link não vale mais' : 'Confira seu e-mail'}
      subtitulo={
        vencido
          ? 'O link de confirmação venceu ou já foi usado. Peça outro abaixo.'
          : `Mandamos um link para ${email ?? 'o seu e-mail'}. Clique nele para ativar a conta. Não chegou? Olhe a caixa de spam.`
      }
      aoIrParaInicio={aoIrParaInicio}
    >
      {email === null ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input id={`${id}-email`} type="email" autoComplete="email" value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder="voce@exemplo.com" />
        </div>
      ) : null}

      {resultado === 'enviado' ? <AvisoFormulario tipo="ok">Mandamos outro link para {digitado.trim()}.</AvisoFormulario> : null}
      {resultado !== 'nada' && resultado !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[resultado]}</AvisoFormulario> : null}

      <Button variant={vencido ? 'default' : 'outline'} size="lg" block disabled={espera > 0} onClick={() => void reenviar()}>
        {rotuloBotao}
      </Button>
      <button type="button" onClick={aoEntrar} className="inline-flex min-h-11 items-center self-center rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline">
        Já confirmei, quero entrar
      </button>
    </MolduraConta>
  )
}
