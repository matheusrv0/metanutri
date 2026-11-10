// A ajuda "Como medir" de cada medida (spec antropometria-telas, D-1415): os textos do protótipo aprovado (pesquisa de
// 03/11/2026, seção 1) e as 15 imagens livres dele, em WebP, com o crédito que a licença pede (pesquisa, seção 5;
// THIRD_PARTY_NOTICES.md). Nenhuma imagem foi alterada no conteúdo (regra do CDC): só reduzida e convertida.

const BASE = import.meta.env.BASE_URL

/** O crédito que vai embaixo da imagem, sempre visível. */
export type CreditoDaImagem =
  | { readonly tipo: 'cdc'; readonly ano: 1988 | 2005 | 2007 | 2021; readonly antes?: string }
  | { readonly tipo: 'cc-by'; readonly autor: string }

export interface ImagemDaAjuda {
  /** Caminho a partir da raiz do app. */
  readonly src: string
  /** Largura / altura do arquivo, para a moldura não pular quando a imagem chega. */
  readonly proporcao: string
  readonly alt: string
  readonly credito: CreditoDaImagem
  /** Círculo sobre o ponto de medida, em % da imagem (a imagem não é editada). */
  readonly marca?: { readonly x: string; readonly y: string }
  /** Altura da placa da imagem: as largas usam menos. */
  readonly altura?: 'baixa' | 'media' | 'alta'
}

export interface AjudaDaMedida {
  readonly titulo: string
  readonly texto: string
  readonly imagem?: ImagemDaAjuda
}

/** A política de reuso do CDC: fonte, domínio público, disponível em cdc.gov e sem endosso (pesquisa 5.1). */
export const textoDoCreditoCdc = (ano: number): string =>
  `Fonte: CDC/NCHS – NHANES Anthropometry Procedures Manual (${ano}). Domínio público; disponível gratuitamente em cdc.gov. O uso não implica endosso do CDC.`

