# Dados brutos

Arquivos originais, sem edição. Os scripts em `scripts/dados/` geram os JSON de `src/data/` a partir daqui.

| Pasta | Conteúdo | Origem | Licença |
|---|---|---|---|
| `taco/` | `taco_composicao.csv` (597 alimentos, valores por 100 g) e dicionário de dados | TACO 4ª ed. (NEPA/UNICAMP, 2011), normalizada por [brolesi/taco](https://github.com/brolesi/taco), baixada em 15/09/2026 | MIT (repositório); dados públicos da NEPA/UNICAMP |
| `pof/` | `pof_medidas_caseiras.csv` (11.801 medidas de 1.119 alimentos) | POF 2008-2009 (IBGE), normalizada pelo mesmo repositório | MIT (repositório); dados públicos do IBGE |

Codificação especial da TACO: `1e-05` = traço (`Tr`); célula vazia = não analisado.
| `dri/` | Tabelas-resumo das DRI (Apêndice J), páginas HTML oficiais: tab1 EAR · tab2 RDA/AI vitaminas · tab3 RDA/AI elementos · tab4 água e macronutrientes · tab5 AMDR · tab7 CDRR (sódio) · tab8 UL vitaminas · tab9 UL elementos | NASEM, *Dietary Reference Intakes for Sodium and Potassium* (2019), Apêndice J, [NCBI Bookshelf NBK545442](https://www.ncbi.nlm.nih.gov/books/NBK545442/), baixadas em 15/09/2026 | © National Academy of Sciences; uso como referência factual com citação |
| `energia/` | Tabelas-resumo S-1 a S-6 das DRI de Energia: equações de TEE e EER por idade, sexo e categoria de atividade; gestação; lactação exclusiva (0-6 meses) e parcial (7-12 meses) | NASEM, *Dietary Reference Intakes for Energy* (2023), Summary, [NCBI Bookshelf NBK591034](https://www.ncbi.nlm.nih.gov/books/NBK591034/), baixadas em 15/09/2026 | © National Academy of Sciences; uso como referência factual com citação |
| `oms/` | Tabelas LMS expandidas: IMC-para-idade e estatura-para-idade, por sexo. 0 a 5 anos por dia (Padrões OMS 2006) e 5 a 19 anos por mês (Referência OMS 2007) | OMS, [Child Growth Standards](https://www.who.int/tools/child-growth-standards) e [Growth reference 5-19 years](https://www.who.int/tools/growth-reference-data-for-5to19-years), baixadas em 15/09/2026 | Dados públicos da OMS, uso com citação |
| `antropometria/` | Texto extraído (pdftotext, convertido para UTF-8) da norma técnica do SISVAN e do material com as curvas brasileiras de ganho de peso gestacional | Ministério da Saúde, *Orientações para a coleta e análise de dados antropométricos em serviços de saúde: norma técnica do SISVAN* (2011), [PDF](https://portal-antigo.saude.mg.gov.br/images/1_noticias/07_2022/aps/vigilancia-alimentar/orientacoes_coleta_analise_dados_antropometricos.pdf); Kac G, Carrilho TRB et al., Am J Clin Nutr 2021;113:1351-1360, reproduzido em [material Nestlé](https://www.nestleparaespecialistas.com.br/sites/default/files/2023-11/Materna-Bloco-Curvas.pdf), baixados em 15/09/2026 | Documentos públicos, uso com citação |
