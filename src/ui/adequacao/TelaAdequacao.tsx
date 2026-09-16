import { TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calcularAdequacao, type EstadoAdequacao, type LinhaAdequacao } from '@/domain/adequacao.ts'
import { adicionarItem, type GerarId } from '@/domain/plano.ts'
import { ALIMENTOS, buscarAlimento, FONTE_ALIMENTOS } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, ChaveNutrienteAlimento, Plano, PresetAdequacao } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoNumero } from '../caso/CampoNumero.tsx'
import { GrupoOpcoes } from '../caso/GrupoOpcoes.tsx'
import { Alert } from '../componentes/alert.tsx'
import { Badge } from '../componentes/badge.tsx'
import { Button } from '../componentes/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '../componentes/card.tsx'
import { Progress } from '../componentes/progress.tsx'
import { Table, TableBody, TableCell, TableFootnotes, TableHead, TableHeader, TableRow } from '../componentes/table.tsx'
import { GavetaCobrir } from './GavetaCobrir.tsx'

interface TelaAdequacaoProps {
  readonly caso: Caso
  readonly plano: Plano
  readonly gastoEnergetico: number | null
  /** Restrições do paciente vinculado; filtram as sugestões do cobrir. */
  readonly restricoes?: readonly string[]
  readonly aoAlterarCaso: (mudanca: Partial<Caso>) => void
  readonly aoAlterarPlano: (novo: Plano) => void
  readonly gerarId?: GerarId
}

const VARIANTE: Record<EstadoAdequacao, 'lightSuccess' | 'lightWarning' | 'lightError'> = {
  adequado: 'lightSuccess',
  abaixo: 'lightWarning',
  'acima-limite': 'lightError',
}

const ROTULO_ESTADO: Record<EstadoAdequacao, string> = {
  adequado: 'Adequado',
  abaixo: 'Abaixo da meta',
  'acima-limite': 'Acima do limite superior',
}

