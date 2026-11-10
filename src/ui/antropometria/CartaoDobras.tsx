import { useState } from 'react'
import { pacienteDoProtocolo } from '@/domain/indicadoresDeGordura.ts'
import { idadeValida, medidaValida } from '@/domain/linhaDoResultado.ts'
import { PROTOCOLOS_DE_DOBRAS, aplicacaoDoProtocolo, protocoloPorId, type DobraCutanea, type EntradaDaEquacao, type GrupoDoEstudo, type MaturacaoSexual } from '@/domain/protocolosDeDobras.ts'
import type { Adipometro, Caso } from '@/domain/tipos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { AJUDAS, type AjudaDaMedida as Ajuda } from './ajudas.ts'
import { AjudaDaMedida } from './AjudaDaMedida.tsx'
import { CampoMedida } from './CampoMedida.tsx'
import { Escolha } from './Escolha.tsx'
import { dobrasNaTela, emFrase, fraseDasDobras, sobreOProtocolo } from './textosDaAvaliacao.ts'

interface CartaoDobrasProps {
  /** O plano como vale (com a ficha): o sexo e a idade escolhem as dobras e a população. */
  readonly caso: Caso
  readonly bruto: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

const ADIPOMETROS: readonly { readonly valor: Adipometro; readonly rotulo: string }[] = [
  { valor: 'lange', rotulo: 'Lange' },
  { valor: 'harpenden', rotulo: 'Harpenden' },
  { valor: 'outro', rotulo: 'Outro' },
]

const MATURACOES: readonly { readonly valor: MaturacaoSexual; readonly rotulo: string }[] = [
  { valor: 'pre-pubere', rotulo: 'Pré-púbere (Tanner 1 e 2)' },
  { valor: 'pubere', rotulo: 'Púbere (Tanner 3)' },
  { valor: 'pos-pubere', rotulo: 'Pós-púbere (Tanner 4 e 5)' },
]

const GRUPOS: readonly { readonly valor: GrupoDoEstudo; readonly rotulo: string }[] = [
  { valor: 'branco', rotulo: 'Branco' },
  { valor: 'negro', rotulo: 'Negro' },
]

const NOME_DA_ENTRADA: Readonly<Record<EntradaDaEquacao, string>> = {
  sexo: 'o sexo',
  idade: 'a idade',
  peso: 'o peso',
  estatura: 'a estatura',
  maturacao: 'a maturação sexual',
  grupo: 'o grupo do estudo',
}

const SO_COM_VALOR: readonly DobraCutanea[] = ['suprailiaca', 'supraespinal']

/** A ajuda de cada dobra; a do bíceps pelo protocolo (D-1465) e a da peitoral pelo sexo (D-1464). */
function ajudaDaDobra(chave: DobraCutanea, caso: Caso): Ajuda {
  switch (chave) {
    case 'tricipital':
      return AJUDAS.tricipital
    case 'bicipital':
      return caso.composicao.protocolo === 'durnin-womersley' ? AJUDAS.bicipitalDurnin : AJUDAS.bicipital
    case 'subescapular':
      return AJUDAS.subescapular
    case 'peitoral':
      return caso.sexo === 'F' ? AJUDAS.peitoralDobraMulher : caso.sexo === 'M' ? AJUDAS.peitoralDobraHomem : AJUDAS.peitoralDobraSemSexo
    case 'axilarMedia':
      return AJUDAS.axilarMedia
    case 'suprailiacaAnt':
      return AJUDAS.suprailiacaAnt
    case 'suprailiacaMed':
      return AJUDAS.suprailiacaMed
    case 'suprailiaca':
      return AJUDAS.suprailiaca
    case 'abdominal':
      return AJUDAS.abdominal
    case 'coxa':
      return AJUDAS.coxaDobra
    case 'panturrilhaMedial':
      return AJUDAS.panturrilhaMedial
    case 'supraespinal':
      return AJUDAS.supraespinal
  }
}

/**
 * "Dobras cutâneas" (spec antropometria-telas, D-1412 a D-1414): o protocolo (os 8 do motor), o adipômetro, a linha do
 * protocolo e as 10 dobras, com as do protocolo marcadas e as outras apagadas e guardadas. Trocar de protocolo não apaga
 * nenhuma dobra.
 */
export function CartaoDobras({ caso, bruto, aoAlterar }: CartaoDobrasProps) {
  const { composicao, avaliacao } = bruto
  const { protocolo, dobras } = composicao
  // D-1412: a supraespinal e a suprailíaca de antes aparecem por ter valor; apagadas aqui, continuam à vista até sair da tela.
  const [vistas] = useState<ReadonlySet<DobraCutanea>>(() => new Set(SO_COM_VALOR.filter((d) => medidaValida(dobras[d]) !== null)))
  const idade = idadeValida(caso.idadeAnos)
  const { sexo } = caso
  const lista = dobrasNaTela(protocolo, sexo, dobras, (d) => vistas.has(d))
  const ap = aplicacaoDoProtocolo(protocolo, pacienteDoProtocolo(caso), dobras, { maturacao: avaliacao.maturacao, grupo: avaliacao.grupoDoEstudo })
  const sobre = sobreOProtocolo(protocolo, sexo, idade)
  const slaughterNoMenino = protocolo === 'slaughter-triceps-subescapular' && sexo === 'M'

  let destaque: string
  if (!protocoloPorId(protocolo)) destaque = 'Este protocolo não existe nesta versão do app: escolha outro.'
  else if (sexo === null) destaque = 'Falta o sexo para escolher as dobras do protocolo.'
  else {
    const entradas = ap.entradasQueFaltam.map((e) => NOME_DA_ENTRADA[e])
    const falta = ap.dobrasQueFaltam.length === 0 && entradas.length > 0 ? ` ${entradas.length === 1 ? 'Falta' : 'Faltam'} ${emFrase(entradas)} para calcular a gordura.` : ''
    destaque = `${fraseDasDobras(ap.dobrasExigidas.length, ap.dobrasQueFaltam.length)}${falta}`
  }

  const alterarAvaliacao = (mudanca: Partial<Caso['avaliacao']>) => aoAlterar({ avaliacao: { ...avaliacao, ...mudanca } })

  return (
    <section aria-labelledby="titulo-dobras">
      <Card className="gap-4">
        <div className="relative flex items-center gap-2">
          <CardTitle id="titulo-dobras">Dobras cutâneas</CardTitle>
          <AjudaDaMedida nome="Como pinçar" rotulo="Como pinçar a dobra" ajuda={AJUDAS.pincamento} />
        </div>
        <div className="grid gap-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_11.25rem]">
            <Escolha
              rotulo="Protocolo"
              vazio="Escolha o protocolo"
              opcoes={PROTOCOLOS_DE_DOBRAS.map((p) => ({ valor: p.id, rotulo: p.nome, desativada: p.id.startsWith('slaughter') && idade !== null && idade > 18 }))}
              valor={protocolo}
              aoEscolher={(id) => aoAlterar({ composicao: { ...composicao, protocolo: id } })}
            />
            <Escolha rotulo="Adipômetro" vazio="Escolha o adipômetro" opcoes={ADIPOMETROS} valor={avaliacao.adipometro} aoEscolher={(adipometro) => alterarAvaliacao({ adipometro })} />
          </div>
          {slaughterNoMenino ? (
            <div className="grid gap-2">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <Escolha rotulo="Maturação sexual" vazio="Escolha o estágio" opcoes={MATURACOES} valor={avaliacao.maturacao} aoEscolher={(maturacao) => alterarAvaliacao({ maturacao })} />
                <Escolha rotulo="Grupo do estudo" vazio="Escolha o grupo" opcoes={GRUPOS} valor={avaliacao.grupoDoEstudo} aoEscolher={(grupoDoEstudo) => alterarAvaliacao({ grupoDoEstudo })} />
              </div>
              <p className="text-xs text-muted-foreground">Pedidos quando a soma é de até 35 mm. O grupo é a classificação do estudo e não foi validado para a população brasileira.</p>
            </div>
          ) : null}
          {sobre ? (
            <div className="grid gap-1 rounded-xl bg-surfacerow px-3.5 py-3 text-sm">
              <p className="text-foreground">{sobre.linha}</p>
              {sobre.nota ? <p className="text-muted-foreground">{sobre.nota}</p> : null}
              {sobre.fora ? <p className="font-medium text-warningtext">{sobre.fora}</p> : null}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">{destaque}</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-3.5 sm:grid-cols-2">
          {lista.map((d, i) => (
            <CampoMedida
              key={d.chave}
              rotulo={d.nome}
              unidade="mm"
              valor={dobras[d.chave]}
              aoMudar={(v) => aoAlterar({ composicao: { ...composicao, dobras: { ...dobras, [d.chave]: v } } })}
              ajuda={ajudaDaDobra(d.chave, caso)}
              posicaoDaAjuda={i % 2 === 1 ? 'top-8 left-auto right-0' : undefined}
              marcada={d.marcada}
              apagada={!d.marcada}
            />
          ))}
        </div>
      </Card>
    </section>
  )
}
