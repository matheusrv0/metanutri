// As fontes da antropometria completa, num lugar só (spec antropometria-completa, D-1036): a citação curta vai na linha
// do resultado; a completa, no "Fontes" da tela e no documento. As referências são as da pesquisa de 03/11/2026, como ela
// as registrou (autor, revista, ano, páginas, DOI ou PMID).
import referencias from '../data/antropometria.json'

export interface Fonte {
  /** "Autor, ano", para a linha. */
  readonly curta: string
  /** A referência inteira, com DOI ou PMID quando há. */
  readonly citacao: string
}

const DO_JSON = referencias.fontes

/** O rótulo curto do que é proposta nossa, sem diretriz que a sustente (spec antropometria-completa, D-1036 revista). */
export const PROPOSTA_DO_APP = 'Proposta do app (sem diretriz)'

export const FONTES = {
  // Já citadas pelo motor de hoje (`antropometria.json`).
  sisvan2011: { curta: 'SISVAN, 2011', citacao: DO_JSON.sisvan2011 },
  nsi1994: { curta: 'SISVAN (NSI, 1994)', citacao: DO_JSON.nsi1994 },
  who2000: { curta: 'OMS, 2000', citacao: DO_JSON.who2000 },
  who2006e2007: { curta: 'OMS, 2006 e 2007', citacao: DO_JSON.who2006e2007 },
  kac2021: { curta: 'Kac et al., 2021', citacao: DO_JSON.kac2021 },
  pagotto2018: { curta: 'Pagotto et al., 2018', citacao: DO_JSON.pagotto2018 },

  // Protocolos de dobras (pesquisa, seção 2).
  jacksonPollock1978: {
    curta: 'Jackson e Pollock, 1978',
    citacao: 'Jackson AS, Pollock ML. Generalized equations for predicting body density of men. Br J Nutr 1978;40(3):497-504. doi:10.1079/BJN19780152.',
  },
  jacksonPollockWard1980: {
    curta: 'Jackson, Pollock e Ward, 1980',
    citacao: 'Jackson AS, Pollock ML, Ward A. Generalized equations for predicting body density of women. Med Sci Sports Exerc 1980;12(3):175-81. PMID 7402053.',
  },
  durninWomersley1974: {
    curta: 'Durnin e Womersley, 1974',
    citacao:
      'Durnin JVGA, Womersley J. Body fat assessed from total body density and its estimation from skinfold thickness: measurements on 481 men and women aged from 16 to 72 years. Br J Nutr 1974;32(1):77-97. doi:10.1079/BJN19740060.',
  },
  petroski1995: {
    curta: 'Petroski, 1995',
    citacao:
      'Petroski EL. Desenvolvimento e validação de equações generalizadas para a estimativa da densidade corporal em adultos. Tese (Doutorado), UFSM, Santa Maria, 1995. Equações segundo Moura et al., Rev Bras Cineantropom Desempenho Hum 2003;5(2):22-32, e Martins e Fernandes Filho, Rev Bras Cineantropom Desempenho Hum 2006;8(1):22-8.',
  },
  guedes1985: {
    curta: 'Guedes, 1985',
    citacao:
      'Guedes DP. Estudo da gordura corporal através da mensuração dos valores de densidade corporal e da espessura de dobras cutâneas em universitários. Dissertação (Mestrado), UFSM, 1985. Equações segundo Moura et al. 2003 e Petroski e Pires-Neto, Rev Bras Ativ Fís Saúde 1995;1(2):65-73.',
  },
  faulknerYuhasz: {
    curta: 'Faulkner, 1968 (Yuhasz)',
    citacao:
      'Faulkner JA. Physiology of swimming and diving. In: Falls H. Exercise physiology. Baltimore: Academic Press; 1968. Origem em Yuhasz (não publicada), segundo Pires Neto CS, Glaner MF. Rev Bras Cineantropom Desempenho Hum 2007;9(2):207-13.',
  },
  slaughter1988: {
    curta: 'Slaughter et al., 1988',
    citacao: 'Slaughter MH, Lohman TG, Boileau RA, Horswill CA, Stillman RJ, Van Loan MD, Bemben DA. Skinfold equations for estimation of body fatness in children and youth. Hum Biol 1988;60(5):709-23. PMID 3224965.',
  },
  siri1961: {
    curta: 'Siri, 1961',
    citacao: 'Siri WE, 1961. In: Brozek J, Henschel A (eds.). Techniques for measuring body composition. Washington DC: National Academy of Sciences; 1961. p. 223.',
  },
  brozek1963: {
    curta: 'Brozek et al., 1963',
    citacao: 'Brozek J, Grande F, Anderson JT, Keys A. Ann N Y Acad Sci 1963;110:113-40.',
  },
  lohman1986: {
    curta: 'Lohman, 1986',
    citacao: 'Lohman TG. Applicability of body composition techniques and constants for children and youths. Exerc Sport Sci Rev 1986;14:325-57. PMID 3525188.',
  },

  // Indicadores (pesquisa, seção 3).
  gallagher2000: {
    curta: 'Gallagher et al., 2000',
    citacao: 'Gallagher D, Heymsfield SB, Heo M, Jebb SA, Murgatroyd PR, Sakamoto Y. Am J Clin Nutr 2000;72(3):694-701. doi:10.1093/ajcn/72.3.694 (Tabela 4, brancos e afro-americanos).',
  },
  cinturaOms: {
    curta: 'OMS, 2000; SISVAN, 2011',
    citacao: `${DO_JSON.who2000} Tabela 2.2 (cintura, com ≥). ${DO_JSON.sisvan2011} Quadro 17.`,
  },
  who2011: {
    curta: 'OMS, 2011',
    citacao: 'WHO. Waist circumference and waist-hip ratio: report of a WHO expert consultation, Geneva, 8-11 December 2008. Geneva: WHO; 2011 (Tabela A1).',
  },
  nhlbi1998: {
    curta: 'NHLBI, 1998',
    citacao: 'National Heart, Lung, and Blood Institute (NIH/NHLBI). Diretrizes de obesidade de 1998 (cintura no topo da crista ilíaca; cortes > 102 cm e > 88 cm).',
  },
  brayGray1988: {
    curta: 'Bray e Gray, 1988',
    citacao: 'Bray GA, Gray DS. Obesity. Part I: pathogenesis. West J Med 1988;149(4):429-41. Tabela segundo Heyward VH, Stolarczyk LM. Applied body composition assessment. Human Kinetics; 1996.',
  },
  nice2025: {
    curta: 'NICE NG246, 2025',
    citacao:
      'National Institute for Health and Care Excellence. Overweight and obesity management (NG246), 2025, recomendação 1.9.14. Corte de 0,5: Ashwell M, Hsieh SD. Int J Food Sci Nutr 2005;56(5):303-7. doi:10.1080/09637480500195066.',
  },
  benNoun2001: {
    curta: 'Ben-Noun et al., 2001',
    citacao: 'Ben-Noun L, Sohar E, Laor A. Obes Res 2001;9(8):470-7. doi:10.1038/oby.2001.61.',
  },
  frisancho1981: {
    curta: 'Frisancho, 1981',
    citacao: 'Frisancho AR. Am J Clin Nutr 1981;34(11):2540. doi:10.1093/ajcn/34.11.2540 (HANES I, brancos de 1 a 74 anos).',
  },
  frisancho1990: {
    curta: 'Frisancho, 1990',
    citacao:
      'Frisancho AR. Anthropometric standards for the assessment of growth and nutritional status. University of Michigan Press; 1990. Tabelas segundo São Camilo 2025, CEPRAN/UNESP 2014 e Anahp 2022; critério de classificação do São Camilo 2025 (Tabelas 39 a 42).',
  },
  heymsfield1982: {
    curta: 'Heymsfield et al., 1982',
    citacao: 'Heymsfield SB et al. Am J Clin Nutr 1982;36(4):680. doi:10.1093/ajcn/36.4.680 (AMB corrigida: − 10 cm² no homem, − 6,5 cm² na mulher).',
  },
  blackburnThornton1979: {
    curta: 'Blackburn e Thornton, 1979',
    citacao:
      'Blackburn GL, Thornton PA. Med Clin North Am 1979;63(5):1103-15. Faixas segundo o manual de avaliação nutricional do adulto do CEPRAN/UNESP (2014) e o manual de avaliação nutricional de adultos e idosos da UFMA (2022, Quadros 7 e 8).',
  },
  grant1981: {
    curta: 'Grant et al., 1981',
    citacao: 'Grant JP, Custer PB, Thurlow J. Current techniques of nutritional assessment. Surg Clin North Am 1981;61(3):437-63. Cortes segundo São Camilo 2025 (Tabela 6) e CEPRAN/UNESP 2014 (Tabela 5).',
  },
  saoCamilo2025: {
    curta: 'São Camilo, 2025',
    citacao: 'Centro Universitário São Camilo. Padrões de medidas e referências aplicadas na avaliação e diagnóstico nutricional de adultos e idosos. 2025.',
  },
  pesoAjustado: {
    curta: 'CEPRAN, 2014; São Camilo, 2025',
    citacao:
      'Peso ajustado = (peso atual − peso ideal) × 0,25 + peso ideal: manual do CEPRAN/UNESP (2014, item 1.2) e São Camilo 2025 (item 3.3, com o peso ideal no limite máximo do IMC); IMC 25 como na ESPEN (Singer P et al. Clin Nutr 2019;38:48-79).',
  },
  chumlea1985: {
    curta: 'Chumlea et al., 1985',
    citacao: 'Chumlea WC, Roche AF, Steinbaugh ML. J Am Geriatr Soc 1985;33:116-20. PMID 3968366.',
  },
  chumlea1988: {
    curta: 'Chumlea et al., 1988',
    citacao: 'Chumlea WC et al. J Am Diet Assoc 1988;88:564-8 (idosos que não deambulam).',
  },
  rabito2006: {
    curta: 'Rabito et al., 2006',
    citacao: 'Rabito EI et al. Estimativa de peso e altura de pacientes hospitalizados e imobilizados. Rev Nutr 2006;19(6):655-61. doi:10.1590/S1415-52732006000600002.',
  },

  // Ponto de partida (pesquisa, seção 4).
  cunningham1980: {
    curta: 'Cunningham, 1980',
    citacao: 'Cunningham JJ. Am J Clin Nutr 1980;33(11):2372. doi:10.1093/ajcn/33.11.2372.',
  },
  cunningham1991: {
    curta: 'Cunningham, 1991',
    citacao: 'Cunningham JJ. Am J Clin Nutr 1991;54(6):963. doi:10.1093/ajcn/54.6.963. Erro da equação emprestado de ten Haaf T, Weijs PJM. PLoS One 2014. doi:10.1371/journal.pone.0108460.',
  },
  protAge2013: {
    curta: 'PROT-AGE, 2013; ESPEN, 2014',
    citacao: 'Bauer J et al. (PROT-AGE). J Am Med Dir Assoc 2013. doi:10.1016/j.jamda.2013.05.021. Deutz NE et al. (ESPEN). Clin Nutr 2014. doi:10.1016/j.clnu.2014.04.007.',
  },
  issn2017: {
    curta: 'ISSN, 2017',
    citacao: 'Jäger R et al. (International Society of Sports Nutrition, position stand). J Int Soc Sports Nutr 2017. doi:10.1186/s12970-017-0177-8.',
  },
  morton2018: {
    curta: 'Morton et al., 2018',
    citacao: 'Morton RW et al. Br J Sports Med 2018. doi:10.1136/bjsports-2017-097608 (meta-análise; platô em 1,62 g/kg/dia).',
  },
  helms2014: {
    curta: 'Helms et al., 2014',
    citacao: 'Helms ER et al. J Int Soc Sports Nutr 2014. doi:10.1186/1550-2783-11-20 (preparação de fisiculturistas naturais).',
  },
  proteinaObesoProposta: {
    curta: PROPOSTA_DO_APP,
    citacao:
      'Proposta da pesquisa de 03/11/2026 (seção 4.3): 1,2 a 1,5 g/kg do peso de referência no obeso em perda de peso fora da UTI. Nenhuma diretriz de consultório (ESPEN, ASPEN, ABESO) define a faixa nem o peso de referência.',
  },
  nhlbiGuia2000: {
    curta: 'NHLBI, 2000',
    citacao: 'National Heart, Lung, and Blood Institute. Practical Guide. NIH Pub. 00-4084; 2000 (matriz de risco IMC × cintura).',
  },
  ross2020: {
    curta: 'Ross et al., 2020',
    citacao: 'Ross R et al. (IAS/ICCR). Nat Rev Endocrinol 2020. doi:10.1038/s41574-019-0310-7 (cortes de cintura por faixa de IMC).',
  },
  abeso2016: {
    curta: 'ABESO, 2016',
    citacao: 'Associação Brasileira para o Estudo da Obesidade e da Síndrome Metabólica. Diretrizes brasileiras de obesidade 2016. ABESO; 2016.',
  },
  glim2019: {
    curta: 'GLIM, 2019',
    citacao: 'Cederholm T et al. (GLIM). Clin Nutr 2019;38(1):1-9. doi:10.1016/j.clnu.2018.08.002.',
  },
  metaDePerda: {
    curta: 'ABESO, 2016; NHLBI, 2000; AHA/ACC/TOS, 2013',
    citacao:
      'ABESO 2016 (5 a 10% do peso em 6 meses; 0,5 a 1 kg por semana; déficit de 500 a 1.000 kcal; abaixo de 800 kcal, só com supervisão médica); NHLBI Practical Guide 2000 (300 a 500 kcal no sobrepeso); Jensen MD et al. (AHA/ACC/TOS). Circulation 2014;129(25 Supl 2):S102-38 (500 ou 750 kcal); Garthe I et al. 2011 (0,7% do peso por semana em atletas); Heymsfield SB et al. Obes Rev 2014 (cerca de ¼ da perda como massa magra).',
  },
  mudancaMinima: {
    curta: 'ISAK; Weir, 2005',
    citacao:
      'Mudança mínima detectável = 1,96 × √2 × ETM: Weir JP. J Strength Cond Res 2005;19(1):231-40. Metas de ETM da ISAK (nível 1: 7,5% nas dobras e 1,5% nas outras medidas): Applied Sciences 2022;12(6):3056.',
  },
} as const satisfies Readonly<Record<string, Fonte>>

export type ChaveDaFonte = keyof typeof FONTES
