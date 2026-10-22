import { camposDaPessoa } from '@/domain/camposVisiveis.ts'
import type { ResultadoValidacao } from '@/domain/caso.ts'
import type { Caso, CondicaoFisiologica, Sexo } from '@/domain/tipos.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface CamposDoPlanoSemPacienteProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly erros: ResultadoValidacao['erros']
  /** A idade depois que a pessoa terminou de digitar (D-244): decide Meses e Gestação ou lactação. */
  readonly idadeAssentada: number | null
  readonly assentarIdade: () => void
}

type TipoCondicao = CondicaoFisiologica['tipo']

const CONDICOES: readonly { readonly valor: TipoCondicao; readonly rotulo: string }[] = [
  { valor: 'nenhuma', rotulo: 'Não' },
  { valor: 'gestante', rotulo: 'Gestante' },
  { valor: 'lactante', rotulo: 'Lactante' },
]

/**
 * O plano sem paciente (caso de estudo do estudante) guarda os próprios dados (spec ficha-unica, D-366 e CA-1036):
 * nome, sexo, idade (com Meses abaixo de 19 anos, R9), gestação ou lactação (R1), diagnóstico clínico e ocupação.
 */
export function CamposDoPlanoSemPaciente({ caso, aoAlterar, erros, idadeAssentada, assentarIdade }: CamposDoPlanoSemPacienteProps) {
  const campos = camposDaPessoa({ ...caso, idadeAnos: idadeAssentada })
  const { condicao } = caso

  const trocarCondicao = (tipo: TipoCondicao) => {
    const nova: CondicaoFisiologica =
      tipo === 'gestante'
        ? { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: null }
        : tipo === 'lactante'
          ? { tipo: 'lactante', mesesPosParto: null }
          : { tipo: 'nenhuma' }
    aoAlterar({ condicao: nova })
  }

  return (
    <>
      <div className="sm:col-span-2">
        <CampoTexto rotulo="Nome do plano" valor={caso.nome} aoMudar={(nome) => aoAlterar({ nome })} />
      </div>
      <GrupoOpcoes<Sexo>
        rotulo="Sexo"
        opcoes={[
          { valor: 'F', rotulo: 'Feminino' },
          { valor: 'M', rotulo: 'Masculino' },
        ]}
        valor={caso.sexo}
        aoEscolher={(sexo) => aoAlterar({ sexo })}
      />
      <div className="grid grid-cols-2 gap-4">
        <div
          className="contents"
          onBlur={assentarIdade}
          onKeyDown={(evento) => {
            if (evento.key === 'Tab') assentarIdade()
          }}
        >
          <CampoNumero rotulo="Idade" valor={caso.idadeAnos} aoMudar={(idadeAnos) => aoAlterar({ idadeAnos })} sufixo="anos" erro={erros.idadeAnos} />
        </div>
        {campos.mesesAlemDosAnos ? (
          <CampoNumero
            rotulo="Meses"
            valor={caso.idadeMesesAdicionais}
            aoMudar={(v) => aoAlterar({ idadeMesesAdicionais: v ?? 0 })}
            sufixo="meses"
            dica="Além dos anos completos."
            erro={erros.idadeMesesAdicionais}
          />
        ) : null}
      </div>
      {campos.condicao ? (
        <div className="flex flex-col gap-4 sm:col-span-2">
          <GrupoOpcoes<TipoCondicao> rotulo="Gestação ou lactação" opcoes={CONDICOES} valor={condicao.tipo} aoEscolher={trocarCondicao} erro={erros.condicao} />
          {condicao.tipo === 'gestante' ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
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
        </div>
      ) : null}
      <CampoTexto rotulo="Diagnóstico clínico" valor={caso.diagnosticoClinico} aoMudar={(diagnosticoClinico) => aoAlterar({ diagnosticoClinico })} />
      <CampoTexto rotulo="Ocupação" valor={caso.ocupacao} aoMudar={(ocupacao) => aoAlterar({ ocupacao })} />
    </>
  )
}
