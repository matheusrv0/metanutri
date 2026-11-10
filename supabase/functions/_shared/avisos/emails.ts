// Os nove e-mails (spec lado-do-paciente, D-1224, D-1233, D-1234 e seção 6): S1 a S4 de serviço, A1 a A4 de aviso e o
// N1 à nutricionista. Cada um é uma função pura que devolve o assunto, o pré-cabeçalho, o HTML e o texto puro.
//
// O desenho é o dos e-mails de conta (supabase/emails): chão marfim, cartão branco de 480 px, tabela HTML, letra Manrope
// com Arial de reserva (o Gmail mostra Arial), claro só (`color-scheme: light`). O botão é uma pílula de 48 px na cor da
// marca da nutricionista com letra branca, ou teal com marfim sem marca; o N1 é sempre teal. Sem imagem, sem pixel e
// sem link de rastreio (D-1233, CA-2280). O e-mail nunca leva a dieta, o peso, doença, a mensagem da nutricionista, o
// nome de um alimento, telefone nem sobrenome inteiro (D-1233, CA-2213, CA-2268): as funções nem recebem esses dados.
//
// As cores em hexadecimal são as únicas do código fora dos tokens: o HTML de e-mail não lê variável de CSS. Elas espelham
// design-system/tokens/tokens.css (a exceção está no eslint.config.js).
import { NOME_DO_AVISO, todoDia, type TipoDeAviso } from './tipos.ts'

// ---------- As cores (espelho dos tokens) ----------

/** --ivory, o chão. */
const MARFIM = '#f6f2ea'
/** --teal-900, a marca do MetaNutri: o botão sem marca e o N1. */
const TEAL = '#0e3b43'
const BRANCO = '#ffffff'
/** --ink-900 e --gray-700: o texto e o texto de apoio do tema claro. */
const TINTA = '#1c222a'
const SUAVE = '#585b62'
/** --gray-200, a borda do cartão; o fio entre linhas e o contorno do botão são os do protótipo aprovado. */
const BORDA = '#e5e5e7'
const FIO = '#ececee'
const CONTORNO = '#c4c6cb'
/** --green-100 e --green-800: o dia com missão. */
const DIA_MARCADO = '#dcf3e7'
const DIA_MARCADO_TINTA = '#0d6b45'
/** --mesa: o dia sem missão. */
const DIA_VAZIO = '#f1f0f0'
/** O vermelho do erro no tema claro: o número de quem parou de marcar. */
const ALERTA = '#b42318'

/** A letra do corpo: a Manrope, com Arial de reserva (D-1234). */
const LETRA = 'Manrope, Arial, Helvetica, sans-serif'

// ---------- O que entra em todo e-mail ----------

/** Quem assina o e-mail ao paciente (D-1225, D-1234). */
export interface Remetente {
  /** O nome do Perfil da nutricionista ("Ana Lima"); vazio sem nome. */
  readonly nome: string
  /** "Nutricionista · CRN-3 12345", "Nutricionista" ou "Estágio de nutrição, sob supervisão" (CA-2258). */
  readonly registro: string
  /** A cor da marca dela (`#rrggbb`); nula ou sem contraste com o branco, o teal do MetaNutri. */
  readonly cor: string | null
}

export interface EmailMontado {
  readonly assunto: string
  readonly preCabecalho: string
  readonly html: string
  readonly texto: string
}

/** CA-2258: a linha de baixo do nome. */
export function linhaDoRegistro(dados: { readonly estudante: boolean; readonly crnRegiao: number | null; readonly crnNumero: string | null }): string {
  if (dados.estudante) return 'Estágio de nutrição, sob supervisão'
  return dados.crnRegiao !== null && dados.crnNumero ? `Nutricionista · CRN-${dados.crnRegiao} ${dados.crnNumero}` : 'Nutricionista'
}

/** "Juliana Martins, 34 anos" → "Juliana"; nome vazio → nulo (CB-1227). O link guarda o nome do plano. */
export function primeiroNomeDe(nome: string): string | null {
  const primeiro = nome.trim().split(/[\s,;]+/)[0] ?? ''
  return primeiro === '' ? null : primeiro
}

const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

