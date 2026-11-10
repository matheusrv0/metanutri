// O assistente de IA nos e2e e nos prints (spec assistente-ia, CA-2380): a conta com uma paciente e um plano, já na
// nuvem falsa, e as respostas da função sugerir-plano de mentira. A API da Anthropic nunca é chamada.
// Dados inventados: Camila Duarte Freitas, gestante de 24 semanas, com alergia a leite (o protótipo de 03/11).

export const PACIENTE_IA = 'pac-camila'
export const CASO_IA = 'caso-camila'
export const CASO_IA_CHEIO = 'caso-patricia'
export const PACIENTE_IA_CHEIO = 'pac-patricia'

/** A data de hoje no fuso do navegador do teste (a gestação é contada a partir dela). */
const hoje = (): string => new Date().toISOString().slice(0, 10)

const item = (id: string, alimentoId: number, gramas: number) => ({ id, alimentoId, gramas })
const refeicao = (id: string, nome: string, horario: string, principal: ReturnType<typeof item>[] = []) => ({
  id,
  nome,
  horario,
  opcoes: { principal, substituto1: [], substituto2: [] },
})

function caso(id: string, pacienteId: string, nome: string, mudar: Record<string, unknown> = {}) {
  return {
    id,
    nome,
    pacienteId,
    modo: 'completo',
    quantidades: 'medida-e-gramas',
    dataConsulta: hoje(),
    pesoKg: 68,
    estaturaCm: 163,
    objetivo: 'manter',
    energia: { fator: 1.37, formula: 'mifflin', getManual: null },
    ...mudar,
  }
}

/**
 * A cópia da conta que a nuvem falsa devolve: a gestante com o café começado, e uma adulta com o plano inteiro (para o
 * adequar). As autorizações estão gravadas; `semAutorizacao` tira a da gestante.
 */
export function copiaDaContaComIa(opcoes: { readonly semAutorizacao?: boolean } = {}): unknown {
  const agora = new Date().toISOString()
  const autorizacao = { em: '2026-10-14', versao: 'ia-1' }
  const pacientes = [
    {
      id: PACIENTE_IA,
      nome: 'Camila Duarte Freitas',
      sexo: 'F',
      nascimento: '1997-05-10',
      telefone: '(84) 99999-1234',
      email: 'camila.freitas@exemplo.com',
      objetivo: 'ter mais disposição',
      momentoDeVida: { tipo: 'gestante', semanas: 24, semanasEm: hoje(), pesoPreGestacionalKg: 64 },
      restricoesMarcadas: ['leite'],
      doencas: ['anemia'],
      medicamentos: 'sulfato ferroso',
      respostasAnamnese: [{ perguntaId: 'nao-gosta', blocoId: 'alimentacao', pergunta: 'Alimentos de que não gosta', resposta: 'Fígado, jiló' }],
      consentimentoIa: opcoes.semAutorizacao ? null : autorizacao,
      criadoEm: agora,
      atualizadoEm: agora,
    },
    {
      id: PACIENTE_IA_CHEIO,
      nome: 'Patrícia Nogueira Lins',
      sexo: 'F',
      nascimento: '1985-02-02',
      telefone: '',
      email: '',
      objetivo: '',
      restricoesMarcadas: [],
      doencas: [],
      respostasAnamnese: [
        { perguntaId: 'gosta', blocoId: 'alimentacao', pergunta: 'Alimentos de que gosta', resposta: 'pão francês, frango' },
        { perguntaId: 'nao-gosta', blocoId: 'alimentacao', pergunta: 'Alimentos de que não gosta', resposta: 'Nenhum' },
      ],
      consentimentoIa: autorizacao,
      criadoEm: agora,
      atualizadoEm: agora,
    },
  ]
  const gestante = {
    caso: caso(CASO_IA, PACIENTE_IA, 'Plano de novembro'),
    plano: {
      refeicoes: [
        refeicao('r1', 'Café da manhã', '06:30', [item('i1', 53, 50), item('i2', 488, 50)]),
        refeicao('r2', 'Lanche da manhã', '09:30'),
        refeicao('r3', 'Almoço', '12:00'),
        refeicao('r4', 'Lanche da tarde', '15:30'),
        refeicao('r5', 'Jantar', '19:30'),
        refeicao('r6', 'Ceia', '22:00'),
      ],
    },
    formato: 1,
    versao: 1,
    atualizadoEm: agora,
  }
  const adulta = {
    caso: caso(CASO_IA_CHEIO, PACIENTE_IA_CHEIO, 'Plano de retorno', { pesoKg: 76, estaturaCm: 165, objetivo: 'emagrecer', metaEnergiaKcal: null, energia: { fator: 1.2, formula: 'mifflin', getManual: 1700 } }),
    plano: {
      refeicoes: [
        refeicao('a1', 'Café da manhã', '07:00', [item('b1', 53, 100), item('b2', 461, 40), item('b3', 471, 50), item('b4', 215, 240)]),
        refeicao('a2', 'Lanche da manhã', '10:00', [item('b5', 13, 30)]),
        refeicao('a3', 'Almoço', '12:30', [item('b6', 3, 150), item('b7', 561, 60), item('b8', 377, 100), item('b9', 78, 30), item('b10', 157, 60)]),
        refeicao('a4', 'Lanche da tarde', '16:00', [item('b11', 182, 75), item('b12', 448, 170)]),
        refeicao('a5', 'Jantar', '19:30', [item('b13', 3, 150), item('b14', 410, 120), item('b15', 91, 150)]),
        refeicao('a6', 'Ceia', '21:30', [item('b16', 222, 130)]),
      ],
    },
    formato: 1,
    versao: 1,
    atualizadoEm: agora,
  }
  return {
    formato: 1,
    geradoEm: agora,
    dados: {
      'metanutri:pacientes': JSON.stringify(pacientes),
      'metanutri:casos': JSON.stringify([CASO_IA, CASO_IA_CHEIO]),
      [`metanutri:caso:${CASO_IA}`]: JSON.stringify(gestante),
      [`metanutri:caso:${CASO_IA_CHEIO}`]: JSON.stringify(adulta),
    },
  }
}

