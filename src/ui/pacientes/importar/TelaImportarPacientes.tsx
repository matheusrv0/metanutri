import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { mudarDestino } from '@/domain/importar/colunas.ts'
import { lerPlanilha } from '@/domain/importar/lerPlanilha.ts'
import { textoDaRecusa } from '@/domain/importar/textos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Passos } from '@ds/componentes/navigation/Passos.tsx'
import { useArmazenamento } from '../../estado/contextoArmazenamento.ts'
import { comAba, comPlanilha, ESTADO_INICIAL, maisAdiante, PASSOS, type EstadoDaImportacao, type Passo } from './estadoDaImportacao.ts'
import { PassoArquivo } from './PassoArquivo.tsx'
import { PassoColunas } from './PassoColunas.tsx'
import { esquecerRascunho, guardarRascunho, lerRascunho } from './rascunhoDaImportacao.ts'

/**
 * A moldura da área de trabalho (menu, cabeçalho com o título "Importar planilha" e as ações), como função: o elemento
 * que ela devolve é sempre o mesmo componente, e a tela não remonta quando a área de trabalho se redesenha.
 */
export type MolduraDaImportacao = (acoes: ReactNode, conteudo: ReactNode) => ReactNode

interface TelaImportarPacientesProps {
  readonly moldura: MolduraDaImportacao
  /** Volta a Pacientes: "Cancelar", "Ver pacientes". */
  readonly aoSair: () => void
}

/**
 * Importar pacientes por planilha (spec importar-pacientes): Arquivo, Colunas e Prévia, e a conclusão. O estado fica no
 * rascunho da conta, na memória da aba (DP-IP-23); a planilha não sai do navegador (D-914).
 */
export function TelaImportarPacientes({ moldura, aoSair }: TelaImportarPacientesProps) {
  const armazenamento = useArmazenamento()
  const [estado, setEstado] = useState<EstadoDaImportacao>(() => lerRascunho(armazenamento) ?? ESTADO_INICIAL)
  const [lendo, setLendo] = useState(false)
  const [recusa, setRecusa] = useState<string | null>(null)
  const leitura = useRef<AbortController | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const passoAnterior = useRef(estado.passo)

  const mudar = useCallback(
    (mudanca: (atual: EstadoDaImportacao) => EstadoDaImportacao) => {
      setEstado((atual) => {
        const novo = mudanca(atual)
        guardarRascunho(armazenamento, novo)
        return novo
      })
    },
    [armazenamento],
  )

  // CA-1947: cada passo leva o foco ao título dele (não na primeira abertura: aí o foco é do conteúdo da página).
  useEffect(() => {
    if (passoAnterior.current === estado.passo) return
    passoAnterior.current = estado.passo
    titulo.current?.focus()
  }, [estado.passo])

  // A leitura em andamento para quando a tela sai (CB-916).
  useEffect(() => () => leitura.current?.abort(), [])

  // DP-IP-25: o arquivo solto fora da área não abre no navegador, que trocaria de página e perderia a prévia.
  useEffect(() => {
    const segurar = (evento: DragEvent) => {
      if (Array.from(evento.dataTransfer?.types ?? []).includes('Files')) evento.preventDefault()
    }
    window.addEventListener('dragover', segurar)
    window.addEventListener('drop', segurar)
    return () => {
      window.removeEventListener('dragover', segurar)
      window.removeEventListener('drop', segurar)
    }
  }, [])

  const ler = async (arquivo: File) => {
    leitura.current?.abort()
    const controle = new AbortController()
    leitura.current = controle
    setRecusa(null)
    setLendo(true)
    const resultado = await lerPlanilha({ nome: arquivo.name, tamanho: arquivo.size, bytes: () => arquivo.arrayBuffer() }, { sinal: controle.signal })
    if (controle.signal.aborted) return
    leitura.current = null
    setLendo(false)
    if (resultado.tipo === 'recusada') setRecusa(textoDaRecusa(resultado.recusa))
    else if (resultado.tipo === 'lida') mudar(() => comPlanilha(arquivo.name, resultado.planilha))
  }

  const cancelarLeitura = () => {
    leitura.current?.abort()
    leitura.current = null
    setLendo(false)
  }

  const sair = () => {
    leitura.current?.abort()
    esquecerRascunho(armazenamento)
    aoSair()
  }

  const irPara = (passo: Passo) => mudar((atual) => ({ ...atual, passo, alcancado: maisAdiante(atual.alcancado, passo) }))
  const alcancados = PASSOS.map((p) => p.valor).filter((p) => estado.planilha !== null && maisAdiante(estado.alcancado, p) === estado.alcancado)

  const acoes =
    estado.passo === 'concluida' ? null : (
      <Button variant="outline" size="sm" onClick={sair}>
        Cancelar
      </Button>
    )

  return moldura(
    acoes,
    <div className="flex flex-col gap-6">
        {estado.passo === 'concluida' ? null : (
          <Passos rotulo="Passos da importação" passos={PASSOS} atual={estado.passo} alcancados={alcancados} aoEscolher={irPara} />
        )}
        {estado.passo === 'arquivo' ? (
          <PassoArquivo lendo={lendo} recusa={recusa} aoEscolher={(arquivo) => void ler(arquivo)} aoCancelarLeitura={cancelarLeitura} tituloRef={titulo} />
        ) : estado.passo === 'colunas' && estado.planilha ? (
          <PassoColunas
            planilha={estado.planilha}
            aba={estado.aba}
            destinos={estado.destinos}
            aoEscolherAba={(aba) => mudar((atual) => comAba(atual, aba))}
            aoMudarDestino={(indice, destino) => mudar((atual) => ({ ...atual, destinos: mudarDestino(atual.destinos, indice, destino), aviso: null }))}
            aoTrocarArquivo={() => irPara('arquivo')}
            aoVerPrevia={() => irPara('previa')}
            tituloRef={titulo}
          />
        ) : estado.passo === 'previa' ? (
          <section aria-labelledby="importar-previa">
            <h2 id="importar-previa" ref={titulo} tabIndex={-1} className="sr-only">
              Prévia
            </h2>
          </section>
        ) : null}
    </div>,
  )
}