const TIPO_PRESET: readonly { readonly valor: PresetAdequacao['tipo']; readonly rotulo: string }[] = [
  { valor: 'individual', rotulo: 'Individual (RDA, 90%)' },
  { valor: 'coletivo', rotulo: 'Coletivo (EAR, 50%)' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
]

const idPadrao: GerarId = () => globalThis.crypto.randomUUID()

/** "feminino-19-30" vira "mulheres de 19 a 30 anos"; "gestante-19-30" vira "gestantes de 19 a 30 anos". */
function descreverEstagio(estagio: { readonly idadeMin: number; readonly idadeMax: number | null; readonly sexo: string | null; readonly gestante: boolean; readonly lactante: boolean }): string {
  const grupo = estagio.gestante
    ? 'gestantes'
    : estagio.lactante
      ? 'lactantes'
      : estagio.sexo === 'F'
        ? 'mulheres'
        : estagio.sexo === 'M'
          ? 'homens'
          : 'crianças'
  const faixa = estagio.idadeMax === null ? `${estagio.idadeMin} anos ou mais` : `${estagio.idadeMin} a ${estagio.idadeMax} anos`
  return `${grupo} de ${faixa}`
}

function Linha({ linha, aoCobrir }: { readonly linha: LinhaAdequacao; readonly aoCobrir: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <span className="font-medium text-heading">{linha.rotulo}</span>
        {linha.notaLimite ? (
          <abbr title={linha.notaLimite} className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-muted-foreground no-underline">
            ‡
          </abbr>
        ) : null}
      </TableCell>
      <TableCell className="numeros whitespace-nowrap">
        {`${formatarNumero(linha.total, 2)} ${linha.unidade}`}
        {linha.semDado > 0 ? (
          <abbr
            title={`${linha.semDado} ${linha.semDado === 1 ? 'alimento do plano não tem' : 'alimentos do plano não têm'} este nutriente na tabela: total possivelmente subestimado.`}
            className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-warningtext no-underline"
          >
            †
          </abbr>
        ) : null}
      </TableCell>
      <TableCell className="numeros whitespace-nowrap">
        {`${formatarNumero(linha.referencia.valor, 2)} ${linha.unidade}`}
        <span className="block text-xs uppercase text-muted-foreground">{linha.referencia.tipo}</span>
      </TableCell>
      <TableCell className="min-w-28">
        <Progress value={linha.adequacaoPct} />
        <span className="numeros mt-1 block whitespace-nowrap text-xs text-muted-foreground">{`${formatarNumero(linha.adequacaoPct, 0)}% (meta ${formatarNumero(linha.metaPct, 0)}%)`}</span>
      </TableCell>
      <TableCell>
        <Badge variant={VARIANTE[linha.estado]}>{ROTULO_ESTADO[linha.estado]}</Badge>
      </TableCell>
      <TableCell>
        {linha.estado === 'abaixo' ? (
          <Button size="sm" variant="outline" onClick={aoCobrir} className="text-primary">
            Cobrir
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

/** Etapa 3: adequação de micronutrientes e ação "cobrir" (CA-25 a CA-40). */
export function TelaAdequacao({ caso, plano, gastoEnergetico, restricoes = [], aoAlterarCaso, aoAlterarPlano, gerarId = idPadrao }: TelaAdequacaoProps) {
  const [cobrindo, setCobrindo] = useState<ChaveNutrienteAlimento | null>(null)
  const prefs = caso.adequacao

  const totais = useMemo(() => totaisDoPlano(plano, buscarAlimento), [plano])
  const resultado = useMemo(() => calcularAdequacao(totais, caso, prefs.preset), [totais, caso, prefs.preset])

  const trocarPreset = (tipo: PresetAdequacao['tipo']) => {
    const preset: PresetAdequacao =
      tipo === 'personalizado' ? { tipo: 'personalizado', referencia: 'rda', minimoPct: 90 } : { tipo }
    aoAlterarCaso({ adequacao: { ...prefs, preset } })
  }

  const rotuloCobrindo = resultado.linhas.find((l) => l.chave === cobrindo)?.rotulo ?? ''
  const nomeAlimento = (id: number) => ALIMENTOS.find((a) => a.id === id)?.descricao ?? ''

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Referência da adequação</CardTitle>
          <CardDescription>Individual usa a RDA; coletivo usa a EAR. Nutrientes sem esses valores usam a AI.</CardDescription>
        </CardHeader>
        <GrupoOpcoes rotulo="Preset" opcoes={TIPO_PRESET} valor={prefs.preset.tipo} aoEscolher={trocarPreset} />

        {prefs.preset.tipo === 'personalizado' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <GrupoOpcoes<'rda' | 'ear'>
              rotulo="Referência"
              opcoes={[
                { valor: 'rda', rotulo: 'RDA' },
                { valor: 'ear', rotulo: 'EAR' },
              ]}
              valor={prefs.preset.referencia}
              aoEscolher={(referencia) => aoAlterarCaso({ adequacao: { ...prefs, preset: { ...prefs.preset, referencia } as PresetAdequacao } })}
            />
            <CampoNumero
              rotulo="Mínimo da meta"
              valor={prefs.preset.tipo === 'personalizado' ? prefs.preset.minimoPct : 90}
              aoMudar={(v) =>
                v !== null && v > 0 && aoAlterarCaso({ adequacao: { ...prefs, preset: { ...prefs.preset, minimoPct: v } as PresetAdequacao } })
              }
              sufixo="%"
            />
          </div>
        ) : null}
      </Card>

      {resultado.motivoSemCalculo ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{resultado.motivoSemCalculo}</p>
        </Alert>
      ) : (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Micronutrientes</CardTitle>
            <CardDescription>{resultado.estagio ? `Estágio de vida: ${descreverEstagio(resultado.estagio)}` : ''}</CardDescription>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nutriente</TableHead>
                  <TableHead>No plano</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Adequação</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.linhas.map((linha) => (
                  <Linha key={linha.chave} linha={linha} aoCobrir={() => setCobrindo(linha.chave)} />
                ))}
              </TableBody>
            </Table>
          </div>

          <TableFootnotes>
            <p>
              <span className="mr-1 align-super text-[10px] font-semibold text-warningtext">†</span>
              Total possivelmente subestimado: algum alimento do plano não tem esse nutriente na tabela de composição. Falta de dado nunca entra como zero.
            </p>
            <p className="mt-1">
              <span className="mr-1 align-super text-[10px] font-semibold text-muted-foreground">‡</span>
              O limite superior da tabela não vale para a forma do nutriente presente nos alimentos; o texto completo aparece ao passar o cursor.
            </p>
            <p className="mt-1">
              Referência: <span className="uppercase">rda</span> no preset individual, <span className="uppercase">ear</span> no coletivo e{' '}
              <span className="uppercase">ai</span> quando o nutriente não tem nenhuma das duas.
            </p>
            <p className="mt-2">{`Composição: ${FONTE_ALIMENTOS.nome}`}</p>
            <p>{`Referências de ingestão: ${resultado.fonte}`}</p>
            {prefs.ocultos.length > 0 ? <p className="mt-1">{`Sugestões ocultas neste caso: ${prefs.ocultos.map(nomeAlimento).join(', ')}.`}</p> : null}
          </TableFootnotes>
        </Card>
      )}

      <GavetaCobrir
        chave={cobrindo}
        rotulo={rotuloCobrindo}
        caso={caso}
        plano={plano}
        totais={totais}
        adequacao={resultado}
        gastoEnergetico={gastoEnergetico}
        restricoes={restricoes}
        aoAlterarCaso={aoAlterarCaso}
        aoFechar={() => setCobrindo(null)}
        aoAdicionar={(refeicaoId, opcao, alimentoId, gramas) => {
          aoAlterarPlano(adicionarItem(plano, refeicaoId, opcao, { alimentoId, gramas }, gerarId))
          setCobrindo(null)
        }}
      />
    </div>
  )
}
