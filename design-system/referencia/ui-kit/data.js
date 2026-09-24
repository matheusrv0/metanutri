// Demo data for the MetaNutri UI kit. Values per 100 g follow TACO 4ª ed. (rounded); plan is fictional.
window.MN_ALIMENTOS = {
  arroz: { d: 'Arroz, integral, cozido', kcal: 124, m: ['colher de servir', 45] },
  feijao: { d: 'Feijão, carioca, cozido', kcal: 76, m: ['concha média', 86] },
  frango: { d: 'Frango, peito, sem pele, grelhado', kcal: 159, m: ['filé médio', 100] },
  alface: { d: 'Alface, crespa, crua', kcal: 11, m: ['folha média', 10] },
  tomate: { d: 'Tomate, com semente, cru', kcal: 15, m: ['fatia média', 15] },
  azeite: { d: 'Azeite, de oliva, extra virgem', kcal: 884, m: ['colher de sopa', 8] },
  pao: { d: 'Pão, trigo, francês', kcal: 300, m: ['unidade', 50] },
  ovo: { d: 'Ovo, de galinha, inteiro, cozido', kcal: 146, m: ['unidade', 45] },
  leite: { d: 'Leite, de vaca, integral', kcal: 61, m: ['copo americano', 165] },
  mamao: { d: 'Mamão, Papaia, cru', kcal: 40, m: ['fatia média', 100] },
  iogurte: { d: 'Iogurte, natural', kcal: 51, m: ['pote', 170] },
  aveia: { d: 'Aveia, flocos, crua', kcal: 394, m: ['colher de sopa', 15] },
  banana: { d: 'Banana, prata, crua', kcal: 98, m: ['unidade média', 55] },
  queijo: { d: 'Queijo, minas, frescal', kcal: 264, m: ['fatia média', 30] },
  leiteDesn: { d: 'Leite, de vaca, desnatado, UHT', kcal: 35, m: ['copo americano', 165] },
  sardinha: { d: 'Sardinha, conserva em óleo', kcal: 285, m: ['unidade', 25] },
  couve: { d: 'Couve, manteiga, refogada', kcal: 90, m: ['colher de sopa', 20] },
  cenoura: { d: 'Cenoura, crua', kcal: 34, m: ['colher de sopa ralada', 12] },
  batata: { d: 'Batata, doce, cozida', kcal: 77, m: ['fatia média', 40] },
};
window.MN_BUSCA = { arroz: 'arroz', 'arroz integral': 'arroz', feijao: 'feijao', 'feijão': 'feijao', frango: 'frango', alface: 'alface', tomate: 'tomate', azeite: 'azeite', pao: 'pao', 'pão': 'pao', ovo: 'ovo', leite: 'leite', mamao: 'mamao', 'mamão': 'mamao', iogurte: 'iogurte', aveia: 'aveia', banana: 'banana', queijo: 'queijo', sardinha: 'sardinha', couve: 'couve', cenoura: 'cenoura', batata: 'batata', 'batata doce': 'batata' };
window.MN_FREQUENTES = [['arroz', 150], ['feijao', 86], ['frango', 100], ['banana', 55], ['ovo', 45], ['aveia', 15]];

window.MN_PLANO_INICIAL = [
  { id: 'r1', horario: '07:00', nome: 'Café da manhã', principal: [['pao', 50], ['ovo', 45], ['leite', 165], ['mamao', 100]], substituto1: [['iogurte', 170], ['aveia', 30]], substituto2: [] },
  { id: 'r2', horario: '12:30', nome: 'Almoço', principal: [['arroz', 150], ['feijao', 86], ['frango', 100], ['alface', 30], ['tomate', 45], ['azeite', 8]], substituto1: [['batata', 160]], substituto2: [] },
  { id: 'r3', horario: '16:00', nome: 'Lanche da tarde', principal: [['iogurte', 170], ['aveia', 15], ['banana', 55]], substituto1: [], substituto2: [] },
  { id: 'r4', horario: '19:30', nome: 'Jantar', principal: [['arroz', 100], ['feijao', 86], ['frango', 100], ['couve', 40]], substituto1: [], substituto2: [] },
];

