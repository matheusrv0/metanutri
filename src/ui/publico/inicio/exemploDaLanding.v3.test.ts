// Temporário (spec landing-v3, PLAN T12): os números da v3 que a seção antiga ainda usa ("Grama por grama"); sai com ela.
import { buscarAlimentos } from '@/domain/busca.ts'
import { nomeParaPaciente } from '@/domain/nomeParaPaciente.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { DIA_EM_GRAMAS } from './exemploDaLanding.ts'

/** O texto que a nutricionista digitaria para cada linha: os gramas e o alimento. */
const BUSCA: Readonly<Record<string, string>> = {
  'Pão francês': '50 pao frances',
  'Ovo cozido': '45 ovo cozido',
  'Mamão Formosa': '170 mamao formosa',
  'Arroz branco cozido': '85 arroz tipo 1 cozido',
  'Feijão carioca cozido': '140 feijao carioca cozido',
  'Patinho grelhado sem gordura': '100 patinho grelhado',
  'Abóbora cabotiá cozida': '72 abobora cabotia cozida',
  'Chuchu cozido': '110 chuchu cozido',
  'Banana prata': '75 banana prata',
  'Iogurte natural desnatado': '150 iogurte natural desnatado',
}

describe('CA-1605: Grama por grama vem da Base MetaNutri', () => {
  it('cada linha da tabela: o nome para a paciente, os gramas e as calorias da base', () => {
    for (const item of DIA_EM_GRAMAS.flatMap((refeicao) => refeicao.itens)) {
      const texto = BUSCA[item.alimento]
      if (!texto) throw new Error(`Sem busca para ${item.alimento}`)
      const r = buscarAlimentos(texto, ALIMENTOS).resultados[0]
      if (!r || r.gramas === null) throw new Error(`A base não acha "${texto}"`)
      expect(item, texto).toEqual({
        alimento: nomeParaPaciente(r.alimento),
        gramas: `${formatarNumero(r.gramas, 0)} g`,
        kcal: `${formatarNumero(((r.alimento.nutrientes.energia_kcal ?? 0) * r.gramas) / 100, 0)} kcal`,
      })
    }
  })
})