export const LICENCA_CC_BY = { rotulo: 'CC BY 4.0', endereco: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br' } as const

const imagem = (arquivo: string, proporcao: string, alt: string, credito: CreditoDaImagem, extra: Partial<Pick<ImagemDaAjuda, 'marca' | 'altura'>> = {}): ImagemDaAjuda => ({
  src: `${BASE}imagens/antropometria/${arquivo}.webp`,
  proporcao,
  alt,
  credito,
  ...extra,
})

const cdc = (ano: 1988 | 2005 | 2007 | 2021, antes?: string): CreditoDaImagem => (antes ? { tipo: 'cdc', ano, antes } : { tipo: 'cdc', ano })
const NAVAZOB: CreditoDaImagem = { tipo: 'cc-by', autor: 'Navazob / Wikimedia Commons' }

export const IMAGENS = {
  peso: imagem('peso-balanca-navazob', '600 / 800', 'Balança de plataforma digital', NAVAZOB),
  estatura: imagem('altura-estadiometro-posicao-cdc-2021', '511 / 434', 'Posição do corpo no estadiômetro, de perfil', cdc(2021, 'Rótulos em inglês: plano de Frankfurt, ombros e calcanhares.')),
  alturaDoJoelho: imagem('altura-joelho-cdc-1988', '679 / 800', 'Paciente sentada com joelho a 90° e o paquímetro do calcanhar à coxa', cdc(1988)),
  braco: imagem('circ-braco-relaxado-cdc-2021', '800 / 614', 'Fita no ponto médio do braço', cdc(2021)),
  cinturaNih: imagem('circ-cintura-crista-iliaca-foto-cdc-2021', '624 / 534', 'Fita logo acima da crista ilíaca', cdc(2021)),
  quadril: imagem('circ-quadril-foto-cdc-2021', '451 / 567', 'Fita na maior protuberância dos glúteos, vista lateral', cdc(2021)),
  panturrilha: imagem('circ-panturrilha-cdc-2005', '488 / 800', 'Fita na maior circunferência da panturrilha', cdc(2005)),
  coxa: imagem('circ-coxa-medial-cdc-2005', '522 / 800', 'Fita no ponto médio da coxa', cdc(2005)),
  cotovelo: imagem('diametro-cotovelo-posicao-cdc-1988', '385 / 800', 'Posição do braço para o diâmetro do cotovelo', cdc(1988, 'Mostra só a posição do braço.')),
  triceps: imagem('dobra-triceps-foto-cdc-2007', '524 / 600', 'Adipômetro na dobra do tríceps', cdc(2007)),
  subescapular: imagem('dobra-subescapular-foto-cdc-2005', '653 / 583', 'Adipômetro na dobra subescapular', cdc(2005)),
  suprailiaca: imagem('dobra-suprailiaca-local-cdc-1988', '576 / 800', 'Local da dobra suprailíaca na linha axilar média', cdc(1988), { marca: { x: '32%', y: '70.5%' } }),
  coxaPonto: imagem('coxa-ponto-medio-cdc-2005', '500 / 800', 'Ponto médio da coxa entre a prega inguinal e a patela', cdc(2005, 'Mostra o ponto; não mostra o adipômetro.')),
  panturrilhaDobra: imagem('circ-panturrilha-cdc-2005', '488 / 800', 'Altura da maior circunferência da panturrilha', cdc(2005, 'Mostra a altura; não mostra a dobra.')),
  pincamento: imagem('dobra-tecnica-pincamento-diagrama-cdc-2005', '800 / 493', 'Corte da dobra: pele e gordura pinçadas, separadas do músculo', cdc(2005, 'Pele e gordura (skin, fat) pinçadas acima do músculo (muscle).'), { altura: 'media' }),
  fita: imagem('fita-antropometrica-navazob', '800 / 305', 'Fitas antropométricas inelásticas', NAVAZOB, { altura: 'baixa' }),
} as const satisfies Readonly<Record<string, ImagemDaAjuda>>

/** Os arquivos em `public/imagens/antropometria/`, um por imagem (o CA-2429 confere cada um). */
export const ARQUIVOS_DAS_IMAGENS: readonly string[] = [...new Set(Object.values(IMAGENS).map((i) => i.src.slice(i.src.lastIndexOf('/') + 1)))]

export const AJUDAS = {
  fita: {
    titulo: 'Fita',
    texto: 'Fita inelástica, justa sem apertar a pele. Nos membros, perpendicular ao osso; no tronco, paralela ao chão e lida ao final de uma expiração normal. Lado direito, salvo motivo anotado.',
    imagem: IMAGENS.fita,
  },
  pincamento: {
    titulo: 'Como pinçar',
    texto: 'Pince pele e gordura com polegar e indicador esquerdos, solte do músculo e mantenha a dobra. Adipômetro perpendicular à dobra, leitura em cerca de 2 a 3 segundos. Lado direito.',
    imagem: IMAGENS.pincamento,
  },
  peso: { titulo: 'Peso', texto: 'Descalça e com o mínimo de roupa, parada no centro da balança. Anote quando o valor parar de mudar.', imagem: IMAGENS.peso },
  estatura: {
    titulo: 'Estatura',
    texto: 'Descalça, calcanhares juntos encostados no estadiômetro e cabeça no plano de Frankfurt. Peça uma inspiração funda e baixe o cursor até comprimir o cabelo.',
    imagem: IMAGENS.estatura,
  },
  alturaDoJoelho: {
    titulo: 'Altura do joelho',
    texto: 'Joelho e tornozelo a 90°. Paquímetro do calcanhar até a face anterior da coxa, cerca de 5 cm acima da patela, paralelo à tíbia.',
    imagem: IMAGENS.alturaDoJoelho,
  },
  semienvergadura: { titulo: 'Semienvergadura', texto: 'Braço aberto na horizontal. Meça da fúrcula esternal até a raiz dos dedos.' },
  braco: { titulo: 'Braço relaxado', texto: 'Braço solto ao lado do corpo. Fita horizontal no ponto médio entre acrômio e olécrano, sem apertar a pele.', imagem: IMAGENS.braco },
  bracoContraido: { titulo: 'Braço contraído', texto: 'Braço flexionado à frente com o bíceps contraído ao máximo. Fita na parte de maior volume do músculo.' },
  antebraco: { titulo: 'Antebraço', texto: 'Braço solto e levemente afastado do tronco, palma para a frente. Fita na maior circunferência do antebraço.' },
  punho: { titulo: 'Punho', texto: 'Fita logo abaixo das saliências ósseas do punho, do lado da mão.' },
  pescoco: { titulo: 'Pescoço', texto: 'Cabeça reta, olhar à frente. Fita perpendicular ao pescoço, no meio dele; nos homens, logo abaixo do pomo de Adão.' },
  ombro: { titulo: 'Ombro', texto: 'Braços soltos. Fita horizontal na maior circunferência, passando sobre os dois deltoides.' },
  peitoral: { titulo: 'Peitoral', texto: 'Fita horizontal na altura dos mamilos, ao final de uma expiração normal.' },
  cinturaPontoMedio: {
    titulo: 'Cintura · ponto médio (OMS)',
    texto:
      'Em pé, abdômen relaxado. Fita no ponto médio entre a última costela e o topo da crista ilíaca, ao final de uma expiração normal. É o ponto dos cortes da OMS, da razão cintura/quadril e da cintura/estatura.',
  },
  cinturaCristaIliaca: {
    titulo: 'Cintura · crista ilíaca (NIH)',
    texto: 'Fita logo acima do ponto mais alto da crista ilíaca direita, na linha axilar média, paralela ao chão, ao final de uma expiração normal.',
    imagem: IMAGENS.cinturaNih,
  },
  abdomen: { titulo: 'Abdômen', texto: 'Fita horizontal na altura da cicatriz umbilical, ao final de uma expiração normal.' },
  quadril: { titulo: 'Quadril', texto: 'Em pé, pés juntos. Fita horizontal na maior protuberância dos glúteos, vista de lado.', imagem: IMAGENS.quadril },
  panturrilha: { titulo: 'Panturrilha', texto: 'Fita horizontal na maior circunferência da panturrilha.', imagem: IMAGENS.panturrilha },
  coxaProximal: { titulo: 'Coxa proximal', texto: 'Em pé, pernas levemente afastadas. Fita logo abaixo da prega glútea, perpendicular à coxa.' },
  coxa: { titulo: 'Coxa média', texto: 'Fita perpendicular à coxa, no ponto médio entre a prega inguinal e a borda superior da patela.', imagem: IMAGENS.coxa },
  diametroPunho: { titulo: 'Punho (biestiloide)', texto: 'Paquímetro nas pontas dos processos estiloides do rádio e da ulna, com pressão firme.' },
  diametroCotovelo: {
    titulo: 'Cotovelo (úmero)',
    texto: 'Braço à frente com cotovelo a 90° e dedos para cima. Paquímetro na maior distância entre os epicôndilos do úmero.',
    imagem: IMAGENS.cotovelo,
  },
  tricipital: { titulo: 'Tríceps', texto: 'Vertical, na face posterior do braço, no ponto médio entre acrômio e olécrano.', imagem: IMAGENS.triceps },
  bicipital: { titulo: 'Bíceps', texto: 'Vertical, na face anterior do braço, sobre o ventre do bíceps, 1 cm acima do ponto do tríceps.' },
  bicipitalDurnin: { titulo: 'Bíceps · Durnin & Womersley', texto: 'Vertical, na frente do braço, diretamente acima do centro da dobra do cotovelo.' },
  subescapular: { titulo: 'Subescapular', texto: 'Oblíqua, a 45° descendo para fora, logo abaixo do ângulo inferior da escápula.', imagem: IMAGENS.subescapular },
  peitoralDobraMulher: { titulo: 'Peitoral', texto: 'Diagonal, a um terço da distância entre a linha axilar anterior e o mamilo, mais perto da axila.' },
  peitoralDobraHomem: { titulo: 'Peitoral', texto: 'Diagonal, na metade da distância entre a linha axilar anterior e o mamilo.' },
  /** D-1464: sem o sexo na ficha, as duas linhas da pesquisa (1.4) numa frase. */
  peitoralDobraSemSexo: {
    titulo: 'Peitoral',
    texto: 'Diagonal, entre a linha axilar anterior e o mamilo: na metade da distância no homem; a um terço, mais perto da axila, na mulher.',
  },
  axilarMedia: { titulo: 'Axilar média', texto: 'Vertical, na linha axilar média, na altura do apêndice xifoide.' },
  suprailiacaAnt: {
    titulo: 'Suprailíaca · linha axilar anterior',
    texto: 'Oblíqua, logo acima da crista ilíaca, na linha axilar anterior, acompanhando o ângulo natural do osso. É a de Jackson & Pollock.',
  },
  suprailiacaMed: {
    titulo: 'Suprailíaca · linha axilar média',
    texto: 'Oblíqua, logo acima da crista ilíaca, na linha axilar média. É a de Durnin & Womersley; o círculo marca o local.',
    imagem: IMAGENS.suprailiaca,
  },
  suprailiaca: {
    titulo: 'Suprailíaca · linha não informada',
    texto: 'A dobra dos planos de antes, sem a linha registrada. Meça de novo na linha do protocolo: anterior em Jackson & Pollock, média em Durnin & Womersley e Petroski.',
  },
  supraespinal: {
    titulo: 'Supraespinal',
    texto: 'Oblíqua (medial e para baixo, cerca de 45°), no cruzamento da linha espinha ilíaca anterossuperior–axila anterior com a horizontal da crista ilíaca. Não é a suprailíaca.',
  },
  abdominal: { titulo: 'Abdominal', texto: 'Vertical, 2 cm à direita da cicatriz umbilical.' },
  coxaDobra: { titulo: 'Coxa', texto: 'Vertical, na face anterior, no meio entre a prega inguinal e a borda superior da patela, com o peso na outra perna.', imagem: IMAGENS.coxaPonto },
  panturrilhaMedial: { titulo: 'Panturrilha medial', texto: 'Vertical, na face interna da perna, na altura da maior circunferência.', imagem: IMAGENS.panturrilhaDobra },
} as const satisfies Readonly<Record<string, AjudaDaMedida>>

export type ChaveDaAjuda = keyof typeof AJUDAS
