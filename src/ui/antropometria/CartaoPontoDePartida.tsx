import { Check } from 'lucide-react'
import { calcularEnergia } from '@/domain/energia.ts'
import { dataCurta } from '@/domain/formatarData.ts'
import { idadeValida, medidaValida } from '@/domain/linhaDoResultado.ts'
import { metaDePerda } from '@/domain/metaDePerda.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { gastoDeRepouso, proteinaPorObjetivo } from '@/domain/pontoDePartida.ts'
import { prioridadeDoCaso } from '@/domain/prioridadeClinica.ts'
import type { Caso, DadosDaAvaliacao } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { BlocoMetaDePerda } from './BlocoMetaDePerda.tsx'
import { CabecaDoBloco } from './CabecaDoBloco.tsx'
import { BlocoProteina } from './BlocoProteina.tsx'
import { Escolha } from './Escolha.tsx'
import { ROTULO_DA_EVIDENCIA, TRAVESSAO, avisosNaTela, faixaEmDezenas, opcoesDaGorduraDoCaso, opcoesDoPerfil, proteinaParaOPlano } from './textosDaAvaliacao.ts'

interface CartaoPontoDePartidaProps {
  /** O plano como vale (com a ficha). */
  readonly caso: Caso
  readonly bruto: Caso
  /** As doenças da ficha decidem a proteína do idoso e a pergunta da TFGe (D-1420). */
  readonly paciente: Paciente | null
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

const DOENCA_RENAL = 'doenca-renal'

/**
 * "Ponto de partida do plano" (spec antropometria-telas, D-1418 a D-1421 e D-1467 a D-1469): o gasto de repouso, a
 * proteína, a prioridade clínica e a meta de perda, cada um com a fonte e o selo de evidência, e "Levar para o plano"
 * para a proteína. São sugestões; a nutricionista decide.
 */
export function CartaoPontoDePartida({ caso, bruto, paciente, aoAlterar }: CartaoPontoDePartidaProps) {
  const { avaliacao } = bruto
  const alterarAvaliacao = (mudanca: Partial<DadosDaAvaliacao>) => aoAlterar({ avaliacao: { ...avaliacao, ...mudanca } })
  const idade = idadeValida(caso.idadeAnos)
  const vale = idade !== null && idade >= 18 && caso.condicao.tipo !== 'gestante'
  const perfil = avaliacao.perfil
  const gordura = opcoesDaGorduraDoCaso(caso)
  const doencas = paciente?.doencas ?? []
  const renal = doencas.includes(DOENCA_RENAL)
  const comDoencaNaFicha = idade !== null && idade >= 65 && doencas.length > 0

  const titulo = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <CardTitle id="titulo-partida">Ponto de partida do plano</CardTitle>
      {vale ? (
        <Escolha
          rotulo="Perfil de atividade"
          rotuloOculto
          compacto
          className="w-full sm:ml-auto sm:w-48"
          vazio="Perfil de atividade"
          opcoes={opcoesDoPerfil(caso.sexo)}
          valor={perfil}
          aoEscolher={(p) => alterarAvaliacao({ perfil: p })}
        />
      ) : null}
    </div>
  )

  if (!vale) {
    return (
      <section aria-labelledby="titulo-partida">
        <Card className="gap-3">
          {titulo}
          <p className="text-sm text-muted-foreground">{idade === null ? 'Falta a idade para o ponto de partida.' : 'O ponto de partida vale de 18 anos em diante, fora da gestação.'}</p>
        </Card>
      </section>
    )
  }