/** D-1231 e CA-2268: o primeiro nome e a inicial do último sobrenome: "Juliana Martins" → "Juliana M.". */
export function nomeCurto(nome: string): string {
  const partes = (nome.split(',')[0] ?? '').trim().split(/\s+/).filter(Boolean)
  const primeiro = partes[0] ?? ''
  const sobrenome = [...partes.slice(1)].reverse().find((p) => !PARTICULAS.has(p.toLowerCase()))
  const inicial = sobrenome?.[0]?.toUpperCase()
  return inicial ? `${primeiro} ${inicial}.` : primeiro
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const numeroDoDia = (dia: string): number => Number(dia.slice(8, 10))
const nomeDoMes = (dia: string): string => MESES[Number(dia.slice(5, 7)) - 1] ?? ''
/** "1º" no primeiro dia do mês, como se escreve. */
const diaNoTexto = (dia: string): string => (numeroDoDia(dia) === 1 ? '1º' : String(numeroDoDia(dia)))

/** "3 de novembro" (AAAA-MM-DD). */
export const dataPorExtenso = (dia: string): string => `${diaNoTexto(dia)} de ${nomeDoMes(dia)}`

/** "de 26 de outubro a 1º de novembro"; no mesmo mês, "de 2 a 8 de novembro". */
export function periodo(inicio: string, fim: string): string {
  return inicio.slice(0, 7) === fim.slice(0, 7) ? `de ${diaNoTexto(inicio)} a ${dataPorExtenso(fim)}` : `de ${dataPorExtenso(inicio)} a ${dataPorExtenso(fim)}`
}

/** O texto que vem de fora (nomes) nunca vira HTML. */
export function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const maiuscula = (texto: string): string => (texto === '' ? texto : `${texto[0]?.toUpperCase() ?? ''}${texto.slice(1)}`)

/** CA-2287: "Juliana, seu plano está neste link." ou, sem nome, "Seu plano está neste link.", sem vírgula sobrando. */
export const comNome = (primeiroNome: string | null, frase: string): string => (primeiroNome ? `${primeiroNome}, ${frase}` : maiuscula(frase))

/** Quem fez: "Ana Lima", ou "sua nutricionista" sem nome no Perfil. */
const quem = (remetente: Remetente): string => remetente.nome.trim() || 'sua nutricionista'

// ---------- A cor do botão (D-1234) ----------

const linear = (canal: number): number => {
  const c = canal / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminancia = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * linear(r ?? 0) + 0.7152 * linear(g ?? 0) + 0.0722 * linear(b ?? 0)
}

/** O botão: a cor dela com letra branca (4,5:1 ou mais com o branco, D-954), ou o teal com o marfim. */
export function corDoBotao(cor: string | null): { readonly fundo: string; readonly tinta: string } {
  if (cor !== null && /^#[0-9a-f]{6}$/i.test(cor)) {
    const contraste = 1.05 / (luminancia(cor.toLowerCase()) + 0.05)
    if (contraste >= 4.5) return { fundo: cor.toLowerCase(), tinta: BRANCO }
  }
  return { fundo: TEAL, tinta: MARFIM }
}

// ---------- As peças do HTML ----------

type Peca = { readonly html: string; readonly texto: string }

const paragrafo = (texto: string): Peca => ({
  html: `<tr><td style="padding:0 26px 16px 26px; font-family:${LETRA}; font-size:16px; line-height:24px; color:${TINTA};">${escapar(texto)}</td></tr>`,
  texto,
})

const nota = (texto: string): Peca => ({
  html: `<tr><td style="padding:0 26px 16px 26px; font-family:${LETRA}; font-size:14px; line-height:20px; color:${SUAVE};">${escapar(texto)}</td></tr>`,
  texto,
})

const titulo = (texto: string): Peca => ({
  html: `<tr><td style="padding:0 26px 12px 26px; font-family:${LETRA}; font-size:15px; line-height:20px; font-weight:bold; color:${TINTA};">${escapar(texto)}</td></tr>`,
  texto: `\n${texto}`,
})

const separador = (): Peca => ({
  html: `<tr><td style="padding:4px 26px 20px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px; line-height:1px; font-size:1px; background-color:${FIO};">&nbsp;</td></tr></table></td></tr>`,
  texto: '',
})

/** CA-2288: a pílula de 48 px, feita de tabela para o Outlook. */
function pilula(texto: string, url: string, cor: { readonly fundo: string; readonly tinta: string }, tamanho: 'grande' | 'pequena' = 'grande'): string {
  const altura = tamanho === 'grande' ? 48 : 40
  const letra = tamanho === 'grande' ? 16 : 14
  const lado = tamanho === 'grande' ? 26 : 18
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" height="${altura}" bgcolor="${cor.fundo}" style="height:${altura}px; border-radius:999px; background-color:${cor.fundo};">` +
    `<a href="${escapar(url)}" style="display:inline-block; padding:0 ${lado}px; line-height:${altura}px; font-family:${LETRA}; font-size:${letra}px; font-weight:bold; color:${cor.tinta}; text-decoration:none; border-radius:999px;">${escapar(texto)}</a>` +
    `</td></tr></table>`
  )
}

