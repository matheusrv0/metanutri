# Revisão clínica — os casos para a nutricionista conferir

Material pronto para entregar a uma nutricionista. Ela não precisa saber nada do
código: abre o app, digita os dados de cada caso e confere se o número bate com o que
ela calcularia na mão.

**Por que isso não pode ser pulado:** os cálculos seguem as referências certas, mas
ninguém com formação conferiu o resultado. É a única pendência da lista que não é
decisão de produto nem código — é segurança.

**Como entregar:** mande o endereço <https://matheusrv0.github.io/metanutri/> e este
arquivo. Peça para ela anotar na coluna "bate?" e devolver.

## Os seis casos

Escolhidos para cobrir cada faixa de equação que o sistema usa. Se os seis baterem, o
motor de cálculo está de pé; se um furar, o erro está localizado.

### Caso 1 — adulta eutrófica (Mifflin-St Jeor)

Mulher, 28 anos, 60 kg, 1,65 m, atividade leve (fator 1,37).

| Conferir | Esperado pelo app | Bate? |
|---|---|---|
| IMC e classificação | 22,0 kg/m² · Eutrofia |  |
| TMB |  |  |
| GET |  |  |
| Distribuição de macros |  |  |

### Caso 2 — adulto com sobrepeso (Harris-Benedict)

Homem, 45 anos, 92 kg, 1,78 m, atividade moderada (fator 1,55). Troque a fórmula para
Harris-Benedict na etapa 1.

| Conferir | Esperado pelo app | Bate? |
|---|---|---|
| IMC e classificação |  |  |
| TMB pelas duas fórmulas (a diferença é esperada) |  |  |
| GET |  |  |

### Caso 3 — criança (curvas da OMS)

Menina, 7 anos, 23 kg, 1,22 m.

| Conferir | Esperado pelo app | Bate? |
|---|---|---|
| Escore-z de IMC para idade |  |  |
| Classificação pelo SISVAN |  |  |
| Energia (equação do NASEM para a idade) |  |  |
| As DRI usadas são as da faixa etária certa |  |  |

### Caso 4 — adolescente

Menino, 14 anos, 52 kg, 1,63 m, atividade intensa (fator 1,7).

| Conferir | Esperado pelo app | Bate? |
|---|---|---|
| Escore-z e classificação |  |  |
| Energia |  |  |
| Ferro e cálcio: a DRI usada é a de 14 a 18 anos? |  |  |

### Caso 5 — gestante

Mulher, 31 anos, 68 kg antes da gestação, 1,70 m, 24 semanas, atividade leve.

| Conferir | Esperado pelo app | Bate? |
|---|---|---|
| Ganho de peso recomendado (Kac 2021) |  |  |
| Acréscimo energético da gestação |  |  |
| Ferro, folato e cálcio com a DRI de gestante |  |  |

### Caso 6 — lactante

Mulher, 29 anos, 64 kg, 1,62 m, 3 meses de lactação, atividade leve.

| Conferir | Esperado pelo app | Bate? |
|---|---|---|
| Acréscimo energético da lactação |  |  |
| DRI de lactante nos micros |  |  |

## Conferir também, em qualquer um dos casos

- [ ] **O botão "cobrir"** sugere alimento que realmente fecha a falta? A porção é
      plausível para uma pessoa comer?
- [ ] **Medida caseira** bate com a gramagem?
- [ ] **Nutriente sem dado** aparece como travessão ou hachura — nunca como zero?
- [ ] **O documento em Word** sai no formato que a faculdade aceita?
- [ ] **As missões** geradas do plano fazem sentido para dar a um paciente?

## O que já sabemos que está faltando na base

Não é erro de cálculo, é buraco da TACO — está admitido em tela, mas vale ela saber:

- Vitamina D, B12, folato, açúcares e gordura saturada **não existem** na TACO. Só
  aparecem em produto cadastrado pelo rótulo.
- Dos 597 alimentos, só 6 têm todos os nutrientes. 57,3% não têm vitamina A e 39,4%
  não têm fibra.

## Depois

Quando ela devolver: cada "não bate" vira um item no `docs/backlog.md` com o caso que
reproduz. Divergência em ferramenta de saúde é bug de prioridade máxima — antes de
qualquer feature nova.
