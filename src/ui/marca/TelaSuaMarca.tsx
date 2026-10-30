// Conta e assinatura › Sua marca (spec marca-no-link, D-950 a D-963): a logo e a cor que o link do paciente mostra, com
// a prévia do link num celular claro e num escuro. Um "Salvar" para tudo (D-962): a prévia muda ao vivo, e o link do
// paciente só muda depois de salvar.
import { Check, CircleAlert, ImageOff, ImageUp, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { avaliarCor, COR_PADRAO, CORES_PRONTAS, codigoDaCor, ehCorPadrao, formatarContraste } from '@/domain/corDaMarca.ts'
import { AVISO_LOGO_CLARA, conferirArquivoDeLogo, ehLogoPublicavel, ERROS_DA_LOGO, prepararLogo, tipoDaLogoGuardada, type Desenhista } from '@/domain/logoDaMarca.ts'
import type { MarcaDoLink } from '@/domain/marca.ts'
import { gravarPerfil, lerPerfil, type Perfil } from '@/domain/perfil.ts'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { PlacaLogo } from '@ds/componentes/display/PlacaLogo.tsx'
import { Button, buttonVariants } from '@ds/componentes/forms/button.tsx'
import { CampoCor } from '@ds/componentes/forms/CampoCor.tsx'
import { EscolhaDeCor } from '@ds/componentes/forms/EscolhaDeCor.tsx'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useOutraAbaGravou } from '../estado/usarOutraAba.ts'
import { useGuardaDeSaida, type GuardaDeSaida } from '../usarRota.ts'
import { desenhistaDoNavegador } from './desenhistaDoNavegador.ts'
import { PreviaDoLink } from './PreviaDoLink.tsx'

/** D-963: os textos da tela (mínimos, sem tagline). */
const TEXTOS_DA_MARCA = {
  ajudaDaLogo: 'PNG, JPG, WebP ou SVG, até 2 MB. Também sai no plano impresso.',
  valeParaTodos: 'Vale para todos os links já enviados.',
  sairSemSalvar: 'Sair sem salvar a marca?',
} as const

const TIPOS_ACEITOS = 'image/png,image/jpeg,image/webp,image/svg+xml'

interface TelaSuaMarcaProps {
  /** Quem desenha a logo em PNG; o do navegador, fora dos testes. */
  readonly desenhista?: Desenhista
  /**
   * Grava a marca publicada (D-952). Devolve o motivo traduzido, ou nulo quando gravou. Nulo sem servidor (modo local):
   * aí "Salvar" grava só o perfil (DP-ML-11).
   */
  readonly publicar: ((marca: MarcaDoLink) => Promise<string | null>) | null
}

type Envio = { readonly tipo: 'parado' } | { readonly tipo: 'salvando' } | { readonly tipo: 'salvo' } | { readonly tipo: 'falhou'; readonly motivo: string }

/** O arquivo como data URI, como o navegador o lê. */
function lerComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onload = () => (typeof leitor.result === 'string' ? resolver(leitor.result) : rejeitar(new Error('sem conteúdo')))
    leitor.onerror = () => rejeitar(leitor.error ?? new Error('leitura'))
    leitor.readAsDataURL(arquivo)
  })
}