const botao = (texto: string, url: string, cor: { readonly fundo: string; readonly tinta: string }): Peca => ({
  html: `<tr><td style="padding:4px 26px 20px 26px;">${pilula(texto, url, cor)}</td></tr>`,
  texto: `${texto}: ${url}`,
})

/** O botão de contorno ("Quero receber os avisos"), também de 48 px. */
const botaoDeContorno = (texto: string, url: string): Peca => ({
  html:
    `<tr><td style="padding:4px 26px 20px 26px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" height="48" bgcolor="${BRANCO}" style="height:48px; border:1px solid ${CONTORNO}; border-radius:999px; background-color:${BRANCO};">` +
    `<a href="${escapar(url)}" style="display:inline-block; padding:0 22px; line-height:46px; font-family:${LETRA}; font-size:15px; font-weight:bold; color:${TINTA}; text-decoration:none; border-radius:999px;">${escapar(texto)}</a>` +
    `</td></tr></table></td></tr>`,
  texto: `${texto}: ${url}`,
})

const lista = (itens: readonly string[]): Peca => ({
  html:
    `<tr><td style="padding:0 26px 16px 26px;"><ul style="margin:0; padding:0 0 0 20px; font-family:${LETRA}; font-size:15px; line-height:24px; color:${TINTA};">` +
    itens.map((i) => `<li>${escapar(i)}</li>`).join('') +
    `</ul></td></tr>`,
  texto: itens.map((i) => `- ${i}`).join('\n'),
})

/** O topo do cartão: o nome da nutricionista e o registro dela, ou "MetaNutri". */
function topo(remetente: Remetente | null): Peca {
  if (remetente === null || remetente.nome.trim() === '') {
    return {
      html: `<tr><td style="padding:24px 26px 18px 26px; font-family:Arial, Helvetica, sans-serif; font-size:19px; line-height:24px; font-weight:bold; color:${TEAL};">MetaNutri</td></tr>`,
      texto: 'MetaNutri',
    }
  }
  return {
    html:
      `<tr><td style="padding:24px 26px 18px 26px; font-family:${LETRA};">` +
      `<div style="font-size:18px; line-height:24px; font-weight:bold; color:${TINTA};">${escapar(remetente.nome.trim())}</div>` +
      `<div style="font-size:13px; line-height:18px; color:${SUAVE};">${escapar(remetente.registro)}</div>` +
      `</td></tr>`,
    texto: `${remetente.nome.trim()}\n${remetente.registro}`,
  }
}

interface Rodape {
  readonly linhas: readonly string[]
  /** O descadastro do rodapé: o texto e a página (D-1235). */
  readonly sair?: { readonly texto: string; readonly url: string }
}

function rodape({ linhas, sair }: Rodape): Peca {
  const estilo = `font-family:${LETRA}; font-size:12.5px; line-height:18px; color:${SUAVE};`
  const html =
    linhas.map((l) => `<tr><td style="padding:0 0 8px 0; ${estilo}">${escapar(l)}</td></tr>`).join('') +
    (sair ? `<tr><td style="padding:0 0 8px 0; ${estilo}"><a href="${escapar(sair.url)}" style="color:${TINTA}; text-decoration:underline;">${escapar(sair.texto)}</a></td></tr>` : '') +
    `<tr><td style="padding:0; font-family:${LETRA}; font-size:13px; line-height:18px; font-weight:bold; color:${TEAL};">MetaNutri</td></tr>`
  const texto = [...linhas, ...(sair ? [`${sair.texto}: ${sair.url}`] : []), 'MetaNutri'].join('\n')
  return { html, texto }
}

