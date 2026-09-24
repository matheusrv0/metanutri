import { Ruler } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { validarCaso } from '@/domain/caso.ts'
import type { Caso, CondicaoFisiologica, Objetivo, Sexo } from '@/domain/tipos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { CartaoComposicao } from './CartaoComposicao.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { PainelAntropometria } from './PainelAntropometria.tsx'

interface TelaCasoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** Pacientes cadastrados, para vincular este plano a uma ficha. */
  readonly pacientes?: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: (pacienteId: string | null) => void
  /** Painéis extras da coluna da direita (ex.: Resumo do dia). */
  readonly lateral?: ReactNode
}

type TipoCondicao = CondicaoFisiologica['tipo']

const CONDICOES: readonly { readonly valor: TipoCondicao; readonly rotulo: string }[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'gestante', rotulo: 'Gestante' },
  { valor: 'lactante', rotulo: 'Lactante' },
]

/** Etapa 1: dados do caso e avaliação antropométrica (CA-01 a CA-05). */
export function TelaCaso({ caso, aoAlterar, lateral, pacientes = [], aoVincularPaciente }: TelaCasoProps) {
  const validacao = useMemo(() => validarCaso(caso), [caso])
  const antropometria = useMemo(() => avaliarAntropometria(caso), [caso])
  const { erros } = validacao

  const numero = (campo: keyof Caso) => (valor: number | null) => aoAlterar({ [campo]: valor } as Partial<Caso>)

  const trocarCondicao = (tipo: TipoCondicao) => {
    const condicao: CondicaoFisiologica =
      tipo === 'gestante'
        ? { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: null }
        : tipo === 'lactante'
          ? { tipo: 'lactante', mesesPosParto: null }
          : { tipo: 'nenhuma' }
    aoAlterar({ condicao })
  }

  const { condicao } = caso
  const rapido = caso.modo === 'rapido'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Aparece no cabeçalho do documento exportado.</CardDescription>
          </CardHeader>
          {aoVincularPaciente ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paciente-do-plano">Paciente</Label>
              <select
                id="paciente-do-plano"
                value={caso.pacienteId ?? ''}
                onChange={(e) => aoVincularPaciente(e.target.value || null)}
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="">Sem paciente vinculado</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome.trim() || 'Paciente sem nome'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Vincular traz restrições e histórico da ficha para este plano.</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto rotulo="Nome do plano" valor={caso.nome} aoMudar={(v) => aoAlterar({ nome: v })} placeholder="Maria, 28 anos…" />
            <CampoTexto rotulo="Diagnóstico clínico" valor={caso.diagnosticoClinico} aoMudar={(v) => aoAlterar({ diagnosticoClinico: v })} />
            <CampoTexto rotulo="Data da consulta" tipo="date" valor={caso.dataConsulta ?? ''} aoMudar={(v) => aoAlterar({ dataConsulta: v || null })} />
            <CampoTexto rotulo="Ocupação" valor={caso.ocupacao} aoMudar={(v) => aoAlterar({ ocupacao: v })} />
            <CampoTexto rotulo="Estagiário(a)" valor={caso.estagiario} aoMudar={(v) => aoAlterar({ estagiario: v })} />
            <CampoTexto rotulo="Preceptor(a)" valor={caso.preceptor} aoMudar={(v) => aoAlterar({ preceptor: v })} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{rapido ? 'Pessoa e meta' : 'Pessoa e medidas'}</CardTitle>
            <CardDescription>
              {rapido
                ? 'Sexo e idade escolhem as referências de micronutrientes. Peso e estatura são opcionais aqui.'
                : 'Base da antropometria e do gasto energético. Pode usar vírgula, como 68,5.'}
            </CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <GrupoOpcoes<Sexo>
              rotulo="Sexo"
              opcoes={[
                { valor: 'F', rotulo: 'Feminino' },
                { valor: 'M', rotulo: 'Masculino' },
              ]}
              valor={caso.sexo}
              aoEscolher={(sexo) => aoAlterar({ sexo })}
            />
            <GrupoOpcoes<Objetivo>
              rotulo="Objetivo"
              opcoes={[
                { valor: 'emagrecer', rotulo: 'Emagrecer' },
                { valor: 'manter', rotulo: 'Manter' },
                { valor: 'ganhar', rotulo: 'Ganhar' },
              ]}
              valor={caso.objetivo}
              aoEscolher={(objetivo) => aoAlterar({ objetivo })}
            />
            <CampoNumero rotulo="Idade" valor={caso.idadeAnos} aoMudar={numero('idadeAnos')} sufixo="anos" erro={erros.idadeAnos} />
            <CampoNumero
              rotulo="Meses além dos anos"
              valor={caso.idadeMesesAdicionais}
              aoMudar={(v) => aoAlterar({ idadeMesesAdicionais: v ?? 0 })}
              sufixo="meses"
              dica="Usado nas curvas da OMS até 19 anos."
              erro={erros.idadeMesesAdicionais}
            />
            {rapido ? (
              <CampoNumero
                rotulo="Meta de energia"
                valor={caso.metaEnergiaKcal}
                aoMudar={numero('metaEnergiaKcal')}
                sufixo="kcal"
                dica="É o gasto do dia que o plano vai perseguir."
                erro={erros.metaEnergiaKcal}
              />
            ) : null}
            <CampoNumero rotulo="Peso" valor={caso.pesoKg} aoMudar={numero('pesoKg')} sufixo="kg" erro={erros.pesoKg} />
            <CampoNumero rotulo="Estatura" valor={caso.estaturaCm} aoMudar={numero('estaturaCm')} sufixo="cm" erro={erros.estaturaCm} />
            {rapido ? (
              <Alert variant="info" className="sm:col-span-2">
                <Ruler aria-hidden="true" />
                <p>Peso e estatura aqui servem só para estimar a meta e para a proteína em g/kg. Nada é classificado nem vira diagnóstico.</p>
              </Alert>
            ) : null}
            {rapido ? null : (
            <CampoNumero
              rotulo="Circunferência da cintura"
              valor={caso.circunferenciaCinturaCm}
              aoMudar={numero('circunferenciaCinturaCm')}
              sufixo="cm"
              erro={erros.circunferenciaCinturaCm}
            />
            )}
            {rapido ? null : (
            <CampoNumero
              rotulo="Circunferência da panturrilha"
              valor={caso.circunferenciaPanturrilhaCm}
              aoMudar={numero('circunferenciaPanturrilhaCm')}
              sufixo="cm"
              dica="Avaliada a partir de 60 anos."
              erro={erros.circunferenciaPanturrilhaCm}
            />
            )}
          </div>
        </Card>

        {rapido ? null : <CartaoComposicao caso={caso} aoAlterar={aoAlterar} />}

        <Card>
          <CardHeader>
            <CardTitle>Condição fisiológica</CardTitle>
            <CardDescription>Muda as referências de energia e de ganho de peso.</CardDescription>
          </CardHeader>
          <GrupoOpcoes<TipoCondicao> rotulo="Condição" opcoes={CONDICOES} valor={condicao.tipo} aoEscolher={trocarCondicao} erro={erros.condicao} />

          {condicao.tipo === 'gestante' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoNumero
                rotulo="Idade gestacional"
                valor={condicao.semanasGestacao}
                aoMudar={(v) => aoAlterar({ condicao: { ...condicao, semanasGestacao: v } })}
                sufixo="semanas"
              />
              <CampoNumero
                rotulo="Peso pré-gestacional"
                valor={condicao.pesoPreGestacionalKg}
                aoMudar={(v) => aoAlterar({ condicao: { ...condicao, pesoPreGestacionalKg: v } })}
                sufixo="kg"
              />
            </div>
          ) : null}

          {condicao.tipo === 'lactante' ? (
            <CampoNumero
              rotulo="Tempo pós-parto"
              valor={condicao.mesesPosParto}
              aoMudar={(v) => aoAlterar({ condicao: { ...condicao, mesesPosParto: v } })}
              sufixo="meses"
              dica="Conta o adicional de energia da lactação."
            />
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orientações e receitas</CardTitle>
            <CardDescription>Entram no documento de aconselhamento exportado.</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orientacoes">Orientações nutricionais</Label>
            <Textarea id="orientacoes" rows={4} value={caso.orientacoes} onChange={(e) => aoAlterar({ orientacoes: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="receitas">Receitas</Label>
            <Textarea id="receitas" rows={4} value={caso.receitas} onChange={(e) => aoAlterar({ receitas: e.target.value })} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
            <CardDescription>Anotações livres sobre o caso.</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" rows={4} value={caso.observacoes} onChange={(e) => aoAlterar({ observacoes: e.target.value })} />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        {rapido ? (
          <Card className="gap-3">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>Sem avaliação neste plano</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta é uma prescrição rápida: nenhuma medida foi coletada, e o documento exportado diz isso.
            </p>
            <Button variant="lightprimary" className="self-start" onClick={() => aoAlterar({ modo: 'completo' })}>
              Virar atendimento completo
            </Button>
          </Card>
        ) : (
          <PainelAntropometria resultado={antropometria} />
        )}
        {lateral}
      </div>
    </div>
  )
}