export function TelaSuaMarca({ desenhista = desenhistaDoNavegador, publicar }: TelaSuaMarcaProps) {
  const armazenamento = useArmazenamento()
  const [perfil, setPerfil] = useState<Perfil>(() => lerPerfil(armazenamento))
  const [logo, setLogo] = useState<string | null>(perfil.logo)
  const [cor, setCor] = useState<string | null>(perfil.cor)
  const [logoClara, setLogoClara] = useState(false)
  const [erroDaLogo, setErroDaLogo] = useState<string | null>(null)
  const [lendoLogo, setLendoLogo] = useState(false)
  const [envio, setEnvio] = useState<Envio>({ tipo: 'parado' })
  const [saidaPendente, setSaidaPendente] = useState<(() => void) | null>(null)
  const [hoje] = useState(() => diaLocal())
  const idTituloLogo = useId()
  const idTituloCor = useId()
  const idDaCor = useId()

  // CB-124 e CB-955: outra aba (ou outro aparelho, pela nuvem) gravou o perfil: a base de comparação se refaz.
  const relerPerfil = useCallback(() => setPerfil(lerPerfil(armazenamento)), [armazenamento])
  useOutraAbaGravou('metanutri:perfil', relerPerfil)

  const corEscolhida = cor ?? COR_PADRAO
  const avaliacao = avaliarCor(corEscolhida)
  // CA-1964: o que a pessoa mudou nesta tela e ainda não salvou.
  const mudouAqui = logo !== perfil.logo || cor !== perfil.cor
  // DP-ML-10: a marca que já existe (a logo de Configurações) e nunca foi para o link também se salva.
  const naoPublicada = !perfil.marcaPublicada && (perfil.logo !== null || perfil.cor !== null)
  const mudou = mudouAqui || naoPublicada
  const salvando = envio.tipo === 'salvando'
  const podeSalvar = mudou && avaliacao.aceita && !salvando && !lendoLogo

  const mudar = () => {
    if (envio.tipo !== 'salvando') setEnvio({ tipo: 'parado' })
  }

  const escolherCor = (nova: string) => {
    // CB-960: a padrão, escolhida ou digitada, é "sem cor própria".
    setCor(ehCorPadrao(nova) ? null : nova)
    mudar()
  }

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return
    const conferido = conferirArquivoDeLogo({ nome: arquivo.name, tipo: arquivo.type, bytes: arquivo.size })
    if (conferido.tipo === 'erro') {
      setErroDaLogo(conferido.mensagem)
      return
    }
    setLendoLogo(true)
    setErroDaLogo(null)
    try {
      const dataUrl = await lerComoDataUrl(arquivo)
      const pronta = await prepararLogo({ dataUrl, mime: conferido.mime }, desenhista)
      if (pronta.tipo === 'erro') {
        setErroDaLogo(pronta.mensagem)
        return
      }
      setLogo(pronta.logo)
      setLogoClara(pronta.clara)
      mudar()
    } catch {
      setErroDaLogo(ERROS_DA_LOGO.leitura)
    } finally {
      setLendoLogo(false)
    }
  }

  const removerLogo = () => {
    setLogo(null)
    setLogoClara(false)
    setErroDaLogo(null)
    mudar()
  }

  /** DP-ML-12: a logo antiga (a de Configurações, nunca publicada) passa pela mesma redução no primeiro "Salvar". */
  const logoParaGuardar = async (): Promise<{ readonly logo: string | null } | { readonly erro: string }> => {
    if (logo === null) return { logo: null }
    const antiga = logo === perfil.logo && !perfil.marcaPublicada
    if (!antiga && ehLogoPublicavel(logo)) return { logo }
    const mime = tipoDaLogoGuardada(logo)
    if (mime === null) return { erro: ERROS_DA_LOGO.leitura }
    const pronta = await prepararLogo({ dataUrl: logo, mime }, desenhista)
    return pronta.tipo === 'ok' ? { logo: pronta.logo } : { erro: pronta.mensagem }
  }

  const salvar = async () => {
    if (!podeSalvar) return
    setEnvio({ tipo: 'salvando' })
    const guardada = await logoParaGuardar()
    if ('erro' in guardada) {
      setErroDaLogo(guardada.erro)
      setEnvio({ tipo: 'parado' })
      return
    }
    const marca: MarcaDoLink = { logo: guardada.logo, cor }
    // DP-ML-11: primeiro a nuvem; recusada ou sem resposta, nada muda aqui.
    const motivo = publicar ? await publicar(marca) : null
    if (motivo !== null) {
      setEnvio({ tipo: 'falhou', motivo })
      return
    }
    const novo: Perfil = { ...lerPerfil(armazenamento), logo: marca.logo, cor: marca.cor, marcaPublicada: true }
    gravarPerfil(armazenamento, novo)
    setPerfil(novo)
    setLogo(marca.logo)
    setEnvio({ tipo: 'salvo' })
  }

  // CA-1964: com mudança não salva, sair pergunta antes; o voltar do navegador e fechar a aba também.
  const segurarSaida = useCallback<GuardaDeSaida>((seguir) => {
    setSaidaPendente(() => seguir)
    return false
  }, [])
  useGuardaDeSaida(mudouAqui, segurarSaida)
  useEffect(() => {
    if (!mudouAqui) return
    const aoFechar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
      evento.returnValue = ''
    }
    globalThis.addEventListener('beforeunload', aoFechar)
    return () => globalThis.removeEventListener('beforeunload', aoFechar)
  }, [mudouAqui])

  const marcaDaPrevia: MarcaDoLink = { logo, cor }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,23.75rem)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader className="border-b-0 pb-0">
            <CardTitle id={idTituloLogo}>Logo</CardTitle>
          </CardHeader>
          {logo ? (
            <PlacaLogo src={logo} alt="Sua logo" tamanho="grande" />
          ) : (
            <div className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-borderstrong bg-surfacesunken text-sm text-muted-foreground">
              <ImageOff className="size-4" aria-hidden="true" />
              Sem logo
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {/* O seletor de arquivo é um <input> dentro de um <label> com a cara do botão suave do sistema: o rótulo é o
                nome do campo ("Enviar logo"), e o foco do teclado aparece no rótulo. */}
            <label
              aria-busy={lendoLogo || undefined}
              className={cn(
                buttonVariants({ variant: 'soft' }),
                'cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
                lendoLogo && 'pointer-events-none opacity-50',
              )}
            >
              {lendoLogo ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ImageUp aria-hidden="true" />}
              {logo ? 'Trocar logo' : 'Enviar logo'}
              <input
                type="file"
                accept={TIPOS_ACEITOS}
                className="sr-only"
                disabled={lendoLogo}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0]
                  // O mesmo arquivo escolhido de novo também conta.
                  e.target.value = ''
                  void escolherArquivo(arquivo)
                }}
              />
            </label>
            {logo ? (
              <Button variant="ghost" onClick={removerLogo}>
                Remover
              </Button>
            ) : null}
          </div>
          {erroDaLogo ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-errortext">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {erroDaLogo}
            </p>
          ) : logoClara && logo ? (
            <p role="status" className="flex items-start gap-2 text-sm text-warningtext">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {AVISO_LOGO_CLARA}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{TEXTOS_DA_MARCA.ajudaDaLogo}</p>
        </Card>

        <Card>
          <CardHeader className="border-b-0 pb-0">
            <CardTitle id={idTituloCor}>Cor</CardTitle>
          </CardHeader>
          <EscolhaDeCor rotuloId={idTituloCor} opcoes={CORES_PRONTAS} valor={corEscolhida} aoEscolher={escolherCor} />
          <CampoCor rotulo="Outra cor" valor={corEscolhida} aoEscolher={escolherCor} descricaoId={idDaCor} />
          <div id={idDaCor} aria-live="polite">
            {avaliacao.aceita ? (
              <p className="text-sm text-muted-foreground">
                Contraste <strong className="numeros font-semibold text-foreground">{formatarContraste(avaliacao.contraste)}:1</strong>
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-md border border-warning/40 bg-lightwarning px-3.5 py-3 text-sm text-warningtext">
                <p className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{`Contraste ${formatarContraste(avaliacao.contraste)}:1 com o texto branco. O mínimo é 4,5:1.`}</span>
                </p>
                <Button variant="outline" size="sm" className="self-start" onClick={() => escolherCor(avaliacao.sugestao)}>
                  <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-inset ring-border" style={{ backgroundColor: avaliacao.sugestao }} />
                  {`Usar ${codigoDaCor(avaliacao.sugestao)}`}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button onClick={() => void salvar()} disabled={!podeSalvar} loading={salvando}>
            Salvar
          </Button>
          <div role="status" className="flex min-w-0 flex-1 basis-40 items-center">
            {envio.tipo === 'salvo' ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-successtext">
                <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
                Salvo
              </span>
            ) : mudou ? (
              <span className="text-sm text-muted-foreground">{TEXTOS_DA_MARCA.valeParaTodos}</span>
            ) : null}
          </div>
          {envio.tipo === 'falhou' ? (
            <p role="alert" className="flex w-full items-start gap-2 text-sm text-errortext">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {envio.motivo}
            </p>
          ) : null}
        </div>
      </div>

      <PreviaDoLink marca={marcaDaPrevia} hoje={hoje} className={cn('lg:sticky lg:top-6')} />

      <Dialog open={saidaPendente !== null} onOpenChange={(aberta) => !aberta && setSaidaPendente(null)}>
        <DialogContent role="alertdialog" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{TEXTOS_DA_MARCA.sairSemSalvar}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaidaPendente(null)} autoFocus>
              Continuar aqui
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const seguir = saidaPendente
                setSaidaPendente(null)
                seguir?.()
              }}
            >
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
