import { ChevronsDownUp, ChevronsUpDown, Info, Pencil, TriangleAlert } from 'lucide-react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import {
  blocosDaFicha,
  CHAVE_ROTEIRO,
  dicaDaPergunta,
  gravarRoteiro,
  lerRoteiro,
  limparRoteiro,
  responder,
  resumoDoBloco,
  type CamposDoBloco,
  type IdBloco,
  type RoteiroAnamnese,
} from '@/domain/anamnese.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { FRASE_SEM_PERFIL, faltaPerfil, type PerfilDaFicha } from '@/domain/regrasDaFicha.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useOutraAbaGravou } from '../estado/usarOutraAba.ts'
import { CampoConsumoMensal } from './CampoConsumoMensal.tsx'
import { CamposDaAlimentacao } from './CamposDaAlimentacao.tsx'
import { CamposDaSaude } from './CamposDaSaude.tsx'
import { DialogoRoteiro } from './DialogoRoteiro.tsx'
import { ListaExamesRecentes } from './ListaExamesRecentes.tsx'
import { PerguntaDaAnamnese } from './PerguntaDaAnamnese.tsx'

interface AnamneseDaFichaProps {
  readonly paciente: Paciente
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
  /** Sexo, idade de hoje, gestação ou lactação e se já há plano: decide os blocos (spec ficha-unica, seção 3). */
  readonly perfil: PerfilDaFicha
  /** O dia de hoje (AAAA-MM-DD): vai com a resposta (D-358). */
  readonly hoje: string
  /** O resumo do último link do paciente, no bloco Retorno (CA-1064); `null` sem link. */
  readonly adesao?: string | null | undefined
}

/** Os blocos com campos da ficha (D-349): não somem por estar sem pergunta. */
const COM_CAMPOS: ReadonlySet<IdBloco> = new Set<IdBloco>(['motivo', 'saude', 'alimentacao'])
const EXAMES = 'exames-recentes'
const OUTRAS = 'outras-anotacoes'

const preenchido = (texto: string) => texto.trim() !== ''

/** Quantos campos da ficha cada bloco tem e quantos estão preenchidos, para o resumo (CA-1065). */
function camposDoBloco(id: IdBloco, paciente: Paciente): CamposDoBloco {
  const contar = (...valores: boolean[]) => ({ total: valores.length, preenchidos: valores.filter(Boolean).length })
  if (id === 'motivo') return contar(preenchido(paciente.objetivo))
  if (id === 'saude') return contar(paciente.doencas.length > 0 || preenchido(paciente.condicoesClinicas), preenchido(paciente.medicamentos))
  if (id === 'alimentacao') {
    const { oleoL, salKg, acucarKg } = paciente.consumoMensal
    return contar(paciente.restricoesMarcadas.length > 0 || preenchido(paciente.restricoes), oleoL !== null || salKg !== null || acucarKg !== null)
  }
  return { total: 0, preenchidos: 0 }
}

/**
 * A anamnese com roteiro (spec anamnese-e-prescricoes, US-AP1; spec ficha-unica, D-347 a D-349): os blocos na ordem do
 * PCN, só os que valem para a pessoa, todos recolhidos ao abrir, com o resumo à vista; os campos da ficha dentro do
 * bloco deles; Exames recentes e Outras anotações no fim. Quem usa leva a chave do paciente.
 */
