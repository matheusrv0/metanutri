# Avisos de terceiros

## MaterialM Free (design e componentes de interface)

Base do visual entre 15 e 21/09/2026: raios grandes, botão pílula e a estrutura de menu lateral mais cabeçalho, que
continuam valendo. A partir de 24/09/2026 a cor e a tipografia passaram a vir do design system em `design-system/`
(ver `DESIGN.md`); os componentes de `design-system/componentes/` ainda descendem deste template.
Template: https://github.com/wrappixel/MaterialM-Tailwind-Nextjs-Free

```
MIT License

Copyright (c) 2026 by WrapPixel

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Tabela TACO normalizada e medidas caseiras da POF

Dados reorganizados por https://github.com/brolesi/taco (licença MIT, © 2026 Fabio Fogliarini Brolesi) a partir de
publicações públicas da NEPA/UNICAMP (TACO, 4ª edição, 2011) e do IBGE (POF 2008-2009). Texto da licença em
`dados-brutos/taco/LICENSE`.

## USDA FoodData Central (vitamina D, B12, folato, vitamina E, selênio e gordura trans)

Valores de alimento equivalente para os 308 alimentos da TACO que têm equivalente, em `src/data/complemento-usda.json`,
gerado por `scripts/dados/importar-usda.mjs` (spec vitaminas-usda). Domínio público, CC0 1.0 Universal; o USDA pede
só a citação: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019.
fdc.nal.usda.gov. Conjuntos SR Legacy (abril de 2018) e Foundation Foods (abril de 2026), baixados em 20/10/2026 de
https://fdc.nal.usda.gov/download-datasets/.

## USDA FoodData Central (base ampliada: alimentos genéricos que a TACO não tem)

Os 638 alimentos de `src/data/base-ampliada.json`, gerado por `scripts/dados/importar-base-ampliada.mjs` a partir dos
arquivos oficiais e da curadoria em `dados-brutos/usda/` (spec base-ampliada). Domínio público, CC0 1.0 Universal; o
USDA pede só a citação: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019.
fdc.nal.usda.gov. Conjuntos SR Legacy (abril de 2018) e Foundation Foods (outubro de 2026), baixados em 29/10/2026 de
https://fdc.nal.usda.gov/download-datasets/. Os nomes em português, os grupos e as marcas da curadoria são do MetaNutri.

## Referências nutricionais e antropométricas

Valores factuais citados com fonte: NASEM (Dietary Reference Intakes, 2019 e Energy, 2023), OMS (curvas de crescimento
2006 e 2007), Ministério da Saúde (norma técnica do SISVAN, 2011) e Kac et al., Am J Clin Nutr 2021. Detalhes em
`dados-brutos/README.md`.

## Efeitos de interface da 21st.dev

Os seis componentes de `design-system/componentes/efeitos/` (fundo aurora, padrão de grade, botão de fluxo, botão
origin, marca-texto e linha do tempo animada) são adaptações de componentes publicados em https://21st.dev, usados
apenas na área pública. Não fazem parte dos 25 componentes do design system.

## Referências visuais do design system

O export que originou `design-system/` (Claude Design, 24/09/2026) trazia oito capturas de um estudo de caso de painel
financeiro de terceiros, usadas só como referência de linguagem visual. **Elas não foram incorporadas ao projeto**: nem
a marca, nem o texto, nem as telas de lá aparecem no MetaNutri, e os arquivos não estão neste repositório.

Os ícones são do conjunto **Lucide** (licença ISC, © Lucide Contributors), embutidos via `lucide-react` para funcionar
offline. As fontes **Manrope** e **Bricolage Grotesque** são distribuídas sob a SIL Open Font License 1.1 e embutidas via
`@fontsource`.

## Fonte Manrope (todo o site)

A partir de 05/10/2026, a spec limpeza-visual usa **Manrope** em títulos, texto e números (antes, Urbanist nos títulos
e Inter nos números; as duas saíram do projeto). Distribuída sob a SIL Open Font License 1.1 e embutida via
`@fontsource-variable` para o app continuar funcionando offline.

## University Domains List (domínios de faculdades)

Base da lista de domínios de e-mail de faculdades brasileiras do plano Estudante
(`src/data/dominios-faculdades-br.json` e `supabase/005-estudante.sql`), somada a um
complemento revisado à mão. Gerada por `scripts/dominios-faculdades.mjs`.
Fonte: https://github.com/Hipo/university-domains-list

```
The MIT License (MIT)

