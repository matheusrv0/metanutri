import { CircleAlert, Columns2, LoaderCircle, Lock, Paperclip, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import {
  ANEXOS_POR_AVALIACAO,
  ANGULOS,
  anguloSugerido,
  bytesUsados,
  comArquivo,
  enviarAnexo,
  enviarFoto,
  FOTO_ENVIO_MAX_BYTES,
  FOTOS_POR_AVALIACAO,
  FRASES,
  lerPastaDoPlano,
  NOME_DO_ANGULO,
  religarSoltos,
  TETO_DA_AVALIACAO,
  textoDoUso,
  textosPeloSexo,
  type EnvioDoAnexo,
} from '@/domain/fotosDaAvaliacao.ts'
import type { AvaliacaoDoHistorico } from '@/domain/historicoAntropometrico.ts'
import type { AnguloDaFoto, ArquivoDaAvaliacao, Caso, DadosDaAvaliacao, Sexo } from '@/domain/tipos.ts'
import { Card } from '@ds/componentes/display/card.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { buttonVariants } from '@ds/componentes/forms/button.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CaixaDeMarcar } from '@ds/componentes/forms/CaixaDeMarcar.tsx'
import { cn } from '@ds/lib/cn.ts'
import { useArmazenamentoDeFotos } from './armazenamentoDeFotos.ts'
import { CompararFotos } from './CompararFotos.tsx'
import { DialogoExcluirArquivo, type ArquivoAExcluir } from './DialogoExcluirArquivo.tsx'
import { Escolha } from './Escolha.tsx'
import { ListaDeAnexos } from './ListaDeAnexos.tsx'
import { ListaDeFotos } from './ListaDeFotos.tsx'
import { useDesenhistaDeFoto } from './reduzirFoto.ts'

interface CartaoFotosProps {
  /** O plano como está gravado: é sobre ele que as mudanças se aplicam. */
  readonly bruto: Caso
  /** O sexo da ficha, para o texto (D-1508). */
  readonly sexo: Sexo | null
  /** A avaliação aberta e a de antes com foto (D-1510), para "Comparar fotos". */
  readonly atual: AvaliacaoDoHistorico
  readonly anterior: AvaliacaoDoHistorico | null
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly agora: Date
}

const OPCOES_DO_ANGULO = ANGULOS.map((valor) => ({ valor, rotulo: valor === 'outra' ? 'Outra foto' : `Foto de ${NOME_DO_ANGULO[valor].toLocaleLowerCase('pt-BR')}` }))
/** O seletor de arquivo tem a cara do botão contornado do sistema; o foco do teclado aparece no rótulo. */
const BOTAO_DE_ARQUIVO = cn(
  buttonVariants({ variant: 'outline', size: 'sm' }),
  'cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
  'has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50',
)
const ACEITA_FOTO = '.jpg,.jpeg,.png,image/jpeg,image/png'
const ACEITA_ANEXO = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

/** Os bytes do começo do arquivo, até `limite` (um a mais que o teto, para a conferência saber que passou). */
const lerBytes = async (arquivo: File, limite: number): Promise<Uint8Array> => new Uint8Array(await arquivo.slice(0, limite).arrayBuffer())

/**
 * "Fotos e anexos" da avaliação (spec antropometria-telas, F2: D-1450 a D-1459 e D-1503 a D-1513). A foto só com a
 * autorização marcada, reduzida no aparelho e guardada no balde privado; o anexo para ler numa aba; "Comparar fotos"
 * com a avaliação de antes. Nada sai da ficha: sem compartilhar, sem baixar, sem documento (CFN 599/2018, art. 58).
 */