/** O e-mail inteiro: o pré-cabeçalho escondido, o chão marfim, o cartão de 480 px e o rodapé de fora. */
function montar(e: { readonly assunto: string; readonly preCabecalho: string; readonly topo: Peca; readonly corpo: readonly Peca[]; readonly rodape: Rodape }): EmailMontado {
  const pe = rodape(e.rodape)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>${escapar(e.assunto)}</title>
</head>
<body style="margin:0; padding:0; background-color:${MARFIM};">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapar(e.preCabecalho)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${MARFIM}" style="background-color:${MARFIM};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRANCO}" style="max-width:480px; background-color:${BRANCO}; border:1px solid ${BORDA}; border-radius:12px;">
        ${e.topo.html}
        ${e.corpo.map((p) => p.html).join('\n        ')}
        <tr><td style="padding:0 0 10px 0; font-size:1px; line-height:1px;">&nbsp;</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr><td style="padding:16px 26px 4px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${pe.html}</table></td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
  const texto = [e.topo.texto, '', ...e.corpo.map((p) => p.texto).filter((t) => t !== ''), '', '--', pe.texto].join('\n')
  return { assunto: e.assunto, preCabecalho: e.preCabecalho, html, texto }
}

// ---------- Os nove ----------

/** O link de um plano no S1. */
export interface PlanoDoEmail {
  readonly remetente: Remetente
  readonly url: string
  /** No S1 de recuperação com mais de um link da mesma nutricionista (o casal do CB-1210), o primeiro nome do paciente. */
  readonly paciente?: string | null
}

const RODAPE_DO_PEDIDO = 'Você pediu este link em app.metanutri.com.br. Se não foi você, ignore este e-mail.'
const GUARDE = 'O link é pessoal. Guarde este e-mail para abrir quando precisar.'

/**
 * S1, "Seu link do plano": o paciente pediu (D-1221) ou recuperou (D-1220). Com um plano, o topo é o da nutricionista;
 * com mais de um, "MetaNutri" e uma linha por plano, com "Abrir" (CB-1200).
 */
