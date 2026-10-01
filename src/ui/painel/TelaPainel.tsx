import { ClipboardList, Sparkles, TriangleAlert } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { atividadePorDia, resumirAtividade } from '@/domain/atividade.ts'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'

interface TelaPainelProps {
  readonly aoAbrirPlano: (casoId: string) => void
  readonly aoIrPara: (tela: 'pacientes' | 'casos' | 'produtos') => void
  /** Cria e abre um plano de demonstração; só aparece enquanto não há plano nenhum. */
  readonly aoVerExemplo: () => void
  /** Aviso da conta no topo (estudante ou CRN), montado pelo App. */
  readonly aviso?: ReactNode
}

const DIAS = 14

/** Primeira tela do dia: onde você parou e o que está pendente (spec pdf-e-telas-limpas, US-B3). */
export function TelaPainel({ aoAbrirPlano, aoIrPara, aoVerExemplo, aviso }: TelaPainelProps) {
  const { casos, avisoArmazenamento } = useCasos()
  const { pacientes } = usePacientes()

  const recentes = useMemo(() => casos.slice(0, 5), [casos])
  const semPaciente = useMemo(() => casos.filter((c) => c.pacienteId === null).length, [casos])
  const semNome = useMemo(() => casos.filter((c) => c.nome.trim() === '').length, [casos])
  const atividade = useMemo(() => resumirAtividade(atividadePorDia(casos, DIAS, new Date())), [casos])

  const pendencias = [
    semNome > 0 ? { texto: `${semNome} ${semNome === 1 ? 'plano sem nome' : 'planos sem nome'}`, acao: 'Ver', ir: () => aoIrPara('casos') } : null,
    semPaciente > 0
      ? { texto: `${semPaciente} ${semPaciente === 1 ? 'plano sem paciente vinculado' : 'planos sem paciente vinculado'}`, acao: 'Ver', ir: () => aoIrPara('casos') }
      : null,
    pacientes.length === 0 ? { texto: 'Nenhum paciente cadastrado', acao: 'Cadastrar', ir: () => aoIrPara('pacientes') } : null,
  ].filter((p): p is { texto: string; acao: string; ir: () => void } => p !== null)

  const numeros = [
    { valor: atividade.total, rotulo: atividade.total === 1 ? 'plano' : 'planos', apoio: `mexidos em ${DIAS} dias` },
    { valor: pacientes.length, rotulo: pacientes.length === 1 ? 'paciente' : 'pacientes', apoio: 'com ficha' },
    { valor: atividade.diasAtivos, rotulo: atividade.diasAtivos === 1 ? 'dia' : 'dias', apoio: `trabalhados em ${DIAS}` },
  ]

  return (
    <div className="flex flex-col gap-6">
      {aviso}

      <section aria-label="Seus números">
        <Card className="grid grid-cols-3 gap-0 px-0 py-4 sm:py-5">
          {numeros.map((n, i) => (
            <div key={n.apoio} className={`flex min-w-0 flex-col gap-0.5 px-3 sm:px-6 ${i > 0 ? 'border-l border-border' : ''}`}>
              <span className="numeros font-titulo text-2xl font-bold leading-tight text-heading sm:text-3xl">{n.valor}</span>
              <span className="text-sm font-semibold text-heading">{n.rotulo}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{n.apoio}</span>
            </div>
          ))}
        </Card>
      </section>

      {avisoArmazenamento ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{avisoArmazenamento}</p>
        </Alert>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4">
          <CardTitle>Onde você parou</CardTitle>
          {recentes.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">Nenhum plano ainda.</p>
              <Button variant="lightprimary" size="sm" onClick={aoVerExemplo}>
                <Sparkles aria-hidden="true" />
                Ver um plano de exemplo
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Planos recentes">
              {recentes.map((c) => (
                <li key={c.id}>
                  <LinhaLista
                    inicio={<ClipboardList aria-hidden="true" />}
                    titulo={c.nome.trim() || 'Plano sem nome'}
                    detalhe={`${c.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · ${formatarAlteracao(c.atualizadoEm).toLowerCase()}`}
                    fim={
                      <Button size="sm" variant="ghost" onClick={() => aoAbrirPlano(c.id)}>
                        Abrir
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <CardTitle>Precisa de atenção</CardTitle>
          {pendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tudo em dia.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pendencias.map((p) => (
                <li key={p.texto}>
                  <LinhaLista
                    titulo={p.texto}
                    fim={
                      <Button size="sm" variant="ghost" onClick={p.ir}>
                        {p.acao}
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
