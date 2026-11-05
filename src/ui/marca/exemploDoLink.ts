// A paciente de exemplo da prévia de "Sua marca" (spec marca-no-link, DP-ML-15): a mesma do protótipo aprovado. Quatro
// missões, duas feitas hoje, três dias marcados na semana e "Meu plano" ligado, para as abas aparecerem.
import type { Acompanhamento } from '@/domain/acompanhamento.ts'

/** O dia `antes` dias atrás de `hoje` (AAAA-MM-DD), no calendário, sem fuso. */
function diasAntes(hoje: string, antes: number): string {
  const dia = new Date(`${hoje}T12:00:00Z`)
  dia.setUTCDate(dia.getUTCDate() - antes)
  return dia.toISOString().slice(0, 10)
}

export function linkDeExemplo(hoje: string): Acompanhamento {
  return {
    id: 'exemplo',
    token: 'exemplo',
    casoId: 'exemplo',
    pacienteId: null,
    nome: 'Juliana',
    criadoEm: `${diasAntes(hoje, 7)}T12:00:00.000Z`,
    missoes: [
      { id: 'cafe', texto: 'Café da manhã por volta das 7h', origem: 'Refeição do plano' },
      { id: 'almoco', texto: 'Almoço por volta das 12h', origem: 'Refeição do plano' },
      { id: 'frutas', texto: 'Comer as 3 frutas do plano', origem: 'Frutas que estão no plano' },
      { id: 'agua', texto: 'Beber cerca de 2,2 litros de água', origem: 'Meta de água do plano' },
    ],
    marcacoes: [
      { dia: diasAntes(hoje, 3), feitas: ['cafe', 'almoco', 'agua'] },
      { dia: diasAntes(hoje, 1), feitas: ['cafe', 'frutas'] },
      { dia: hoje, feitas: ['cafe', 'almoco'] },
    ],
    usoNaoComercial: false,
    dieta: {
      refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }]] }],
      orientacoes: '',
      receitas: '',
      copiadaEm: hoje,
    },
  }
}