window.MN_CASOS = [
  { id: 'c1', nome: 'Ana Souza — retorno', modo: 'Atendimento completo', quando: 'hoje às 14:20' },
  { id: 'c2', nome: 'Carlos M., 8 anos', modo: 'Atendimento completo', quando: 'ontem às 21:05' },
  { id: 'c3', nome: 'Júlia (gestante, 2º tri)', modo: 'Prescrição rápida', quando: 'há 3 dias' },
  { id: 'c4', nome: '', modo: 'Prescrição rápida', quando: '12 de setembro' },
];
window.MN_ATIVIDADE = [1, 0, 2, 3, 0, 1, 0, 0, 2, 4, 1, 0, 3, 2];

window.MN_ADEQUACAO = [
  { k: 'calcio', n: 'Cálcio', v: '612 mg', ref: '1.000 mg', tipo: 'RDA', pct: 61, estado: 'abaixo', semDado: 2 },
  { k: 'ferro', n: 'Ferro', v: '19,4 mg', ref: '18 mg', tipo: 'RDA', pct: 108, estado: 'adequado' },
  { k: 'magnesio', n: 'Magnésio', v: '298 mg', ref: '310 mg', tipo: 'RDA', pct: 96, estado: 'adequado', limite: true },
  { k: 'zinco', n: 'Zinco', v: '9,1 mg', ref: '8 mg', tipo: 'RDA', pct: 114, estado: 'adequado' },
  { k: 'vitc', n: 'Vitamina C', v: '142 mg', ref: '75 mg', tipo: 'RDA', pct: 189, estado: 'adequado' },
  { k: 'vita', n: 'Vitamina A', v: '410 µg', ref: '700 µg', tipo: 'RDA', pct: 59, estado: 'abaixo', semDado: 5 },
  { k: 'potassio', n: 'Potássio', v: '2.140 mg', ref: '2.600 mg', tipo: 'AI', pct: 82, estado: 'abaixo' },
  { k: 'fibra', n: 'Fibra alimentar', v: '22,0 g', ref: '25 g', tipo: 'AI', pct: 88, estado: 'abaixo', semDado: 1 },
  { k: 'sodio', n: 'Sódio', v: '2.740 mg', ref: '2.300 mg', tipo: 'CDRR', pct: 119, estado: 'acima-limite' },
];

window.MN_COBRIR = {
  calcio: { falta: '388 mg', kcal: 108, s: [['leiteDesn', 200, 69], ['iogurte', 170, 63], ['sardinha', 50, 71], ['queijo', 30, 45], ['couve', 40, 18]] },
  vita: { falta: '290 µg', kcal: 108, s: [['cenoura', 36, 88], ['couve', 40, 34], ['batata', 80, 21]] },
  potassio: { falta: '460 mg', kcal: 108, s: [['banana', 110, 85], ['feijao', 86, 47], ['batata', 80, 43]] },
  fibra: { falta: '3,0 g', kcal: 108, s: [['aveia', 30, 100], ['feijao', 86, 78], ['couve', 40, 23]] },
};

window.mnFmt = function (n, casas) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); };
window.mnMedida = function (key, g) {
  const a = window.MN_ALIMENTOS[key]; if (!a) return '';
  const q = g / a.m[1]; const r = Math.round(q * 2) / 2;
  return (r === 0 ? '< 1/2' : window.mnFmt(r, r % 1 ? 1 : 0)) + ' ' + a.m[0] + ' (' + window.mnFmt(g) + ' g)';
};
window.mnKcal = function (itens) { return itens.reduce(function (s, it) { const a = window.MN_ALIMENTOS[it[0]]; return s + (a ? a.kcal * it[1] / 100 : 0); }, 0); };
