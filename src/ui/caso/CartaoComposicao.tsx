import { PROTOCOLOS, calcularComposicao, completarBioimpedancia, type ProtocoloDobras } from '@/domain/composicao.ts'
import type { Caso } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Fontes } from '@ds/componentes/display/Fontes.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface CartaoComposicaoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

const NOME_DOBRA: Record<string, string> = {
  tricipital: 'Tricipital',
  subescapular: 'Subescapular',
  suprailiaca: 'Supra-ilíaca',
  abdominal: 'Abdominal',
  peitoral: 'Peitoral',
  coxa: 'Coxa',
}

/** Dobras cutâneas e bioimpedância, com o resultado e a fonte da equação usada. */
export function CartaoComposicao({ caso, aoAlterar }: CartaoComposicaoProps) {
  const { composicao } = caso
  const protocolo = PROTOCOLOS.find((p) => p.id === composicao.protocolo) ?? PROTOCOLOS[0]
  const usadas = caso.sexo && protocolo ? protocolo.necessarias(caso.sexo) : []

  const resultado = calcularComposicao({
    protocolo: composicao.protocolo,
    sexo: caso.sexo,
    idadeAnos: caso.idadeAnos,
    pesoKg: caso.pesoKg,
    dobras: composicao.dobras,
  })

  const bio = completarBioimpedancia(composicao.bioimpedancia, caso.pesoKg)

  const alterarDobra = (chave: keyof typeof composicao.dobras, valor: number | null) =>
    aoAlterar({ composicao: { ...composicao, dobras: { ...composicao.dobras, [chave]: valor } } })

  const alterarBio = (mudanca: Partial<typeof composicao.bioimpedancia>) =>
    aoAlterar({ composicao: { ...composicao, bioimpedancia: { ...composicao.bioimpedancia, ...mudanca } } })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composição corporal</CardTitle>
        <CardDescription>Opcional. Preencha dobras, bioimpedância ou as duas; o resultado aparece com a equação usada.</CardDescription>
      </CardHeader>

      <GrupoOpcoes<ProtocoloDobras>
        rotulo="Protocolo de dobras"
        opcoes={PROTOCOLOS.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        valor={composicao.protocolo}
        aoEscolher={(protocoloNovo) => aoAlterar({ composicao: { ...composicao, protocolo: protocoloNovo } })}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(NOME_DOBRA) as (keyof typeof composicao.dobras)[]).map((chave) => (
          <CampoNumero
            key={chave}
            rotulo={NOME_DOBRA[chave] ?? chave}
            valor={composicao.dobras[chave]}
            aoMudar={(v) => alterarDobra(chave, v)}
            sufixo="mm"
            {...(usadas.includes(chave) ? { dica: 'Usada neste protocolo' } : {})}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="rotulo">Resultado das dobras</p>
        {resultado.gorduraPct === null ? (
          <p className="text-sm text-muted-foreground">{resultado.motivoSemCalculo}</p>
        ) : (
          <>
            <p className="numeros text-base font-semibold text-heading">
              {`${formatarNumero(resultado.gorduraPct, 1)}% de gordura`}
              {resultado.massaGordaKg !== null && resultado.massaMagraKg !== null
                ? ` · ${formatarNumero(resultado.massaGordaKg, 1)} kg de massa gorda · ${formatarNumero(resultado.massaMagraKg, 1)} kg de massa magra`
                : ''}
            </p>
            <Fontes itens={[{ texto: resultado.fonte }]} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <p className="rotulo">Bioimpedância</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero rotulo="Gordura" valor={composicao.bioimpedancia.gorduraPct} aoMudar={(v) => alterarBio({ gorduraPct: v })} sufixo="%" />
          <CampoNumero rotulo="Massa magra" valor={composicao.bioimpedancia.massaMagraKg} aoMudar={(v) => alterarBio({ massaMagraKg: v })} sufixo="kg" />
          <CampoNumero rotulo="Água corporal" valor={composicao.bioimpedancia.aguaPct} aoMudar={(v) => alterarBio({ aguaPct: v })} sufixo="%" />
          <CampoTexto rotulo="Aparelho" valor={composicao.bioimpedancia.aparelho} aoMudar={(v) => alterarBio({ aparelho: v })} placeholder="Marca e modelo…" />
        </div>
        {bio.massaGordaKg !== null ? (
          <p className="numeros text-sm text-muted-foreground">
            {`Com ${formatarNumero(caso.pesoKg ?? 0, 1)} kg: ${formatarNumero(bio.massaGordaKg, 1)} kg de massa gorda${
              bio.massaMagraKg === null ? '' : ` e ${formatarNumero(bio.massaMagraKg, 1)} kg de massa magra`
            }.`}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
