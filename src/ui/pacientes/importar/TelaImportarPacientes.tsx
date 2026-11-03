import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import { mudarDestino, temNome } from '@/domain/importar/colunas.ts'
import { prepararImportacao } from '@/domain/importar/criar.ts'
import { csvDasQueFicaramDeFora, linhasDeFora } from '@/domain/importar/csvDeFora.ts'
import { pacientesQueSaem } from '@/domain/importar/importacao.ts'
import { lerPlanilha } from '@/domain/importar/lerPlanilha.ts'
import { corrigir, marcarTodas, montarPrevia, type EntradaDaPrevia } from '@/domain/importar/previa.ts'
import { textoDaRecusa } from '@/domain/importar/textos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Passos } from '@ds/componentes/navigation/Passos.tsx'
import { useAcompanhamentosOpcional } from '../../estado/contextoAcompanhamentos.ts'
import { useArmazenamento } from '../../estado/contextoArmazenamento.ts'
import { useCasos } from '../../estado/contextoCasos.ts'
import { baixarBlob } from '../../exportar/baixar.ts'
import { ConclusaoDaImportacao } from './ConclusaoDaImportacao.tsx'
import { usePacientes } from '../../estado/contextoPacientes.ts'
import { comAba, comPlanilha, ESTADO_INICIAL, maisAdiante, PASSOS, type EstadoDaImportacao, type Passo } from './estadoDaImportacao.ts'
import { PassoArquivo } from './PassoArquivo.tsx'
import { PassoColunas } from './PassoColunas.tsx'
import { PassoPrevia } from './PassoPrevia.tsx'
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
  const { pacientes, repositorio, atualizar } = usePacientes()
  const { repositorio: repoCasos } = useCasos()
  const acompanhamentos = useAcompanhamentosOpcional()?.acompanhamentos ?? null
  // O dia de hoje, para a data futura ser inválida (D-908).
  const [hoje] = useState(() => diaLocal(new Date()))
  const [estado, setEstado] = useState<EstadoDaImportacao>(() => lerRascunho(armazenamento) ?? ESTADO_INICIAL)
  const [lendo, setLendo] = useState(false)
  const [recusa, setRecusa] = useState<string | null>(null)
  const leitura = useRef<AbortController | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  // O título que recebe o foco muda com o passo e com o "Desfazer" (CA-1947).
  const chaveDoTitulo = `${estado.passo}:${estado.resultado?.desfeita ? 'desfeita' : ''}`
  const tituloAnterior = useRef(chaveDoTitulo)

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
    if (tituloAnterior.current === chaveDoTitulo) return
    tituloAnterior.current = chaveDoTitulo
    titulo.current?.focus()
  }, [chaveDoTitulo])

  // A leitura em andamento para quando a tela sai (CB-916). Depois de importar, a planilha não fica na memória: quem volta
  // a "Importar planilha" começa de novo, e o "Desfazer" continua na linha das 24 horas em Pacientes (D-913).
  useEffect(
    () => () => {
      leitura.current?.abort()
      if (lerRascunho(armazenamento)?.passo === 'concluida') esquecerRascunho(armazenamento)
    },
    [armazenamento],
  )

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

  // A prévia é refeita do estado a cada mudança (CA-1932): o mapeamento, as correções, as marcas e a lista da conta.
  const naConta = useMemo(() => pacientes.map((p) => ({ nome: p.nome, nascimento: p.nascimento })), [pacientes])
  const analise = estado.planilha?.lida.abas[estado.aba]?.analise ?? null
  const entradaDe = useCallback(
    (atual: EstadoDaImportacao): EntradaDaPrevia | null => {
      const daAba = atual.planilha?.lida.abas[atual.aba]?.analise
      return daAba ? { linhas: daAba.linhas, colunas: daAba.colunas, destinos: atual.destinos, correcoes: atual.correcoes, marcas: atual.marcas, pacientes: naConta, hoje } : null
    },
    [naConta, hoje],
  )
  const previa = useMemo(() => {
    const entrada = entradaDe(estado)
    return entrada && estado.passo === 'previa' ? montarPrevia(entrada) : null
  }, [entradaDe, estado])

  const marcar = useCallback((numero: number, marcada: boolean) => mudar((atual) => ({ ...atual, marcas: { ...atual.marcas, [numero]: marcada }, aviso: null })), [mudar])
  const corrigirLinha = useCallback(
    (numero: number, mudanca: Parameters<typeof corrigir>[2]) =>
      mudar((atual) => {
        const entrada = entradaDe(atual)
        return entrada ? { ...atual, ...corrigir(entrada, numero, mudanca), aviso: null } : atual
      }),
    [mudar, entradaDe],
  )

  /** D-910: confere de novo a lista da conta e o teto da cópia; só então cria todos de uma vez. */
  const importar = () => {
    const entrada = entradaDe(estado)
    if (!entrada || !previa) return
    const importacaoId = globalThis.crypto.randomUUID()
    const preparo = prepararImportacao({
      entrada,
      previaNaTela: previa,
      // DP-IP-30: a lista lida agora do armazenamento, não a que a tela tinha.
      pacientesAgora: repositorio.listar(),
      armazenamento,
      agora: new Date().toISOString(),
      importacaoId,
      gerarId: () => globalThis.crypto.randomUUID(),
    })
    if (preparo.tipo === 'mudou') {
      atualizar()
      mudar((atual) => ({ ...atual, aviso: { tipo: 'mudou' } }))
      return
    }
    if (preparo.tipo === 'nao-cabe') {
      mudar((atual) => ({ ...atual, aviso: { tipo: 'nao-cabe', cabem: preparo.cabem } }))
      return
    }
    repositorio.criarVarios(preparo.pacientes)
    atualizar()
    const importados = preparo.pacientes.map((p) => ({
      id: p.id,
      nome: p.nome,
      detalhe: [p.sexo, p.nascimento ? dataCompleta(p.nascimento) : null].filter(Boolean).join(' · ') || 'Sem sexo e sem data',
    }))
    mudar((atual) => ({ ...atual, passo: 'concluida', aviso: null, resultado: { importacaoId, importados, deFora: linhasDeFora(previa), desfeita: null } }))
  }

  /** D-913: tira os daquela importação que não mudaram; os outros ficam, e a tela diz quantos. */
  const desfazer = () => {
    const resultado = estado.resultado
    if (!resultado) return
    const { saem, ficam } = pacientesQueSaem(resultado.importacaoId, repositorio.listar(), repoCasos.listar(), acompanhamentos ?? [])
    repositorio.excluirVarios(saem)
    atualizar()
    mudar((atual) => (atual.resultado ? { ...atual, resultado: { ...atual.resultado, desfeita: { ficaram: ficam } } } : atual))
  }

  /** D-915: o CSV das que ficaram de fora, gerado aqui, com o separador do arquivo original. */
  const baixarDeFora = () => {
    if (!analise || !estado.planilha || !estado.resultado) return
    const texto = csvDasQueFicaramDeFora({ colunas: analise.colunas, linhas: analise.linhas, deFora: estado.resultado.deFora, separador: estado.planilha.lida.separador })
    baixarBlob(new Blob([texto], { type: 'text/csv;charset=utf-8' }), 'ficaram-de-fora.csv')
  }

  // CA-1914: sem coluna em Nome (ou com a aba acima do limite), a prévia não abre, nem pela barra de passos.
  const previaBarrada = (atual: EstadoDaImportacao): boolean => {
    const daAba = atual.planilha?.lida.abas[atual.aba]?.analise
    return !daAba || !temNome(atual.destinos) || daAba.excede
  }
  const irPara = (passo: Passo) =>
    mudar((atual) => (passo === 'previa' && previaBarrada(atual) ? atual : { ...atual, passo, alcancado: maisAdiante(atual.alcancado, passo) }))
  const alcancados = PASSOS.map((p) => p.valor).filter((p) => estado.planilha !== null && maisAdiante(estado.alcancado, p) === estado.alcancado)
  const bloqueados: readonly Passo[] = estado.passo !== 'previa' && previaBarrada(estado) ? ['previa'] : []

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
          <Passos rotulo="Passos da importação" passos={PASSOS} atual={estado.passo} alcancados={alcancados} bloqueados={bloqueados} aoEscolher={irPara} />
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
        ) : estado.passo === 'previa' && previa && analise ? (
          <PassoPrevia
            previa={previa}
            paginas={estado.paginas}
            aviso={estado.aviso}
            aoMarcar={marcar}
            aoMarcarTodas={(marcadas) => mudar((atual) => ({ ...atual, marcas: marcarTodas(previa, atual.marcas, marcadas), aviso: null }))}
            aoCorrigir={corrigirLinha}
            aoMostrarMais={() => mudar((atual) => ({ ...atual, paginas: atual.paginas + 1 }))}
            aoVoltar={() => irPara('colunas')}
            aoImportar={importar}
            tituloRef={titulo}
          />
        ) : estado.passo === 'concluida' && estado.resultado ? (
          <ConclusaoDaImportacao
            resultado={estado.resultado}
            aoDesfazer={desfazer}
            aoVerPacientes={sair}
            aoBaixarDeFora={baixarDeFora}
            aoEscolherOutro={() => mudar(() => ESTADO_INICIAL)}
            tituloRef={titulo}
          />
        ) : null}
    </div>,
  )
}
