// O pedido, o banco e o modelo de mentira dos testes da função sugerir-plano (spec assistente-ia). O nome não termina
// em `.test.ts`, então o Vitest não roda este arquivo como teste.

/** Um pedido completo do modo gerar, como o navegador manda (a gestante do desenho, seção 10.2). */
export const PEDIDO_BASE = {
  versao: 1,
  modo: 'gerar',
  consentimento: true,
  paciente: {
    idadeAnos: 34,
    idadeMeses: 2,
    sexo: 'F',
    pesoKg: 72.3,
    estaturaCm: 165,
    fase: { tipo: 'gestante', semanas: 24 },
    atividade: 'Pouco ativo',
    objetivo: 'manter',
    objetivoTexto: 'ter mais disposição',
    doencas: ['Anemia'],
    outrosDiagnosticos: '',
    medicamentos: 'sulfato ferroso',
  },
  restricoes: { avisos: ['Alergia: leite e derivados'], textos: ['coentro'], naoGosta: ['figado', 'jilo'], cuidados: ['Na gestação, evite fígado.'] },
  rotina: { sono: 'acorda 6h, dorme 23h', trabalho: 'escritório, 8h às 17h', ondeCome: 'marmita no almoço', orcamento: 'economico', gosta: 'tapioca, frango', exercicio: '', extra: '' },
  metas: { kcal: 2150, proteina: { tipo: 'g_kg', min: 1.1, max: 1.5 }, carboidrato: { tipo: 'pct', min: 45, max: 65 }, gordura: { tipo: 'pct', min: 20, max: 35 }, foco: ['ferro', 'folato', 'cálcio'] },
  refeicoes: [
    { nome: 'Café da manhã', horario: '06:30' },
    { nome: 'Almoço', horario: '12:00' },
  ],
  naoUsar: [513, 488, 512, 488],
  meusAlimentos: [{ id: 900012, nome: 'Pão de fermentação natural', grupo: 'Cereais e derivados', unidade: 'g', kcal: 250, p: 9, c: 48, g: 1.5 }],
  plano: null,
  lacunas: null,
  pedido: '',
} as const
