import { useState } from 'react'
import type { MetaGKg, MetaPct, MetasMacros } from '@/domain/tipos.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoMetasProps {
  readonly aberto: boolean
  readonly metas: MetasMacros
  readonly aoConfirmar: (metas: MetasMacros) => void
  readonly aoFechar: () => void
}

type Limites = { readonly min: number | null; readonly max: number | null }

const limites = (meta: MetaPct | MetaGKg | undefined): Limites => ({ min: meta?.min ?? null, max: meta?.max ?? null })

/** CA-24: metas próprias por macro, em % das kcal ou em g/kg para a proteína. */
export function DialogoMetas({ aberto, metas, aoConfirmar, aoFechar }: DialogoMetasProps) {
  const [tipoProteina, setTipoProteina] = useState<'pct' | 'g_kg'>(metas.proteina?.tipo ?? 'pct')
  const [proteina, setProteina] = useState<Limites>(limites(metas.proteina))
  const [carboidrato, setCarboidrato] = useState<Limites>(limites(metas.carboidrato))
  const [gordura, setGordura] = useState<Limites>(limites(metas.gordura))

  const montar = (): MetasMacros => {
    const faixa = (l: Limites) => (l.min === null || l.max === null ? undefined : { min: l.min, max: l.max })
    const p = faixa(proteina)
    const c = faixa(carboidrato)
    const g = faixa(gordura)
    return {
      ...(p ? { proteina: { tipo: tipoProteina, ...p } as MetaPct | MetaGKg } : {}),
      ...(c ? { carboidrato: { tipo: 'pct', ...c } as MetaPct } : {}),
      ...(g ? { gordura: { tipo: 'pct', ...g } as MetaPct } : {}),
    }
  }

  const par = (rotulo: string, valor: Limites, definir: (l: Limites) => void, sufixo: string) => (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="pb-2 text-sm font-semibold text-heading">{rotulo}</legend>
      <CampoNumero rotulo={`${rotulo}: mínimo`} valor={valor.min} aoMudar={(min) => definir({ ...valor, min })} sufixo={sufixo} />
      <CampoNumero rotulo={`${rotulo}: máximo`} valor={valor.max} aoMudar={(max) => definir({ ...valor, max })} sufixo={sufixo} />
    </fieldset>
  )

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metas de macronutrientes</DialogTitle>
          <DialogDescription>Deixe os campos vazios para usar as faixas padrão da idade.</DialogDescription>
        </DialogHeader>

        <GrupoOpcoes<'pct' | 'g_kg'>
          rotulo="Meta de proteína em"
          opcoes={[
            { valor: 'pct', rotulo: '% das kcal' },
            { valor: 'g_kg', rotulo: 'g/kg de peso' },
          ]}
          valor={tipoProteina}
          aoEscolher={setTipoProteina}
        />
        {par('Proteína', proteina, setProteina, tipoProteina === 'pct' ? '%' : 'g/kg')}
        {par('Carboidrato', carboidrato, setCarboidrato, '%')}
        {par('Gordura', gordura, setGordura, '%')}

        <DialogFooter>
          <Button variant="ghost" onClick={() => aoConfirmar({})}>
            Voltar ao padrão
          </Button>
          <Button onClick={() => aoConfirmar(montar())}>Salvar metas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
