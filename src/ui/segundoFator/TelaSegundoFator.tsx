import { useId, useRef, useState, type FormEvent } from 'react'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CODIGO_INCOMPLETO, DIGITOS_DO_APP, type ValorSegundoFator } from '../estado/usarSegundoFator.ts'
import { AvisoFormulario } from '../publico/conta/AvisoFormulario.tsx'
import { CampoCodigo } from '../publico/conta/CampoCodigo.tsx'
import { ChaveDoApp } from './ChaveDoApp.tsx'

/**
 * O passo do app autenticador em Negócio e Aprovações (spec seguranca-lote-5, D-261): o cadastro com o código
 * QR, ou só o código. Confirmado o código, quem chama relê o perfil e a tela pedida aparece no lugar desta.
 */
export function TelaSegundoFator({ segundoFator }: { readonly segundoFator: ValorSegundoFator }) {
  const id = useId()
  const { etapa } = segundoFator
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo (CB-267): o estado só muda no próximo render.
  const enviandoRef = useRef(false)

  if (etapa.tipo === 'carregando') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Preparando a verificação…
      </p>
    )
  }

  if (etapa.tipo === 'falhou') {
    return (
      <Card className="max-w-md">
        <AvisoFormulario tipo="erro">{etapa.mensagem}</AvisoFormulario>
        <Button variant="outline" size="lg" className="self-start" onClick={segundoFator.tentarDeNovo}>
          Tentar de novo
        </Button>
      </Card>
    )
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    // CA-838: incompleto não vai ao servidor.
    if (codigo.length !== DIGITOS_DO_APP) {
      setErro(CODIGO_INCOMPLETO)
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    const falha = await segundoFator.confirmar(codigo)
    enviandoRef.current = false
    setEnviando(false)
    // CA-837 e CB-263: só o aviso muda; o código fica no campo.
    if (falha !== null) setErro(falha)
  }

  const cadastrando = etapa.tipo === 'cadastrar'
  const formulario = (
    <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
      {cadastrando ? (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-foreground marker:font-semibold marker:text-muted-foreground">
          <li>Abra o app autenticador do celular (Google Authenticator, Microsoft Authenticator ou outro) e leia o código QR.</li>
          <li>Digite o código de {DIGITOS_DO_APP} dígitos que aparece no app.</li>
        </ol>
      ) : null}
      <CampoCodigo id={`${id}-codigo`} valor={codigo} aoMudar={setCodigo} invalido={erro !== null} digitos={DIGITOS_DO_APP} />
      {erro !== null ? <AvisoFormulario tipo="erro">{erro}</AvisoFormulario> : null}
      <Button type="submit" size="lg" block loading={enviando}>
        {cadastrando ? 'Ativar' : 'Confirmar'}
      </Button>
    </form>
  )

  if (etapa.tipo === 'confirmar') {
    return (
      <Card className="max-w-md">
        <CardTitle>Digite o código do app autenticador</CardTitle>
        {formulario}
      </Card>
    )
  }

  return (
    <Card className="max-w-3xl">
      <div className="flex flex-col gap-1.5">
        <CardTitle>Ative a verificação em duas etapas</CardTitle>
        <p className="text-sm text-muted-foreground">Estas telas mostram dados de todas as contas e pedem, além da senha, o código de um app autenticador.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        {/* O código QR precisa de fundo branco nos dois temas: a câmera do app não lê o desenho sobre o escuro. */}
        <img
          src={etapa.qr}
          alt="Código QR para o app autenticador"
          width={176}
          height={176}
          className="size-44 justify-self-center rounded-2xl bg-white p-1 ring-1 ring-border ring-inset sm:justify-self-start"
        />
        {formulario}
      </div>
      <ChaveDoApp chave={etapa.chave} />
    </Card>
  )
}
