"""Gera public/imagens/pratos-heroi*.webp: três pratos recortados em círculo, em arco.

Fotos do Unsplash (Licença Unsplash, uso livre). Créditos em THIRD_PARTY_NOTICES.md.
Uso: python scripts/pratos_heroi.py   (precisa de Pillow e de internet)
"""
import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

# id da foto no Unsplash, centro e raio do prato na foto com 1400 px de largura
FOTOS = [
    ('1512621776951-a57141f2eefd', 746, 446, 438),  # Anna Pelzer
    ('1546069901-ba9599a7e63c', 693, 706, 480),     # Anh Nguyen
    ('1490645935967-10de6ba17061', 784, 324, 322),  # Stuart Petrie
]
# onde cada prato entra na tela de 2600 × 1000 e com que raio; o do meio fica na frente
LUGAR = [((640, 560), 360), ((1300, 460), 420), ((1960, 560), 340)]
SAIDAS = [(1600, 'pratos-heroi.webp'), (800, 'pratos-heroi-800.webp')]
LIMITE_BYTES = 300 * 1024


def baixar(id_foto: str) -> Image.Image:
    url = f'https://images.unsplash.com/photo-{id_foto}?w=1400&q=90'
    with urllib.request.urlopen(url, timeout=60) as resposta:
        return Image.open(io.BytesIO(resposta.read())).convert('RGBA')


def circulo(foto: Image.Image, cx: int, cy: int, r: int, ss: int = 4) -> Image.Image:
    r = int(r * 0.975)  # entra um pouco na borda do prato para não pegar a mesa
    recorte = foto.crop((cx - r, cy - r, cx + r, cy + r))
    mascara = Image.new('L', (2 * r * ss, 2 * r * ss), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, 2 * r * ss - 1, 2 * r * ss - 1), fill=255)
    recorte.putalpha(mascara.resize((2 * r, 2 * r), Image.LANCZOS))
    return recorte


def compor() -> Image.Image:
    pratos = [circulo(baixar(i), cx, cy, r) for i, cx, cy, r in FOTOS]
    tela = Image.new('RGBA', (2600, 1000), (0, 0, 0, 0))
    sombra = Image.new('RGBA', tela.size, (0, 0, 0, 0))
    desenho = ImageDraw.Draw(sombra)
    for (x, y), r in LUGAR:
        desenho.ellipse((x - r * 0.95, y - r * 0.85 + 40, x + r * 0.95, y + r * 1.02 + 40), fill=(14, 59, 67, 70))
    tela.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(38)))
    for ordem in (0, 2, 1):
        (x, y), r = LUGAR[ordem]
        tela.alpha_composite(pratos[ordem].resize((2 * r, 2 * r), Image.LANCZOS), (x - r, y - r))
    caixa = tela.getbbox()
    if caixa is None:
        sys.exit('composição vazia')
    return tela.crop(caixa)


def salvar(tela: Image.Image, destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for largura, nome in SAIDAS:
        altura = round(tela.height * largura / tela.width)
        menor = tela.resize((largura, altura), Image.LANCZOS)
        for qualidade in (82, 76, 70, 64, 58):
            arquivo = destino / nome
            menor.save(arquivo, 'WEBP', quality=qualidade, method=6)
            if arquivo.stat().st_size <= LIMITE_BYTES:
                break
        print(nome, menor.size, arquivo.stat().st_size, 'bytes')


if __name__ == '__main__':
    salvar(compor(), Path(__file__).resolve().parent.parent / 'public' / 'imagens')
