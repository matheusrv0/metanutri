import { Barcode, ClipboardList, FolderOpen, Plus, Sparkles, TriangleAlert, UserRound } from 'lucide-react'
import { useMemo } from 'react'
import { atividadePorDia, resumirAtividade } from '@/domain/atividade.ts'
import type { ModoPlano } from '@/domain/tipos.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { OriginButton } from '@ds/componentes/efeitos/origin-button.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'
import { CartaoDestaque } from '@ds/componentes/nutricao/CartaoDestaque.tsx'
import { GraficoAtividade } from './GraficoAtividade.tsx'

interface TelaPainelProps {
  readonly aoNovoPlano: (modo: ModoPlano) => void
  readonly aoAbrirPlano: (casoId: string) => void
  readonly aoIrPara: (tela: 'pacientes' | 'casos' | 'produtos') => void
  /** Cria e abre um plano de demonstração; só aparece enquanto não há plano nenhum. */
  readonly aoVerExemplo: () => void
}

const DIAS_NO_GRAFICO = 14

/** Primeira tela do dia: o que precisa de atenção, onde você parou e o que fazer agora. */
export function TelaPainel({ aoNovoPlano, aoAbrirPlano, aoIrPara, aoVerExemplo }: TelaPainelProps) {
  const { casos, avisoArmazenamento } = useCasos()
  const { pacientes } = usePacientes()

  const recentes = useMemo(() => casos.slice(0, 5), [casos])
  const semPaciente = useMemo(() => casos.filter((c) => c.pacienteId === null).length, [casos])
  const semNome = useMemo(() => casos.filter((c) => c.nome.trim() === '').length, [casos])
  const dias = useMemo(() => atividadePorDia(casos, DIAS_NO_GRAFICO, new Date()), [casos])
  const atividade = useMemo(() => resumirAtividade(dias), [dias])

  const pendencias = [
    semNome > 0 ? { texto: `${semNome} ${semNome === 1 ? 'plano sem nome' : 'planos sem nome'}`, acao: 'Ver', ir: () => aoIrPara('casos') } : null,
    semPaciente > 0
      ? { texto: `${semPaciente} ${semPaciente === 1 ? 'plano sem paciente vinculado' : 'planos sem paciente vinculado'}`, acao: 'Ver', ir: () => aoIrPara('casos') }
      : null,
    pacientes.length === 0 ? { texto: 'Nenhum paciente cadastrado', acao: 'Cadastrar', ir: () => aoIrPara('pacientes') } : null,
  ].filter((p): p is { texto: string; acao: string; ir: () => void } => p !== null)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoDestaque
          rotulo="Planos"
          valor={casos.length.toString()}
          apoio={casos.length === 0 ? 'Nenhum ainda' : `${atividade.total} mexidos em ${DIAS_NO_GRAFICO} dias`}
          icone={FolderOpen}
          tom="grafite"
          aoClicar={() => aoIrPara('casos')}
        />
        <CartaoDestaque
          rotulo="Pacientes"
          valor={pacientes.length.toString()}
          apoio={pacientes.length === 0 ? 'Comece cadastrando um' : 'Fichas com restrições e histórico'}
          icone={UserRound}
          tom="branco"
          aoClicar={() => aoIrPara('pacientes')}
        />
        <CartaoDestaque
          rotulo="Dias trabalhados"
          valor={atividade.diasAtivos.toString()}
          apoio={`De ${DIAS_NO_GRAFICO} dias corridos`}
          icone={ClipboardList}
          tom="branco"
        />
        <CartaoDestaque
          rotulo="Precisa de atenção"
          valor={pendencias.length.toString()}
          apoio={pendencias.length === 0 ? 'Nada pendente' : 'Coisas que atrapalham na entrega'}
          icone={TriangleAlert}
          tom={pendencias.length > 0 ? 'ocre' : 'branco'}
        />
      </div>

      {avisoArmazenamento ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{avisoArmazenamento}</p>
        </Alert>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader>
              <CardTitle>Começar agora</CardTitle>
              <CardDescription>Escolha o caminho conforme o atendimento. Dá para trocar de rápido para completo depois.</CardDescription>
            </CardHeader>
            <EscolherModo
              aoEscolher={aoNovoPlano}
              gatilho={
                <OriginButton>
                  <Plus className="size-4" aria-hidden="true" />
                  Novo plano
                </OriginButton>
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => aoIrPara('pacientes')}>
              <UserRound aria-hidden="true" />
              Pacientes
            </Button>
            <Button variant="outline" onClick={() => aoIrPara('produtos')}>
              <Barcode aria-hidden="true" />
              Cadastrar produto
            </Button>
          </div>

          {casos.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">Nunca usou? Abra um dia inteiro já montado e mexa à vontade.</p>
              <Button variant="lightprimary" size="sm" onClick={aoVerExemplo}>
                <Sparkles aria-hidden="true" />
                Ver um plano de exemplo
              </Button>
            </div>
          ) : (
            <div className="border-t border-border pt-4">
              <p className="rotulo mb-2">Últimos {DIAS_NO_GRAFICO} dias</p>
              <GraficoAtividade dias={dias} maior={atividade.maior} />
            </div>
          )}
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Onde você parou</CardTitle>
            <CardDescription>Os últimos planos abertos neste aparelho.</CardDescription>
          </CardHeader>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano ainda. Comece pelo botão acima.</p>
          ) : (
            <ul className="flex flex-col" aria-label="Planos recentes">
              {recentes.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                  <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-heading">{c.nome.trim() || 'Plano sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${c.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · ${formatarAlteracao(c.atualizadoEm).toLowerCase()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => aoAbrirPlano(c.id)}>
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Precisa de atenção</CardTitle>
          <CardDescription>Coisas pequenas que atrapalham depois, na hora de entregar.</CardDescription>
        </CardHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {pendencias.map((p) => (
            <li key={p.texto} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
              <span>{p.texto}</span>
              <Button size="sm" variant="ghost" onClick={p.ir}>
                {p.acao}
              </Button>
            </li>
          ))}
          {pendencias.length === 0 ? <li className="text-muted-foreground">Nada pendente por aqui.</li> : null}
        </ul>
      </Card>
    </div>
  )
}
