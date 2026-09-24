import { Camera, ScanLine, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ehCodigoValido, navegadorLeCodigoBarras } from '@/domain/codigoBarras.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface LeitorCodigoProps {
  readonly aoLer: (codigo: string) => void
  readonly ocupado?: boolean
}

interface DetectorDeCodigo {
  detect(fonte: CanvasImageSource): Promise<readonly { readonly rawValue: string }[]>
}

/**
 * Lê o código de barras pela câmera quando o navegador sabe fazer isso sozinho,
 * e sempre aceita o código digitado à mão, que é o caminho que funciona em qualquer aparelho.
 */
export function LeitorCodigo({ aoLer, ocupado = false }: LeitorCodigoProps) {
  const [digitado, setDigitado] = useState('')
  const [camera, setCamera] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pararRef = useRef<(() => void) | null>(null)

  const temCamera = navegadorLeCodigoBarras()

  useEffect(() => {
    if (!camera) return
    let ativo = true
    let fluxo: MediaStream | null = null
    let timer = 0

    const iniciar = async () => {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const video = videoRef.current
        if (!video || !ativo) return
        video.srcObject = fluxo
        await video.play()

        const Detector = (globalThis as unknown as { BarcodeDetector: new (o: { formats: string[] }) => DetectorDeCodigo }).BarcodeDetector
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })

        const procurar = async () => {
          if (!ativo || !videoRef.current) return
          try {
            const achados = await detector.detect(videoRef.current)
            const codigo = achados[0]?.rawValue
            if (codigo) {
              parar()
              aoLer(codigo)
              return
            }
          } catch {
            // quadro ruim: tenta no próximo
          }
          timer = window.setTimeout(() => void procurar(), 300)
        }
        void procurar()
      } catch {
        setErro('Não consegui abrir a câmera. Digite o código que está embaixo das barras.')
        setCamera(false)
      }
    }

    const parar = () => {
      ativo = false
      window.clearTimeout(timer)
      fluxo?.getTracks().forEach((t) => t.stop())
      setCamera(false)
    }
    pararRef.current = parar

    void iniciar()
    return parar
  }, [camera, aoLer])

  const enviarDigitado = () => {
    const codigo = digitado.replace(/\D/g, '')
    if (!ehCodigoValido(codigo)) {
      setErro('Esse número não parece um código de barras válido. Confira os dígitos.')
      return
    }
    setErro(null)
    aoLer(codigo)
  }

  return (
    <div className="flex flex-col gap-3 border border-border bg-muted p-4">
      <div className="flex items-center gap-2">
        <ScanLine className="size-4 text-primary" aria-hidden="true" />
        <h3 className="card-title text-sm">Ler pelo código de barras</h3>
      </div>

      {camera ? (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} className="w-full max-w-sm border border-borderdefault" muted playsInline aria-label="Câmera lendo o código de barras" />
          <Button variant="ghost" size="sm" className="self-start" onClick={() => pararRef.current?.()}>
            Parar câmera
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <CampoTexto rotulo="Código de barras" valor={digitado} aoMudar={setDigitado} numerico placeholder="7891000100103" />
          </div>
          <Button onClick={enviarDigitado} disabled={ocupado || digitado.trim() === ''}>
            {ocupado ? 'Procurando…' : 'Procurar produto'}
          </Button>
          {temCamera ? (
            <Button variant="outline" onClick={() => setCamera(true)}>
              <Camera aria-hidden="true" />
              Usar a câmera
            </Button>
          ) : null}
        </div>
      )}

      {erro ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{erro}</p>
        </Alert>
      ) : null}

      {temCamera ? null : (
        <p className="text-xs text-muted-foreground">Este navegador não lê a câmera. No celular, use o Chrome para escanear, ou digite o número.</p>
      )}
    </div>
  )
}