export function AnamneseDaFicha({ paciente, aoAlterar, perfil, hoje, adesao = null }: AnamneseDaFichaProps) {
  const armazenamento = useArmazenamento()
  const [roteiro, setRoteiro] = useState<RoteiroAnamnese>(() => lerRoteiro(armazenamento))
  const [editando, setEditando] = useState(false)
  const [naoGuardou, setNaoGuardou] = useState(false)
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set())
  // CA-564: "Anamnese anterior" aparece quando a ficha abre com texto; não some no meio de uma edição.
  const [comAnamneseAnterior] = useState(() => paciente.anamnese.trim() !== '')
  const id = useId()

  // CB-124 (spec dados-na-nuvem): outra aba da conta salvou o roteiro; esta relê.
  const reler = useCallback(() => setRoteiro(lerRoteiro(armazenamento)), [armazenamento])
  useOutraAbaGravou(CHAVE_ROTEIRO, reler)

  // CA-565: a janela sempre parte do roteiro salvo mais recente. Sem armazenamento (CB-160), vale o desta página.
  const editarRoteiro = () => {
    if (!naoGuardou) setRoteiro(lerRoteiro(armazenamento))
    setEditando(true)
  }

  const salvarRoteiro = (novo: RoteiroAnamnese) => {
    const guardou = gravarRoteiro(armazenamento, novo)
    // CB-160: sem armazenamento, o roteiro vale até fechar a página.
    setRoteiro(guardou ? lerRoteiro(armazenamento) : limparRoteiro(novo))
    setNaoGuardou(!guardou)
    setEditando(false)
  }

  const blocos = blocosDaFicha(roteiro, paciente.respostasAnamnese, perfil, COM_CAMPOS)
  const todos = [...blocos.map((b) => b.id), EXAMES, OUTRAS]
  const tudoAberto = todos.every((b) => abertos.has(b))
  const alternar = (bloco: string) => (aberto: boolean) =>
    setAbertos((atuais) => {
      const novos = new Set(atuais)
      if (aberto) novos.add(bloco)
      else novos.delete(bloco)
      return novos
    })
  const temAnotacoes = preenchido(paciente.anamnese) || preenchido(paciente.observacoes)
  const exames = paciente.examesRecentes.length

  /** Os campos da ficha de cada bloco, antes ou depois das perguntas do roteiro. */
  const camposAntes = (bloco: IdBloco): ReactNode => {
    if (bloco === 'motivo') {
      return (
        <CampoTexto rotulo="Objetivo do paciente" valor={paciente.objetivo} aoMudar={(objetivo) => aoAlterar({ objetivo })} placeholder="Nas palavras do paciente…" />
      )
    }
    if (bloco === 'saude') return <CamposDaSaude paciente={paciente} idadeAnos={perfil.idadeAnos} aoAlterar={aoAlterar} />
    if (bloco === 'alimentacao') return <CamposDaAlimentacao paciente={paciente} aoAlterar={aoAlterar} />
    if (bloco === 'retorno' && adesao) {
      return (
        <p className="flex gap-2 rounded-lg bg-card p-3 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          {adesao}
        </p>
      )
    }
    return null
  }
  const camposDepois = (bloco: IdBloco): ReactNode =>
    bloco === 'alimentacao' ? (
      <CampoConsumoMensal consumo={paciente.consumoMensal} pessoasNaCasa={paciente.pessoasNaCasa} aoMudar={(consumoMensal) => aoAlterar({ consumoMensal })} />
    ) : null

  return (
    <Card role="region" aria-labelledby={`${id}-titulo`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-titulo`}>Anamnese</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAbertos(tudoAberto ? new Set() : new Set(todos))}>
              {tudoAberto ? <ChevronsDownUp aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
              {tudoAberto ? 'Recolher tudo' : 'Abrir tudo'}
            </Button>
            <Button size="sm" variant="outline" onClick={editarRoteiro}>
              <Pencil aria-hidden="true" />
              Editar roteiro
            </Button>
          </div>
        </div>
        <CardDescription>Todas as perguntas são opcionais.</CardDescription>
      </CardHeader>

      {naoGuardou ? (
        <p role="status" className="text-xs text-warningtext">
          Não foi possível salvar o roteiro. Ele vale até você fechar a página.
        </p>
      ) : null}

      {faltaPerfil(perfil) ? (
        <p className="flex gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {FRASE_SEM_PERFIL}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {blocos.map((bloco) => (
          <Recolhivel
            key={bloco.id}
            titulo={bloco.titulo}
            resumo={resumoDoBloco(bloco, camposDoBloco(bloco.id, paciente))}
            aberto={abertos.has(bloco.id)}
            aoAlternar={alternar(bloco.id)}
          >
            {bloco.aviso ? (
              <Alert variant="warning">
                <TriangleAlert aria-hidden="true" />
                <p>{bloco.aviso}</p>
              </Alert>
            ) : null}
            {camposAntes(bloco.id)}
            {bloco.perguntas.map((pergunta) => (
              <PerguntaDaAnamnese
                key={pergunta.id}
                campo={`${id}-${bloco.id}-${pergunta.id}`}
                pergunta={pergunta}
                dica={dicaDaPergunta(pergunta.id, perfil)}
                placeholder={bloco.id === 'recordatorio' || pergunta.id === 'retorno-recordatorio' ? 'Horário, o que comeu e quanto…' : undefined}
                aoResponder={(resposta) => aoAlterar({ respostasAnamnese: responder(paciente.respostasAnamnese, pergunta, bloco.id, resposta, hoje) })}
              />
            ))}
            {camposDepois(bloco.id)}
          </Recolhivel>
        ))}

        <Recolhivel
          titulo="Exames recentes"
          resumo={exames === 0 ? 'Nenhum exame' : exames === 1 ? '1 exame' : `${exames} exames`}
          aberto={abertos.has(EXAMES)}
          aoAlternar={alternar(EXAMES)}
        >
          <ListaExamesRecentes exames={paciente.examesRecentes} aoMudar={(examesRecentes) => aoAlterar({ examesRecentes })} />
        </Recolhivel>

        <Recolhivel titulo="Outras anotações" resumo={temAnotacoes ? 'Com anotações' : 'Sem anotações'} aberto={abertos.has(OUTRAS)} aoAlternar={alternar(OUTRAS)}>
          {comAnamneseAnterior ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-anterior`}>Anamnese anterior</Label>
              <Textarea id={`${id}-anterior`} rows={4} value={paciente.anamnese} onChange={(e) => aoAlterar({ anamnese: e.target.value })} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            {/* O título do recolhido já diz "Outras anotações"; o rótulo fica para o leitor de tela (D-247). */}
            <Label htmlFor={`${id}-observacoes`} className={comAnamneseAnterior ? undefined : 'sr-only'}>
              Outras anotações
            </Label>
            <Textarea id={`${id}-observacoes`} rows={3} value={paciente.observacoes} onChange={(e) => aoAlterar({ observacoes: e.target.value })} />
          </div>
        </Recolhivel>
      </div>

      {editando ? <DialogoRoteiro roteiro={roteiro} aoSalvar={salvarRoteiro} aoFechar={() => setEditando(false)} /> : null}
    </Card>
  )
}