  const gasto = perfil ? gastoDeRepouso(caso, perfil, gordura) : null
  // Na lactante, o motor diz o motivo antes de olhar o perfil (CB-1449): o bloco não pede um perfil que não muda nada.
  const lactante = caso.condicao.tipo === 'lactante'
  const proteina =
    perfil || lactante
      ? proteinaPorObjetivo(caso, {
          perfil: perfil ?? 'sedentario',
          doencaAgudaOuCronica: comDoencaNaFicha,
          doencaRenalGrave: renal && avaliacao.doencaRenalGrave === true,
          ...(avaliacao.baseDaProteina ? { base: avaliacao.baseDaProteina } : {}),
          imcAlvo: avaliacao.imcAlvo,
          gordura,
        })
      : null
  const prioridade = prioridadeDoCaso(caso)
  const get = medidaValida(calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }).get)
  const meta = metaDePerda(caso, { gorduraAlvoPct: avaliacao.gorduraAlvoPct, atleta: perfil === 'atleta', gastoTotalKcal: get, gordura })

  const sugestao = proteina?.calculou ? proteina : null
  const levar = sugestao ? proteinaParaOPlano(sugestao) : { motivo: perfil ? 'Sem faixa de proteína para levar ao plano.' : 'Escolha o perfil de atividade.' }
  const metaDoPlano = caso.metasMacros.proteina
  const levada = 'min' in levar && metaDoPlano?.tipo === 'g_kg' && metaDoPlano.min === levar.min && metaDoPlano.max === levar.max
  const dia = dataCurta(caso.dataConsulta)

  return (
    <section aria-labelledby="titulo-partida">
      <Card className="gap-3.5">
        {titulo}

        <div className="grid gap-1.5">
          <CabecaDoBloco
            nome="Gasto de repouso"
            evidencia={gasto?.calculou ? ROTULO_DA_EVIDENCIA[gasto.evidencia] : null}
            fontes={gasto?.calculou ? [gasto.fonte] : []}
            avisos={gasto?.calculou ? avisosNaTela('gasto', gasto.avisos).naAjuda : []}
          />
          <p className="numeros text-2xl font-semibold tracking-tight text-heading">
            {gasto?.calculou ? (
              <>
                {faixaEmDezenas(gasto.faixa.min, gasto.faixa.max)} <small className="text-sm font-medium tracking-normal text-muted-foreground">kcal/dia</small>
              </>
            ) : (
              TRAVESSAO
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {!perfil
              ? 'Escolha o perfil de atividade.'
              : gasto === null
                ? ''
                : gasto.calculou
                  ? `${gasto.nome}, pela massa magra de ${formatarNumero(gasto.massaMagraKg, 1)} kg (% de gordura: ${gasto.origemDoPercentual.metodo}).`
                  : gasto.motivo}
          </p>
        </div>

        <BlocoProteina
          resultado={proteina}
          semPerfil={!perfil && !lactante}
          objetivo={bruto.objetivo}
          aoMudarObjetivo={(objetivo) => aoAlterar({ objetivo })}
          comDoencaNaFicha={comDoencaNaFicha}
          perguntaDaTfge={renal ? { valor: avaliacao.doencaRenalGrave, aoMudar: (doencaRenalGrave) => alterarAvaliacao({ doencaRenalGrave }) } : null}
          aoMudarBase={(baseDaProteina) => alterarAvaliacao({ baseDaProteina })}
        />

        <div className="grid gap-1.5 border-t border-border pt-3.5">
          <CabecaDoBloco
            nome="Prioridade clínica"
            evidencia={prioridade ? ROTULO_DA_EVIDENCIA[prioridade.evidencia] : null}
            fontes={prioridade ? [...new Map(prioridade.gatilhos.map((g) => [g.fonte.citacao, g.fonte])).values()] : []}
            avisos={prioridade ? avisosNaTela('prioridade', prioridade.avisos).naAjuda : []}
          />
          {prioridade ? (
            <>
              <p className="text-2xl font-semibold tracking-tight text-heading">{`Nível ${prioridade.nivel} de 4 · ${prioridade.rotulo}`}</p>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {(prioridade.gatilhos.length > 0 ? prioridade.gatilhos.map((g) => `${g.descricao} (${g.fonte.curta})`) : ['Nenhum gatilho pelas medidas.']).map((g) => (
                  <li key={g} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 size-1.25 shrink-0 rounded-full bg-statelow" />
                    {g}
                  </li>
                ))}
              </ul>
              <ul className="grid gap-0.5 text-xs text-muted-foreground">
                {avisosNaTela('prioridade', prioridade.avisos).visiveis.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">A prioridade precisa do sexo, do peso e da estatura.</p>
          )}
        </div>

        <BlocoMetaDePerda resultado={meta} gorduraAlvoPct={avaliacao.gorduraAlvoPct} aoMudarGorduraAlvo={(gorduraAlvoPct) => alterarAvaliacao({ gorduraAlvoPct })} gastoTotalKcal={get} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3.5">
          <Button
            variant="soft"
            size="sm"
            disabled={!('min' in levar)}
            aria-describedby={'min' in levar ? undefined : 'motivo-levar'}
            onClick={() => {
              if ('min' in levar) aoAlterar({ metasMacros: { ...bruto.metasMacros, proteina: { tipo: 'g_kg', min: levar.min, max: levar.max } } })
            }}
          >
            Levar para o plano
          </Button>
          {levada ? (
            <p role="status" className="flex items-center gap-1.5 text-sm text-successtext">
              <Check className="size-4" aria-hidden="true" />
              {`No plano${dia ? ` de ${dia}` : ''} como sugestão. Você ajusta lá.`}
            </p>
          ) : 'motivo' in levar ? (
            <p id="motivo-levar" className="text-xs text-muted-foreground">
              {levar.motivo}
            </p>
          ) : null}
        </div>
      </Card>
    </section>
  )
}
