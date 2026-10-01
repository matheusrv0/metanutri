import { TriangleAlert } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { diasParaCorrigir, exportacaoBloqueada, MENSAGEM_ERRO_SITUACAO, normalizarNumeroCrn, validarCrn, type Crn, type PerfilConta } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoCrn } from '../publico/conta/CampoCrn.tsx'

interface AvisoCrnProps {
  readonly perfil: PerfilConta
  readonly agora: Date
  readonly aoCorrigir: (crn: Crn) => Promise<string | null>
}

/** CA-289 e CA-290: o CRN que você não achou no conselho, com o prazo e a correção. */
export function AvisoCrn({ perfil, agora, aoCorrigir }: AvisoCrnProps) {
  const id = useId()
  const [regiao, setRegiao] = useState<number | null>(perfil.crn?.regiao ?? null)
  const [numero, setNumero] = useState(perfil.crn?.numero ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  if (perfil.statusCrn !== 'nao_encontrado') return null
  const dias = diasParaCorrigir(perfil, agora) ?? 0
  const bloqueado = exportacaoBloqueada(perfil, agora)

  const corrigir = async () => {
    if (enviandoRef.current) return
    const problema = validarCrn(regiao, numero)
    if (problema || regiao === null) {
      setErro(MENSAGEM_ERRO_SITUACAO[problema ?? 'crn-regiao'])
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    const falha = await aoCorrigir({ regiao, numero: normalizarNumeroCrn(numero) })
    enviandoRef.current = false
    setEnviando(false)
    setErro(falha)
  }

  return (
    <section aria-label="CRN" className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-content-center rounded-md bg-lighterror text-errortext">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-titulo text-base font-semibold text-heading">Não encontramos seu CRN no conselho</p>
          <p className="text-sm text-muted-foreground">
            {bloqueado
              ? 'Exportar documentos está bloqueado até você corrigir o CRN.'
              : `Confira o número. Você tem ${dias} ${dias === 1 ? 'dia' : 'dias'} para corrigir; depois disso, exportar documentos fica bloqueado.`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <CampoCrn
            id={id}
            regiao={regiao}
            numero={numero}
            aoMudar={(crn) => {
              setRegiao(crn.regiao)
              setNumero(crn.numero)
            }}
            invalido={erro !== null}
          />
        </div>
        <Button onClick={() => void corrigir()} loading={enviando}>
          Corrigir CRN
        </Button>
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-errortext">
          {erro}
        </p>
      ) : null}
    </section>
  )
}