/** Um id que não existe na Base MetaNutri (CA-2380: sai como "Alimento fora da base"). */
export const ID_FORA_DA_BASE = 1_999_999

/**
 * A sugestão do protótipo, em ids e gramas (a resposta da função depois da conferência dela): o leite pega a alergia
 * (opção 2 do lanche da tarde) e um id fora da base no jantar. Os dois saem na conferência do navegador, com o motivo.
 */
export const SUGESTAO_IA = {
  refeicoes: [
    { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }, { alimentoId: 488, gramas: 50 }, { alimentoId: 226, gramas: 170 }], opcao2: [{ alimentoId: 533, gramas: 135 }, { alimentoId: 488, gramas: 50 }] },
    { refeicao: 1, principal: [{ alimentoId: 182, gramas: 75 }, { alimentoId: 7, gramas: 30 }], opcao2: [{ alimentoId: 222, gramas: 130 }] },
    {
      refeicao: 2,
      principal: [{ alimentoId: 3, gramas: 150 }, { alimentoId: 561, gramas: 140 }, { alimentoId: 410, gramas: 100 }, { alimentoId: 116, gramas: 40 }, { alimentoId: 157, gramas: 60 }, { alimentoId: 214, gramas: 180 }],
      opcao2: [{ alimentoId: 1, gramas: 150 }, { alimentoId: 577, gramas: 100 }, { alimentoId: 301, gramas: 120 }],
    },
    { refeicao: 3, principal: [{ alimentoId: 52, gramas: 50 }, { alimentoId: 163, gramas: 100 }, { alimentoId: 251, gramas: 150 }], opcao2: [{ alimentoId: 458, gramas: 200 }] },
    { refeicao: 4, principal: [{ alimentoId: 3, gramas: 120 }, { alimentoId: 567, gramas: 100 }, { alimentoId: 377, gramas: 100 }, { alimentoId: 64, gramas: 80 }, { alimentoId: 100, gramas: 60 }, { alimentoId: ID_FORA_DA_BASE, gramas: 50 }], opcao2: [] },
    { refeicao: 5, principal: [{ alimentoId: 582, gramas: 200 }, { alimentoId: 7, gramas: 20 }], opcao2: [{ alimentoId: 182, gramas: 75 }] },
  ],
  mudancas: [],
  pontosAConfirmar: ['Sem laticínios, o cálcio fica baixo. Decida a fonte com o pré-natal.', 'Confirme o horário do sulfato ferroso, longe das refeições com cálcio.'],
}

/** O adequar do protótipo: trocas e gramas no plano da adulta; o amendoim barrado não entra (ela não tem a alergia). */
export const AJUSTES_IA = {
  refeicoes: [],
  mudancas: [
    { tipo: 'gramas', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: 50, motivo: '−150 kcal no café' },
    { tipo: 'trocar', refeicao: 1, opcao: 'principal', item: 0, alimentoId: 226, gramas: 170, motivo: 'Menos sódio, mais fibra' },
    { tipo: 'trocar', refeicao: 2, opcao: 'principal', item: 0, alimentoId: 1, gramas: 150, motivo: 'Mais fibra e magnésio' },
    { tipo: 'gramas', refeicao: 2, opcao: 'principal', item: 1, alimentoId: null, gramas: 140, motivo: 'Mais fibra, ferro e magnésio' },
    { tipo: 'trocar', refeicao: 4, opcao: 'principal', item: 2, alimentoId: 100, gramas: 80, motivo: 'Mais cálcio e fibra' },
    { tipo: 'trocar', refeicao: 5, opcao: 'principal', item: 0, alimentoId: 449, gramas: 170, motivo: 'Mais cálcio, mesma energia' },
    { tipo: 'adicionar', refeicao: 3, opcao: 'principal', item: null, alimentoId: ID_FORA_DA_BASE, gramas: 20, motivo: 'Mais magnésio' },
  ],
  pontosAConfirmar: [],
}
