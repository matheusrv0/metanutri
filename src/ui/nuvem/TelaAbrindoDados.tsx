import type { FaseDaNuvem } from '@/domain/sincronia.ts'

const TEXTOS: Readonly<Record<Exclude<FaseDaNuvem, 'pronta'>, string>> = {
  abrindo: 'Carregando seus dados…',
  // CA-484: a entrada não trouxe os dados; o motor tenta de novo quando a internet volta.
  'sem-conexao': 'Sem internet. Conecte-se para abrir seus dados.',
  // Uma cópia gravada por uma versão mais nova do MetaNutri não é sobrescrita por esta.
  'formato-desconhecido': 'A cópia na nuvem está num formato que este MetaNutri não entende.',
}

interface TelaAbrindoDadosProps {
  readonly fase: Exclude<FaseDaNuvem, 'pronta'>
}

/** O que aparece no lugar da área de trabalho enquanto os dados da nuvem não chegaram (spec dados-na-nuvem). */
export function TelaAbrindoDados({ fase }: TelaAbrindoDadosProps) {
  return (
    <div role={fase === 'abrindo' ? 'status' : 'alert'} className="grid min-h-dvh place-content-center bg-background px-6 text-center text-sm text-muted-foreground">
      {TEXTOS[fase]}
    </div>
  )
}