Copyright (c) 2014-2025 Hipo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fotos da landing escura (CC0)

Fotos em domínio público (CC0 1.0, sem crédito obrigatório; registradas aqui por cuidado), convertidas para webp
de até 1.600 px e 800 px em `public/imagens/` (spec landing-escura, D-547). Licença:
https://creativecommons.org/publicdomain/zero/1.0/

- `legumes-na-bancada*.webp` — "Free closeup fresh vegetables kitchen", rawpixel:
  https://www.rawpixel.com/image/5924770/photo-image-public-domain-plant-nature
- `dois-copos-de-leite*.webp` — "Two Glasses of Milk (52633675811)", Alabama Extension, Wikimedia Commons:
  https://commons.wikimedia.org/w/index.php?curid=165949173
- `salada-com-frango*.webp` — "Chicken salad on striped tablecloth", Kotivalo, Wikimedia Commons:
  https://commons.wikimedia.org/w/index.php?curid=71067537
- `iogurte-com-frutas*.webp` (o topo da landing, spec landing-v3, D-654) — "Healthy Meal Prep (Unsplash)", Sambazon,
  Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Healthy_Meal_Prep_(Unsplash).jpg

## Open Food Facts (catálogo de rótulos: produtos de marca do Brasil)

Os 23096 produtos de `public/catalogo-off/2026-10-29/`, gerados por `scripts/dados/importar-catalogo-off.mjs` a
partir da exportação oficial (https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz) de 2026-10-29 (spec base-ampliada, fase 2). Dados do Open Food
Facts (https://world.openfoodfacts.org) sob a Open Database License (ODbL) v1.0; conteúdos individuais sob a Database
Contents License (DbCL) v1.0. Os arquivos publicados são um banco derivado, oferecido sob a mesma ODbL, com o aviso
`LICENCA.txt` ao lado; ficam separados da TACO e do USDA.

## Imagens da ajuda da antropometria (CDC/NCHS, domínio público; Navazob, CC BY 4.0)

As 15 imagens de `public/imagens/antropometria/`, mostradas no "?" de cada medida da avaliação antropométrica (spec
antropometria-telas, D-1415). Foram só reduzidas (até 800 px no lado maior) e convertidas para WebP; nenhum conteúdo
foi alterado, recortado ou traduzido. O crédito de cada uma aparece também embaixo da imagem, na própria ajuda.

**CDC/NCHS.** Obras do governo federal dos EUA, em domínio público (17 U.S.C. §105). A política de reuso do CDC
(https://www.cdc.gov/other/agencymaterials.html) pede a fonte, que o material também está disponível de graça no site
da agência e que o uso não sugira endosso. Crédito mostrado no app: "Fonte: CDC/NCHS – NHANES Anthropometry
Procedures Manual (ano). Domínio público; disponível gratuitamente em cdc.gov. O uso não implica endosso do CDC."
Manuais:

- 1988: NHANES III Anthropometric Procedures Manual, https://wwwn.cdc.gov/nchs/data/nhanes3/manuals/anthro.pdf
- 2005: NHANES Body Measurements (Anthropometry) Manual, 2005–2006,
  https://wwwn.cdc.gov/nchs/data/nhanes/public/2005/manuals/BM.pdf
- 2007: NHANES Anthropometry Procedures Manual, 2007–2008,
  https://wwwn.cdc.gov/nchs/data/nhanes/public/2007/manuals/manual_an.pdf
- 2021: NHANES 2021 Anthropometry Procedures Manual,
  https://wwwn.cdc.gov/nchs/data/nhanes/public/2021/manuals/2021-Anthropometry-Procedures-Manual-508.pdf

| Arquivo | Medida | Origem (página do PDF) | Licença |
|---|---|---|---|
| `altura-estadiometro-posicao-cdc-2021.webp` | Estatura | Manual de 2021, p. 35, Exhibit 3-4 "Standing height position" | Domínio público (CDC/NCHS) |
| `altura-joelho-cdc-1988.webp` | Altura do joelho | Manual de 1988, p. 26, Exhibit 3-4 "SP position for knee height" | Domínio público (CDC/NCHS) |
| `circ-braco-relaxado-cdc-2021.webp` | Braço relaxado | Manual de 2021, p. 46, Exhibit 3-17 "Adult arm circumference" | Domínio público (CDC/NCHS) |
| `circ-cintura-crista-iliaca-foto-cdc-2021.webp` | Cintura na crista ilíaca (NIH) | Manual de 2021, p. 48, Exhibit 3-20 "Measuring tape position for waist circumference" | Domínio público (CDC/NCHS) |
| `circ-quadril-foto-cdc-2021.webp` | Quadril | Manual de 2021, p. 49, Exhibit 3-21 "Measuring tape position for hip (buttocks) circumference" | Domínio público (CDC/NCHS) |
| `circ-panturrilha-cdc-2005.webp` | Panturrilha (fita e altura da dobra) | Manual de 2005, p. 28, Exhibit 3-3 "Measuring tape position for maximal calf circumference" | Domínio público (CDC/NCHS) |
| `circ-coxa-medial-cdc-2005.webp` | Coxa média | Manual de 2005, p. 34, Exhibit 3-6 "Measuring tape position for thigh circumference" | Domínio público (CDC/NCHS) |
| `coxa-ponto-medio-cdc-2005.webp` | Dobra da coxa (o ponto) | Manual de 2005, p. 27, Exhibit 3-2 "SP position for upper leg length location and upper leg midpoint" | Domínio público (CDC/NCHS) |
| `diametro-cotovelo-posicao-cdc-1988.webp` | Diâmetro do cotovelo (a posição) | Manual de 1988, p. 38, Exhibit 3-11 "SP position for elbow breadth" | Domínio público (CDC/NCHS) |
| `dobra-subescapular-foto-cdc-2005.webp` | Dobra subescapular | Manual de 2005, p. 41, Exhibit 3-13 "Correct placement of caliper jaws (subscapular skinfold)" | Domínio público (CDC/NCHS) |
| `dobra-suprailiaca-local-cdc-1988.webp` | Dobra supra-ilíaca, linha axilar média | Manual de 1988, p. 37, Exhibit 3-10 "Location of suprailiac skinfold" | Domínio público (CDC/NCHS) |
| `dobra-tecnica-pincamento-diagrama-cdc-2005.webp` | Como pinçar a dobra | Manual de 2005, p. 36, Exhibit 3-7 "Diagram of a skinfold measurement" | Domínio público (CDC/NCHS) |
| `dobra-triceps-foto-cdc-2007.webp` | Dobra do tríceps | Manual de 2007, p. 50, Exhibit 3-13 "Triceps skinfold measurement" | Domínio público (CDC/NCHS) |

**Navazob, Wikimedia Commons.** Licença Creative Commons Atribuição 4.0 Internacional (CC BY 4.0),
https://creativecommons.org/licenses/by/4.0/deed.pt-br. Crédito mostrado no app: "Foto: Navazob / Wikimedia Commons,
CC BY 4.0." com o link da licença. Alteração: reduzida e convertida para WebP.

| Arquivo | Medida | Origem | Licença |
|---|---|---|---|
| `peso-balanca-navazob.webp` | Peso | "Balanza para pesar de pie", Navazob (obra própria), https://commons.wikimedia.org/wiki/File:Balanza_para_pesar_de_pie.jpg | CC BY 4.0 |
| `fita-antropometrica-navazob.webp` | A fita das circunferências | "Cintas métricas", Navazob (obra própria), https://commons.wikimedia.org/wiki/File:Cintas_m%C3%A9tricas.jpg | CC BY 4.0 |

Para refazer os arquivos (spec antropometria-telas, DP-AT-19): Pillow, `Image.thumbnail((800, 800))` e
`save(..., 'WEBP', quality=82, method=6)`, a partir dos originais listados acima.
