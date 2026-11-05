import { useState } from 'react'
import type { Caso, MedidasCorporais, PontoDaCintura } from '@/domain/tipos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AJUDAS, type AjudaDaMedida as Ajuda } from './ajudas.ts'
import { AjudaDaMedida } from './AjudaDaMedida.tsx'
import { Escolha } from './Escolha.tsx'
import { LinhaDeMedida, type LadoDaMedida } from './LinhaDeMedida.tsx'

interface CartaoCircunferenciasProps {
  readonly bruto: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

interface Medida {
  readonly id: string
  readonly nome: string
  readonly ajuda: Ajuda
  readonly direito: LadoDaMedida
  readonly esquerdo?: LadoDaMedida
  readonly cintura?: true
}

interface Grupo {
  readonly id: 'superiores' | 'tronco' | 'inferiores'
  readonly nome: string
  readonly comLados: boolean
  readonly medidas: readonly Medida[]
}

/** Os campos de número das medidas (o ponto da cintura é escolha). */
type ChaveDeNumero = Exclude<keyof MedidasCorporais, 'pontoDaCintura'>

const PONTOS: readonly { readonly valor: PontoDaCintura; readonly rotulo: string }[] = [
  { valor: 'ponto-medio', rotulo: 'Ponto médio (OMS)' },
  { valor: 'crista-iliaca', rotulo: 'Crista ilíaca (NIH)' },
]

const preenchida = (m: Medida) => m.direito.valor !== null || (m.esquerdo?.valor ?? null) !== null

/**
 * "Circunferências" (spec antropometria-telas, D-1410): membros superiores, tronco e membros inferiores, cada grupo com
 * "Ocultar" e "Exibir". Direito e esquerdo onde o plano guarda os dois; antebraço e punho num campo só (D-1003). A
 * cintura leva o ponto, e a ajuda dela segue o ponto escolhido.
 */
export function CartaoCircunferencias({ bruto, aoAlterar }: CartaoCircunferenciasProps) {
  const [fechados, setFechados] = useState<ReadonlySet<Grupo['id']>>(new Set())
  const m = bruto.medidasCorporais
  const campo = (chave: ChaveDeNumero): LadoDaMedida => ({
    valor: m[chave],
    aoMudar: (v) => aoAlterar({ medidasCorporais: { ...m, [chave]: v } }),
  })
  const ponto = m.pontoDaCintura

  const grupos: readonly Grupo[] = [
    {
      id: 'superiores',
      nome: 'Membros superiores',
      comLados: true,
      medidas: [
        { id: 'braco', nome: 'Braço relaxado', ajuda: AJUDAS.braco, direito: campo('bracoRelaxadoDireitoCm'), esquerdo: campo('bracoRelaxadoEsquerdoCm') },
        { id: 'braco-contraido', nome: 'Braço contraído', ajuda: AJUDAS.bracoContraido, direito: campo('bracoContraidoDireitoCm'), esquerdo: campo('bracoContraidoEsquerdoCm') },
        { id: 'antebraco', nome: 'Antebraço', ajuda: AJUDAS.antebraco, direito: campo('antebracoCm') },
        { id: 'punho', nome: 'Punho', ajuda: AJUDAS.punho, direito: campo('punhoCm') },
      ],
    },
    {
      id: 'tronco',
      nome: 'Tronco',
      comLados: false,
      medidas: [
        { id: 'pescoco', nome: 'Pescoço', ajuda: AJUDAS.pescoco, direito: campo('pescocoCm') },
        { id: 'ombro', nome: 'Ombro', ajuda: AJUDAS.ombro, direito: campo('ombroCm') },
        { id: 'peitoral', nome: 'Peitoral', ajuda: AJUDAS.peitoral, direito: campo('peitoralCm') },
        {
          id: 'cintura',
          nome: 'Cintura',
          ajuda: ponto === 'crista-iliaca' ? AJUDAS.cinturaCristaIliaca : AJUDAS.cinturaPontoMedio,
          direito: { valor: bruto.circunferenciaCinturaCm, aoMudar: (circunferenciaCinturaCm) => aoAlterar({ circunferenciaCinturaCm }), faixa: 'circunferenciaCinturaCm' },
          cintura: true,
        },
        { id: 'abdomen', nome: 'Abdômen', ajuda: AJUDAS.abdomen, direito: campo('abdomenCm') },
        { id: 'quadril', nome: 'Quadril', ajuda: AJUDAS.quadril, direito: campo('quadrilCm') },
      ],
    },
    {
      id: 'inferiores',
      nome: 'Membros inferiores',
      comLados: true,
      medidas: [
        {
          id: 'panturrilha',
          nome: 'Panturrilha',
          ajuda: AJUDAS.panturrilha,
          // D-1522: a faixa da panturrilha da etapa 1, nos dois lados (é a mesma medida).
          direito: { valor: bruto.circunferenciaPanturrilhaCm, aoMudar: (circunferenciaPanturrilhaCm) => aoAlterar({ circunferenciaPanturrilhaCm }), faixa: 'circunferenciaPanturrilhaCm' },
          esquerdo: { ...campo('panturrilhaEsquerdaCm'), faixa: 'circunferenciaPanturrilhaCm' },
        },
        { id: 'coxa-proximal', nome: 'Coxa proximal', ajuda: AJUDAS.coxaProximal, direito: campo('coxaProximalDireitaCm'), esquerdo: campo('coxaProximalEsquerdaCm') },
        { id: 'coxa', nome: 'Coxa média', ajuda: AJUDAS.coxa, direito: campo('coxaDireitaCm'), esquerdo: campo('coxaEsquerdaCm') },
      ],
    },
  ]

  const alternar = (id: Grupo['id']) =>
    setFechados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  return (
    <section aria-labelledby="titulo-circunferencias">
      <Card className="gap-4">
        <div className="relative flex items-center gap-2">
          <CardTitle id="titulo-circunferencias">Circunferências</CardTitle>
          <AjudaDaMedida nome="Fita" rotulo="Como usar a fita" ajuda={AJUDAS.fita} />
        </div>
        {grupos.map((g) => {
          const aberto = !fechados.has(g.id)
          const cheias = g.medidas.filter(preenchida).length
          return (
            <div key={g.id} className="flex flex-col gap-1">
              <div className="flex min-h-8 items-center gap-3">
                <h3 id={`grupo-${g.id}`} className="text-sm font-bold text-heading">
                  {g.nome}
                </h3>
                <Button variant="link" size="sm" className="ml-auto px-1" aria-expanded={aberto} aria-controls={`corpo-${g.id}`} onClick={() => alternar(g.id)}>
                  {aberto ? 'Ocultar' : 'Exibir'}
                </Button>
              </div>
              {aberto ? (
                <div id={`corpo-${g.id}`} role="group" aria-labelledby={`grupo-${g.id}`} className="grid">
                  {g.comLados ? (
                    <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem] gap-x-3 pb-1 text-xs text-muted-foreground sm:grid">
                      <span />
                      <span className="pr-3 text-right">Direito</span>
                      <span className="pr-3 text-right">Esquerdo</span>
                    </div>
                  ) : null}
                  {g.medidas.map((md) => (
                    <LinhaDeMedida
                      key={md.id}
                      nome={md.nome}
                      ajuda={md.ajuda}
                      direito={md.direito}
                      esquerdo={md.esquerdo}
                      comLados={g.comLados}
                      abaixoDoNome={
                        md.cintura ? (
                          <Escolha
                            rotulo="Ponto da cintura"
                            rotuloOculto
                            compacto
                            className="w-full sm:w-52"
                            vazio="Ponto não registrado"
                            opcoes={PONTOS}
                            valor={ponto}
                            aoEscolher={(pontoDaCintura) => aoAlterar({ medidasCorporais: { ...m, pontoDaCintura } })}
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{`${cheias} de ${g.medidas.length} medidas preenchidas`}</p>
              )}
            </div>
          )
        })}
      </Card>
    </section>
  )
}
