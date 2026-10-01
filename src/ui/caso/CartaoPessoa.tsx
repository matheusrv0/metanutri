import { Ruler } from 'lucide-react'
import { camposDaPessoa } from '@/domain/camposVisiveis.ts'
import type { ResultadoValidacao } from '@/domain/caso.ts'
import type { Caso, CondicaoFisiologica, Objetivo, Sexo } from '@/domain/tipos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { CampoMetaEnergia } from './CampoMetaEnergia.tsx'
import { CampoNivelAtividade } from './CampoNivelAtividade.tsx'

interface CartaoPessoaProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly erros: ResultadoValidacao['erros']
}

type TipoCondicao = CondicaoFisiologica['tipo']

const CONDICOES: readonly { readonly valor: TipoCondicao; readonly rotulo: string }[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'gestante', rotulo: 'Gestante' },
  { valor: 'lactante', rotulo: 'Lactante' },
]

/** Pessoa, medidas e meta: só os campos que valem para o caso (CA-330 e CA-331). */
export function CartaoPessoa({ caso, aoAlterar, erros }: CartaoPessoaProps) {
  const rapido = caso.modo === 'rapido'
  const campos = camposDaPessoa(caso)
  const { condicao } = caso
  const numero = (campo: keyof Caso) => (valor: number | null) => aoAlterar({ [campo]: valor } as Partial<Caso>)

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
    <Card>
      <CardHeader>
        <CardTitle>{rapido ? 'Pessoa e meta' : 'Pessoa e medidas'}</CardTitle>
      </CardHeader>

      <div className="flex flex-wrap gap-x-8 gap-y-4">
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
        {campos.condicao ? (
          <GrupoOpcoes<TipoCondicao> rotulo="Condição" opcoes={CONDICOES} valor={condicao.tipo} aoEscolher={trocarCondicao} erro={erros.condicao} />
        ) : null}
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CampoNumero rotulo="Idade" valor={caso.idadeAnos} aoMudar={numero('idadeAnos')} sufixo="anos" erro={erros.idadeAnos} />
        {campos.mesesAlemDosAnos ? (
          <CampoNumero
            rotulo="Meses além dos anos"
            valor={caso.idadeMesesAdicionais}
            aoMudar={(v) => aoAlterar({ idadeMesesAdicionais: v ?? 0 })}
            sufixo="meses"
            erro={erros.idadeMesesAdicionais}
          />
        ) : null}
        <CampoNumero rotulo="Peso" valor={caso.pesoKg} aoMudar={numero('pesoKg')} sufixo="kg" erro={erros.pesoKg} />
        <CampoNumero rotulo="Estatura" valor={caso.estaturaCm} aoMudar={numero('estaturaCm')} sufixo="cm" erro={erros.estaturaCm} />
        {campos.cintura ? (
          <CampoNumero
            rotulo="Circunferência da cintura"
            valor={caso.circunferenciaCinturaCm}
            aoMudar={numero('circunferenciaCinturaCm')}
            sufixo="cm"
            erro={erros.circunferenciaCinturaCm}
          />
        ) : null}
        {campos.panturrilha ? (
          <CampoNumero
            rotulo="Circunferência da panturrilha"
            valor={caso.circunferenciaPanturrilhaCm}
            aoMudar={numero('circunferenciaPanturrilhaCm')}
            sufixo="cm"
            erro={erros.circunferenciaPanturrilhaCm}
          />
        ) : null}
      </div>

      <CampoNivelAtividade fator={caso.energia.fator} aoEscolher={(fator) => aoAlterar({ energia: { ...caso.energia, fator } })} />

      {rapido ? <CampoMetaEnergia caso={caso} aoMudar={numero('metaEnergiaKcal')} erro={erros.metaEnergiaKcal} /> : null}

      {rapido ? (
        <Alert variant="info">
          <Ruler aria-hidden="true" />
          <p>Peso e estatura aqui servem só para estimar a meta e para a proteína em g/kg. Nada é classificado nem vira diagnóstico.</p>
        </Alert>
      ) : null}
    </Card>
  )
}