export function CartaoFotos({ bruto, sexo, atual, anterior, aoAlterar, agora }: CartaoFotosProps) {
  const armazenamento = useArmazenamentoDeFotos()
  const desenhista = useDesenhistaDeFoto()
  const idTitulo = useId()
  const idMarque = useId()
  const [anguloEscolhido, escolherAngulo] = useState<AnguloDaFoto | null>(null)
  const [comparando, setComparando] = useState(false)
  const [enviando, setEnviando] = useState<'foto' | 'anexo' | null>(null)
  const [erroDaFoto, setErroDaFoto] = useState<string | null>(null)
  const [erroDoAnexo, setErroDoAnexo] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<ArquivoAExcluir>(null)

  // O envio termina depois de alguns segundos: a lista é acrescentada ao plano como ele está nessa hora, não como estava
  // quando a foto foi escolhida (outra mudança pode ter vindo no meio).
  const ultimo = useRef({ bruto, aoAlterar })
  useEffect(() => {
    ultimo.current = { bruto, aoAlterar }
  })
  const alterarAvaliacao = (mudar: (avaliacao: DadosDaAvaliacao) => Partial<DadosDaAvaliacao>) => {
    const { bruto: plano, aoAlterar: alterar } = ultimo.current
    alterar({ avaliacao: { ...plano.avaliacao, ...mudar(plano.avaliacao) } })
  }

  // D-1534: ao abrir, o arquivo que está na pasta do plano e não na lista (o envio cuja lista se perdeu) volta para a
  // lista, para aparecer e poder sair; senão ocuparia a vaga escondido. Aplica no plano como ele está quando a leitura
  // chega, e só se ainda for o mesmo plano.
  const planoId = bruto.id
  useEffect(() => {
    if (armazenamento === null) return
    let vivo = true
    void lerPastaDoPlano(armazenamento, planoId).then((lidos) => {
      const { bruto: plano, aoAlterar: alterar } = ultimo.current
      if (!vivo || lidos === null || plano.id !== planoId) return
      const religados = religarSoltos(plano.avaliacao, lidos, new Date())
      if (religados) alterar({ avaliacao: { ...plano.avaliacao, ...religados } })
    })
    return () => {
      vivo = false
    }
  }, [armazenamento, planoId])

  const avaliacao = bruto.avaliacao
  const fotos = avaliacao.fotos ?? []
  const anexos = avaliacao.anexos ?? []
  const textos = textosPeloSexo(sexo)
  const titulo = (
    <h2 id={idTitulo} className="card-title leading-tight">
      Fotos e anexos
    </h2>
  )

  // D-1459 e CA-2490: sem nuvem, os arquivos não têm onde ficar.
  if (armazenamento === null) {
    return (
      <section aria-labelledby={idTitulo}>
        <Card className="gap-3">
          {titulo}
          <p className="text-sm text-muted-foreground">{FRASES.semNuvem}</p>
        </Card>
      </section>
    )
  }

  const autorizadaEm = avaliacao.fotosAutorizadasEm
  const angulo = anguloEscolhido ?? anguloSugerido(fotos)
  const fotosCheias = fotos.length >= FOTOS_POR_AVALIACAO
  const anexosCheios = anexos.length >= ANEXOS_POR_AVALIACAO
  const usados = bytesUsados(avaliacao)

  const receber = (resultado: EnvioDoAnexo, erro: (texto: string | null) => void) => {
    if (resultado.tipo === 'erro') {
      erro(resultado.mensagem)
      return
    }
    const { campo, arquivo } = resultado
    alterarAvaliacao((av) => ({ [campo]: comArquivo(av[campo], arquivo) }))
  }

  const escolherFoto = async (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    // O mesmo arquivo escolhido de novo também conta.
    evento.target.value = ''
    if (!arquivo) return
    setErroDaFoto(null)
    setEnviando('foto')
    try {
      const bytes = await lerBytes(arquivo, FOTO_ENVIO_MAX_BYTES + 1)
      const resultado = await enviarFoto(
        { plano: bruto.id, angulo, bytes, arquivo, avaliacao: ultimo.current.bruto.avaliacao, agora: new Date(), gerarId: () => globalThis.crypto.randomUUID() },
        armazenamento,
        desenhista,
      )
      receber(resultado.tipo === 'ok' ? { ...resultado, campo: 'fotos' } : resultado, setErroDaFoto)
      if (resultado.tipo === 'ok') escolherAngulo(null)
    } finally {
      setEnviando(null)
    }
  }

  const escolherAnexo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setErroDoAnexo(null)
    setEnviando('anexo')
    try {
      // D-1530: a imagem anexada vira foto, e a foto vai até 20 MB antes de reduzir.
      const bytes = await lerBytes(arquivo, FOTO_ENVIO_MAX_BYTES + 1)
      const resultado = await enviarAnexo(
        { plano: bruto.id, sexo, bytes, arquivo, avaliacao: ultimo.current.bruto.avaliacao, agora: new Date(), gerarId: () => globalThis.crypto.randomUUID() },
        armazenamento,
        desenhista,
      )
      receber(resultado, setErroDoAnexo)
    } finally {
      setEnviando(null)
    }
  }

  const abrirAnexo = async (anexo: ArquivoDaAvaliacao) => {
    setErroDoAnexo(null)
    // A aba abre no clique (o navegador não deixa abrir depois de esperar o servidor) e recebe o link assinado depois.
    const aba = globalThis.open('about:blank', '_blank')
    if (aba) aba.opener = null
    const url = await armazenamento.assinar(anexo.caminho)
    if (url && aba) {
      aba.location.replace(url)
      return
    }
    aba?.close()
    setErroDoAnexo(FRASES.abrirAnexo)
  }

  const confirmarExclusao = async () => {
    const alvo = excluindo
    setExcluindo(null)
    if (alvo === null) return
    const avisar = alvo.tipo === 'foto' ? setErroDaFoto : setErroDoAnexo
    avisar(null)
    if (!(await armazenamento.apagar([alvo.arquivo.caminho]))) {
      avisar(FRASES.excluir)
      return
    }
    const campo = alvo.tipo === 'foto' ? 'fotos' : 'anexos'
    alterarAvaliacao((av) => ({ [campo]: (av[campo] ?? []).filter((a) => a.id !== alvo.arquivo.id) }))
  }

  const fotoDesligada = autorizadaEm === null || fotosCheias || enviando !== null

  return (
    <section aria-labelledby={idTitulo}>
      <Card className="gap-4">
        <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
          {titulo}
          <span className="numeros ml-auto text-xs text-muted-foreground">{`${fotos.length} de ${FOTOS_POR_AVALIACAO} fotos`}</span>
        </div>

        <CaixaDeMarcar
          className="items-start"
          rotulo={
            <>
              {textos.autorizou}
              {autorizadaEm ? (
                <>
                  {' '}
                  <span className="text-muted-foreground">{`· registrado em ${dataCompleta(autorizadaEm)}`}</span>
                </>
              ) : null}
            </>
          }
          marcada={autorizadaEm !== null}
          aoMudar={(marcada) => alterarAvaliacao(() => ({ fotosAutorizadasEm: marcada ? diaLocal(agora) : null }))}
        />

        <div className="flex flex-wrap items-end gap-2">
          <Escolha<AnguloDaFoto>
            rotulo="Ângulo da foto"
            rotuloOculto
            compacto
            className="w-40"
            opcoes={OPCOES_DO_ANGULO}
            valor={angulo}
            aoEscolher={escolherAngulo}
            desativado={fotoDesligada}
          />
          <label className={BOTAO_DE_ARQUIVO} aria-busy={enviando === 'foto' || undefined}>
            {enviando === 'foto' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            Adicionar foto
            <input
              type="file"
              accept={ACEITA_FOTO}
              className="sr-only"
              disabled={fotoDesligada}
              aria-describedby={autorizadaEm === null ? idMarque : undefined}
              onChange={(e) => void escolherFoto(e)}
            />
          </label>
          {/* D-1538: o rótulo troca ("Comparar fotos" e "Ver fotos de hoje"); com isso, sem aria-pressed. */}
          <Button variant="outline" size="sm" onClick={() => setComparando((c) => !c)}>
            <Columns2 aria-hidden="true" />
            {comparando ? 'Ver fotos de hoje' : 'Comparar fotos'}
          </Button>
        </div>
        {autorizadaEm === null ? (
          <p id={idMarque} className="text-sm text-muted-foreground">
            {textos.marque}
          </p>
        ) : null}
        {erroDaFoto ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-errortext">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {erroDaFoto}
            </p>
          ) : null}

        {comparando ? (
          anterior ? (
            <CompararFotos armazenamento={armazenamento} anterior={anterior} atual={atual} />
          ) : (
            <p className="text-sm text-muted-foreground">{FRASES.semOutra}</p>
          )
        ) : (
          <ListaDeFotos armazenamento={armazenamento} fotos={fotos} data={atual.data} aoExcluir={(arquivo) => setExcluindo({ tipo: 'foto', arquivo })} />
        )}

        <p className="text-xs text-muted-foreground">{FRASES.regras}</p>
        <p className="flex items-start gap-2.5 rounded-md bg-surfacesunken px-3.5 py-3 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{textos.lembrete}</span>
        </p>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-heading">Anexos</h3>
            <label className={cn(BOTAO_DE_ARQUIVO, 'ml-auto')} aria-busy={enviando === 'anexo' || undefined}>
              {enviando === 'anexo' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />}
              Adicionar arquivo
              <input type="file" accept={ACEITA_ANEXO} className="sr-only" disabled={anexosCheios || enviando !== null} onChange={(e) => void escolherAnexo(e)} />
            </label>
          </div>
          {anexosCheios ? <p className="text-sm text-muted-foreground">{FRASES.dezDeDez}</p> : null}
          {erroDoAnexo ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-errortext">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {erroDoAnexo}
            </p>
          ) : null}
          <ListaDeAnexos anexos={anexos} aoAbrir={(anexo) => void abrirAnexo(anexo)} aoExcluir={(arquivo) => setExcluindo({ tipo: 'anexo', arquivo })} />
          <div className="flex flex-col gap-1.5 pt-1">
            <Progress value={(usados / TETO_DA_AVALIACAO) * 100} aria-label="Espaço usado" />
            <span className="numeros text-xs text-muted-foreground">{textoDoUso(usados)}</span>
          </div>
        </div>
      </Card>
      <DialogoExcluirArquivo alvo={excluindo} aoConfirmar={() => void confirmarExclusao()} aoFechar={() => setExcluindo(null)} />
    </section>
  )
}