export function emailLinkDoPlano(dados: { readonly primeiroNome: string | null; readonly planos: readonly PlanoDoEmail[] }): EmailMontado {
  const [unico] = dados.planos
  if (dados.planos.length === 1 && unico) {
    return montar({
      assunto: 'Seu link do plano',
      preCabecalho: 'Abra o seu plano com um toque.',
      topo: topo(unico.remetente),
      corpo: [paragrafo(comNome(dados.primeiroNome, 'este é o link do seu plano.')), botao('Abrir meu plano', unico.url, corDoBotao(unico.remetente.cor)), nota(GUARDE)],
      rodape: { linhas: [RODAPE_DO_PEDIDO] },
    })
  }
  const linhas: Peca[] = dados.planos.map((p, i) => {
    const nome = quem(p.remetente) === 'sua nutricionista' ? 'Sua nutricionista' : p.remetente.nome.trim()
    const rotulo = p.paciente ? `${nome} · ${p.paciente}` : nome
    const fio = i === 0 ? '' : `border-top:1px solid ${FIO};`
    return {
      html:
        `<tr><td style="padding:0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
        `<td style="padding:12px 0; ${fio} font-family:${LETRA};"><div style="font-size:15px; line-height:20px; font-weight:bold; color:${TINTA};">${escapar(rotulo)}</div>` +
        `<div style="font-size:13px; line-height:18px; color:${SUAVE};">${escapar(p.remetente.registro)}</div></td>` +
        `<td align="right" style="padding:12px 0; ${fio}">${pilula('Abrir', p.url, corDoBotao(p.remetente.cor), 'pequena')}</td>` +
        `</tr></table></td></tr>`,
      texto: `${rotulo}: ${p.url}`,
    }
  })
  return montar({
    assunto: 'Seu link do plano',
    preCabecalho: 'Abra o seu plano com um toque.',
    topo: topo(null),
    corpo: [paragrafo(comNome(dados.primeiroNome, 'estes são os links dos seus planos.')), ...linhas, { html: '<tr><td style="padding:0 0 8px 0;"></td></tr>', texto: '' }, nota(GUARDE)],
    rodape: { linhas: [RODAPE_DO_PEDIDO] },
  })
}

const PEDIDO_NA_FRASE: Readonly<Record<TipoDeAviso, string>> = {
  plano: 'avisar quando o plano mudar',
  semana: 'mandar o resumo da semana',
  lembrete: 'lembrar das missões se você ficar 3 dias sem marcar',
}

/** "a, b e c". */
const juntar = (partes: readonly string[]): string => (partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1] ?? ''}`)

const enviouPeloMetaNutri = (remetente: Remetente): string => `${maiuscula(quem(remetente))} enviou este e-mail pelo MetaNutri. Para falar com ela, responda.`

/**
 * S2, "Ana Lima enviou seu plano" (D-1224). Com avisos oferecidos e ainda não aceitos, o bloco "Avisos por e-mail" com
 * "Quero receber os avisos" (CA-2243). O rodapé tem "Não quero receber e-mails deste plano" (CA-2254).
 */
export function emailPlanoEnviado(dados: {
  readonly primeiroNome: string | null
  readonly remetente: Remetente
  readonly url: string
  /** O dia do plano no link (AAAA-MM-DD). */
  readonly atualizadoEm: string
  readonly convite: { readonly avisos: readonly TipoDeAviso[]; readonly url: string } | null
  readonly urlSair: string
}): EmailMontado {
  const atualizado = `Atualizado em ${dataPorExtenso(dados.atualizadoEm)}.`
  const convite: Peca[] =
    dados.convite && dados.convite.avisos.length > 0
      ? [
          separador(),
          titulo('Avisos por e-mail'),
          paragrafo(`${maiuscula(quem(dados.remetente))} pode ${juntar(dados.convite.avisos.map((a) => PEDIDO_NA_FRASE[a]))}.`),
          botaoDeContorno('Quero receber os avisos', dados.convite.url),
        ]
      : []
  return montar({
    assunto: `${maiuscula(quem(dados.remetente))} enviou seu plano`,
    preCabecalho: atualizado,
    topo: topo(dados.remetente),
    corpo: [paragrafo(comNome(dados.primeiroNome, 'seu plano está neste link.')), botao('Abrir meu plano', dados.url, corDoBotao(dados.remetente.cor)), nota(atualizado), ...convite],
    rodape: { linhas: [enviouPeloMetaNutri(dados.remetente)], sair: { texto: 'Não quero receber e-mails deste plano', url: dados.urlSair } },
  })
}

/** Como cada aviso aparece no S3 ("Resumo da semana, toda quinta"). */
function avisoNoS3(aviso: TipoDeAviso, diaDaSemana: number): string {
  if (aviso === 'semana') return `${NOME_DO_AVISO.semana}, ${todoDia(diaDaSemana).toLowerCase()}`
  if (aviso === 'lembrete') return 'Lembrete depois de 3 dias sem marcar'
  return NOME_DO_AVISO.plano
}

/** S3, "Confirme os avisos do seu plano" (D-1226): o segundo passo do aceite, que só vale no botão da página. */
export function emailConfirmeOsAvisos(dados: {
  readonly primeiroNome: string | null
  readonly remetente: Remetente
  readonly avisos: readonly TipoDeAviso[]
  /** O dia da semana do pedido: o resumo sai nesse dia. */
  readonly diaDaSemana: number
  readonly urlConfirmar: string
}): EmailMontado {
  return montar({
    assunto: 'Confirme os avisos do seu plano',
    preCabecalho: 'Sem a confirmação, nada é enviado.',
    topo: topo(dados.remetente),
    corpo: [
      paragrafo(comNome(dados.primeiroNome, 'confirme para receber por e-mail:')),
      lista(dados.avisos.map((a) => avisoNoS3(a, dados.diaDaSemana))),
      botao('Confirmar', dados.urlConfirmar, corDoBotao(dados.remetente.cor)),
      nota('Sem a confirmação, nada é enviado.'),
    ],
    rodape: { linhas: [`Alguém pediu estes avisos no link do seu plano com ${quem(dados.remetente)}. Se não foi você, ignore este e-mail.`] },
  })
}

/**
 * S3 do e-mail digitado no link (D-1247): o endereço só passa a valer no plano com o "Confirmar"; com avisos marcados, a
 * confirmação também os liga.
 */
export function emailConfirmeOEmail(dados: {
  readonly primeiroNome: string | null
  readonly remetente: Remetente
  readonly avisos: readonly TipoDeAviso[]
  readonly diaDaSemana: number
  readonly urlConfirmar: string
}): EmailMontado {
  const comAvisos: readonly Peca[] = dados.avisos.length > 0 ? [paragrafo('Com a confirmação, você recebe:'), lista(dados.avisos.map((a) => avisoNoS3(a, dados.diaDaSemana)))] : []
  return montar({
    assunto: 'Confirme o seu e-mail',
    preCabecalho: 'Sem a confirmação, este e-mail não recebe avisos.',
    topo: topo(dados.remetente),
    corpo: [
      paragrafo(comNome(dados.primeiroNome, `confirme que este e-mail é seu para usá-lo no seu plano com ${quem(dados.remetente)}.`)),
      ...comAvisos,
      botao('Confirmar', dados.urlConfirmar, corDoBotao(dados.remetente.cor)),
      nota('Sem a confirmação, este e-mail não recebe avisos nem serve para recuperar o link.'),
    ],
    rodape: { linhas: [`Alguém deu este e-mail no link do seu plano com ${quem(dados.remetente)}. Se não foi você, ignore este e-mail.`] },
  })
}

/** S4, "Seu link do plano mudou" (D-1215). */
export function emailEnderecoTrocado(dados: { readonly primeiroNome: string | null; readonly remetente: Remetente; readonly url: string }): EmailMontado {
  return montar({
    assunto: 'Seu link do plano mudou',
    preCabecalho: 'O link antigo não abre mais.',
    topo: topo(dados.remetente),
    corpo: [
      paragrafo(comNome(dados.primeiroNome, `${quem(dados.remetente)} trocou o endereço do seu plano. O link antigo não abre mais.`)),
      botao('Abrir meu plano', dados.url, corDoBotao(dados.remetente.cor)),
      nota('Se você instalou o Meu plano na tela inicial, abra por este botão e instale de novo.'),
    ],
    rodape: { linhas: [enviouPeloMetaNutri(dados.remetente)] },
  })
}

/** A1, "Seu plano foi atualizado" (D-1230). */
export function emailPlanoAtualizado(dados: {
  readonly primeiroNome: string | null
  readonly remetente: Remetente
  readonly url: string
  readonly atualizadoEm: string
  readonly urlSair: string
}): EmailMontado {
  return montar({
    assunto: 'Seu plano foi atualizado',
    preCabecalho: `${maiuscula(quem(dados.remetente))} atualizou o seu plano em ${dataPorExtenso(dados.atualizadoEm)}.`,
    topo: topo(dados.remetente),
    corpo: [
      paragrafo(comNome(dados.primeiroNome, `${quem(dados.remetente)} atualizou o seu plano.`)),
      botao('Ver o plano', dados.url, corDoBotao(dados.remetente.cor)),
      nota('As missões de hoje já seguem o plano novo.'),
    ],
    rodape: { linhas: [`Você pediu este aviso no link do seu plano com ${quem(dados.remetente)}.`], sair: { texto: 'Não quero mais receber este aviso', url: dados.urlSair } },
  })
}

/** Um dia do resumo: o dia (AAAA-MM-DD) e as missões feitas nele. */
export interface DiaNoEmail {
  readonly dia: string
  readonly feitas: number
}

/** CA-2247 e D-1234: os 7 dias em células, com o número de missões ("3/4") ou o traço, nunca só cor. */
function celulasDaSemana(semana: readonly DiaNoEmail[], missoes: number): Peca {
  const valor = (d: DiaNoEmail) => (d.feitas > 0 ? `${d.feitas}/${Math.max(missoes, d.feitas)}` : '–')
  const curto = (d: DiaNoEmail) => DIAS_CURTOS[new Date(`${d.dia}T00:00:00Z`).getUTCDay()] ?? ''
  const cabeca = semana.map((d) => `<td align="center" style="padding:0 2px 4px 2px; font-family:${LETRA}; font-size:12px; line-height:16px; color:${SUAVE};">${curto(d)}</td>`).join('')
  const celulas = semana
    .map((d) => {
      const marcado = d.feitas > 0
      const fundo = marcado ? DIA_MARCADO : DIA_VAZIO
      return `<td align="center" style="padding:0 2px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" height="40" bgcolor="${fundo}" style="height:40px; border-radius:8px; background-color:${fundo}; font-family:${LETRA}; font-size:13px; line-height:40px; font-weight:${marcado ? 'bold' : 'normal'}; color:${marcado ? DIA_MARCADO_TINTA : SUAVE};">${valor(d)}</td></tr></table></td>`
    })
    .join('')
  return {
    html: `<tr><td style="padding:0 24px 16px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${cabeca}</tr><tr>${celulas}</tr></table></td></tr>`,
    texto: semana.map((d) => `${curto(d)} ${valor(d)}`).join(' · '),
  }
}

/** A2, "Sua semana: 5 de 7 dias" (D-1229, CA-2247). */
export function emailResumoDaSemana(dados: {
  readonly primeiroNome: string | null
  readonly remetente: Remetente
  readonly url: string
  readonly semana: readonly DiaNoEmail[]
  readonly dias: number
  readonly missoes: number
  /** O dia da semana do aceite: "toda quinta". */
  readonly diaDaSemana: number
  readonly urlSair: string
}): EmailMontado {
  const { dias } = dados
  const frase = dias >= 4 ? 'Dentro da meta.' : dias > 0 ? 'A meta é 4 dias por semana.' : 'Nenhum dia marcado nesta semana. O plano continua no link.'
  const pre = dias >= 4 ? 'Dentro da meta. Veja a sua semana.' : dias > 0 ? 'A meta é 4 dias.' : 'O plano continua no link.'
  const abertura = dias > 0 ? `você marcou missão em ${dias} dos últimos 7 dias.` : 'estes são os seus últimos 7 dias.'
  return montar({
    assunto: `Sua semana: ${dias} de 7 dias`,
    preCabecalho: pre,
    topo: topo(dados.remetente),
    corpo: [paragrafo(comNome(dados.primeiroNome, abertura)), celulasDaSemana(dados.semana, dados.missoes), paragrafo(frase), botao('Abrir meu plano', dados.url, corDoBotao(dados.remetente.cor))],
    rodape: { linhas: [`Resumo da semana que você pediu, ${todoDia(dados.diaDaSemana).toLowerCase()}.`], sair: { texto: 'Não quero mais receber o resumo', url: dados.urlSair } },
  })
}

/** A3, "Ainda dá tempo de marcar hoje" (D-1228): o número é o dos dias sem marcar (3 a 6). */
export function emailLembrete(dados: { readonly primeiroNome: string | null; readonly remetente: Remetente; readonly url: string; readonly dias: number; readonly urlSair: string }): EmailMontado {
  return montar({
    assunto: 'Ainda dá tempo de marcar hoje',
    preCabecalho: 'Suas missões de hoje estão no link.',
    topo: topo(dados.remetente),
    corpo: [paragrafo(comNome(dados.primeiroNome, `faz ${dados.dias} dias que você não marca as missões do plano.`)), botao('Marcar as missões de hoje', dados.url, corDoBotao(dados.remetente.cor))],
    rodape: { linhas: [`Você pediu este lembrete no link do seu plano com ${quem(dados.remetente)}.`], sair: { texto: 'Não quero mais receber o lembrete', url: dados.urlSair } },
  })
}

/** A4, "Uma semana sem marcar as missões" (D-1228): o segundo e último lembrete da pausa. */
export function emailUltimoLembrete(dados: { readonly primeiroNome: string | null; readonly remetente: Remetente; readonly url: string; readonly urlSair: string }): EmailMontado {
  const ela = quem(dados.remetente)
  return montar({
    assunto: 'Uma semana sem marcar as missões',
    preCabecalho: `Se o plano ficou difícil, fale com ${ela}.`,
    topo: topo(dados.remetente),
    corpo: [
      paragrafo(comNome(dados.primeiroNome, `faz uma semana que você não marca as missões. Se o plano ficou difícil, responda a este e-mail: ${ela} pode ajustar.`)),
      botao('Abrir meu plano', dados.url, corDoBotao(dados.remetente.cor)),
      nota('Este é o último lembrete até você marcar de novo.'),
    ],
    rodape: { linhas: [`Você pediu este lembrete no link do seu plano com ${ela}.`], sair: { texto: 'Não quero mais receber o lembrete', url: dados.urlSair } },
  })
}

/** Os quatro números do N1 (D-1231). */
export interface NumerosDaAdesao {
  readonly emDia: number
  readonly atencao: number
  readonly pararam: number
  readonly naoComecaram: number
}

/** D-1231: até 8 nomes na lista; o resto vira "e mais N na Adesão." */
export const NOMES_NO_RESUMO = 8

/**
 * N1, "Adesão da semana" (D-1231, CA-2267, CA-2268): os quatro números e quem parou de marcar, só com o primeiro nome, a
 * inicial do sobrenome e os dias sem marcar. Nunca dieta, peso, doença, telefone, e-mail de paciente nem sobrenome.
 */
export function emailAdesaoDaSemana(dados: {
  /** O primeiro e o último dia da semana do resumo (AAAA-MM-DD). */
  readonly inicio: string
  readonly fim: string
  readonly numeros: NumerosDaAdesao
  /** Quem parou, já na ordem (mais dias primeiro), com o nome do link. */
  readonly pararam: readonly { readonly nome: string; readonly dias: number }[]
  readonly urlAdesao: string
  readonly urlSair: string
}): EmailMontado {
  const { emDia, atencao, pararam, naoComecaram } = dados.numeros
  const assunto = pararam === 0 ? 'Adesão da semana: ninguém parou de marcar' : `Adesão da semana: ${pararam} ${pararam === 1 ? 'parou' : 'pararam'} de marcar`
  const pre = `${emDia} em dia, ${atencao} em atenção, ${naoComecaram} ainda não ${naoComecaram === 1 ? 'começou' : 'começaram'}.`
  const numero = (valor: number, rotulo: string, alerta = false): string =>
    `<td valign="top" style="padding:0 8px 0 0; font-family:${LETRA};"><div style="font-size:24px; line-height:30px; font-weight:bold; color:${alerta && valor > 0 ? ALERTA : TINTA};">${valor}</div><div style="font-size:12px; line-height:16px; color:${SUAVE};">${rotulo}</div></td>`
  const numeros: Peca = {
    html: `<tr><td style="padding:0 26px 20px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${numero(emDia, 'Em dia')}${numero(atencao, 'Atenção')}${numero(pararam, 'Pararam de marcar', true)}${numero(naoComecaram, 'Não começaram')}</tr></table></td></tr>`,
    texto: `${emDia} em dia · ${atencao} em atenção · ${pararam} pararam de marcar · ${naoComecaram} não começaram`,
  }
  const mostrados = dados.pararam.slice(0, NOMES_NO_RESUMO)
  const resto = dados.pararam.length - mostrados.length
  const nomes: Peca[] =
    mostrados.length === 0
      ? []
      : [
          titulo('Pararam de marcar'),
          {
            html:
              `<tr><td style="padding:0 26px 8px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
              mostrados
                .map((p, i) => {
                  const fio = i === 0 ? '' : `border-top:1px solid ${FIO};`
                  return `<tr><td style="padding:10px 0; ${fio} font-family:${LETRA}; font-size:15px; line-height:20px; color:${TINTA};">${escapar(nomeCurto(p.nome))}</td><td align="right" style="padding:10px 0; ${fio} font-family:${LETRA}; font-size:14px; line-height:20px; color:${SUAVE};">${p.dias} dias</td></tr>`
                })
                .join('') +
              `</table></td></tr>`,
            texto: mostrados.map((p) => `${nomeCurto(p.nome)} · ${p.dias} dias`).join('\n'),
          },
          ...(resto > 0 ? [nota(`e mais ${resto} na Adesão.`)] : []),
        ]
  return montar({
    assunto,
    preCabecalho: pre,
    topo: topo(null),
    corpo: [nota(`Semana ${periodo(dados.inicio, dados.fim)}.`), numeros, ...nomes, botao('Abrir a Adesão', dados.urlAdesao, corDoBotao(null))],
    rodape: { linhas: ['Resumo de toda segunda, para quem tem pacientes em acompanhamento no MetaNutri.'], sair: { texto: 'Não quero mais receber o resumo', url: dados.urlSair } },
  })
}

/** D-1235 e CA-2252: os cabeçalhos do descadastro de um clique (RFC 8058), com endereço https e sem `mailto`. */
export function cabecalhosDeDescadastro(urlDaFuncao: string): Readonly<Record<string, string>> {
  return { 'List-Unsubscribe': `<${urlDaFuncao}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
}
