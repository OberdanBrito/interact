#!/usr/bin/env python3
"""Gera os icones PWA do Interact sem dependencias externas.
Rasteriza geometria simples com supersampling 4x e escreve PNG via zlib/struct."""
import struct, zlib, os

NAVY = (15, 43, 82)        # --navy-800 #0F2B52
WHITE = (255, 255, 255)

def lerp(a, b, t):
    return a + (b - a) * t

def in_rounded_rect(x, y, x0, y0, x1, y1, r):
    """Ponto dentro de retangulo arredondado."""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    if x < x0 + r and y < y0 + r:
        return (x - (x0 + r)) ** 2 + (y - (y0 + r)) ** 2 <= r * r
    if x > x1 - r and y < y0 + r:
        return (x - (x1 - r)) ** 2 + (y - (y0 + r)) ** 2 <= r * r
    if x < x0 + r and y > y1 - r:
        return (x - (x0 + r)) ** 2 + (y - (y1 - r)) ** 2 <= r * r
    if x > x1 - r and y > y1 - r:
        return (x - (x1 - r)) ** 2 + (y - (y1 - r)) ** 2 <= r * r
    return True

def sample_icon(S, full_bleed):
    """Retorna cor RGBA normalizada do pixel unitario (x,y em [0,S))."""
    out = [[None] * S for _ in range(S)]
    N = 4  # supersample
    pad = 0.0 if full_bleed else 0.02          # moldura transparente minima
    corner = 0.225                              # raio do app-icon
    # barra do "I": largura/altura relativos ao canvas
    bw = 0.30 if not full_bleed else 0.26       # barra mais recuada no maskable (safe zone)
    bh = 0.52
    br = bw / 2                                 # pontas totalmente redondas

    def render(x, y):
        u, v = x / S, y / S
        # fundo
        if full_bleed:
            if not (0 <= u <= 1 and 0 <= v <= 1):
                return (0, 0, 0, 0)
            bg_hit = True
        else:
            m = pad
            bg_hit = in_rounded_rect(u, v, m, m, 1 - m, 1 - m,
                                     corner * (1 - 2 * m))
            if not bg_hit:
                return (0, 0, 0, 0)
        # barra branca do "I"
        cx = 0.5
        cy0 = 0.5 - bh / 2
        cy1 = 0.5 + bh / 2
        bx0 = cx - bw / 2
        bx1 = cx + bw / 2
        fg = in_rounded_rect(u, v, bx0, cy0, bx1, cy1, br)
        if fg:
            return (*WHITE, 255)
        return (*NAVY, 255)

    for py in range(S):
        row = []
        for px in range(S):
            rs = gs = bs = a_ = 0
            for sy in range(N):
                for sx in range(N):
                    r, g, b, a = render(px + (sx + .5) / N, py + (sy + .5) / N)
                    rs += r; gs += g; bs += b; a_ += a
            n = N * N
            row.append((rs // n, gs // n, bs // n, a_ // n))
        out[py] = row
    return out

def write_png(path, pixels, S):
    raw = bytearray()
    for y in range(S):
        raw.append(0)  # filtro none
        for x in range(S):
            r, g, b, a = pixels[y][x]
            raw.extend((r, g, b, a))
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print(f"ok {path} ({os.path.getsize(path)} bytes)")

os.makedirs("public/assets/icons", exist_ok=True)
for name, size, bleed in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, True),
]:
    px = sample_icon(size, bleed)
    write_png(f"public/assets/icons/{name}", px, size)
print("done")
