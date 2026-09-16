import { useMemo, type ReactNode } from 'react'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { validarCaso } from '@/domain/caso.ts'
import type { Caso, CondicaoFisiologica, Objetivo, Sexo } from '@/domain/tipos.ts'
import { Card, CardDescription, CardHeader, CardTitle } from '../componentes/card.tsx'
import { Label } from '../componentes/label.tsx'
import { Textarea } from '../componentes/textarea.tsx'
import { CampoNumero } from './CampoNumero.tsx'
import { CampoTexto } from './CampoTexto.tsx'
import { GrupoOpcoes } from './GrupoOpcoes.tsx'
import { PainelAntropometria } from './PainelAntropometria.tsx'

interface TelaCasoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
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
export function TelaCaso({ caso, aoAlterar, lateral }: TelaCasoProps) {
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Aparece no cabeçalho do documento exportado.</CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto rotulo="Nome do caso" valor={caso.nome} aoMudar={(v) => aoAlterar({ nome: v })} placeholder="Maria, 28 anos" />
            <CampoTexto rotulo="Diagnóstico clínico" valor={caso.diagnosticoClinico} aoMudar={(v) => aoAlterar({ diagnosticoClinico: v })} />
            <CampoTexto rotulo="Data da consulta" tipo="date" valor={caso.dataConsulta ?? ''} aoMudar={(v) => aoAlterar({ dataConsulta: v || null })} />
            <CampoTexto rotulo="Ocupação" valor={caso.ocupacao} aoMudar={(v) => aoAlterar({ ocupacao: v })} />
            <CampoTexto rotulo="Estagiário(a)" valor={caso.estagiario} aoMudar={(v) => aoAlterar({ estagiario: v })} />
            <CampoTexto rotulo="Preceptor(a)" valor={caso.preceptor} aoMudar={(v) => aoAlterar({ preceptor: v })} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pessoa e medidas</CardTitle>
            <CardDescription>Base da antropometria e do gasto energético. Pode usar vírgula, como 68,5.</CardDescription>
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
            <CampoNumero rotulo="Peso" valor={caso.pesoKg} aoMudar={numero('pesoKg')} sufixo="kg" erro={erros.pesoKg} />
            <CampoNumero rotulo="Estatura" valor={caso.estaturaCm} aoMudar={numero('estaturaCm')} sufixo="cm" erro={erros.estaturaCm} />
            <CampoNumero
              rotulo="Circunferência da cintura"
              valor={caso.circunferenciaCinturaCm}
              aoMudar={numero('circunferenciaCinturaCm')}
              sufixo="cm"
              erro={erros.circunferenciaCinturaCm}
            />
            <CampoNumero
              rotulo="Circunferência da panturrilha"
              valor={caso.circunferenciaPanturrilhaCm}
              aoMudar={numero('circunferenciaPanturrilhaCm')}
              sufixo="cm"
              dica="Avaliada a partir de 60 anos."
              erro={erros.circunferenciaPanturrilhaCm}
            />
          </div>
        </Card>

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
        <PainelAntropometria resultado={antropometria} />
        {lateral}
      </div>
    </div>
  )
}
