"""Extract Krita .kra tile-format layers to PNG.

Format (per Krita source: kis_tile_compressor_2.cpp, kis_lzf_compression.cpp):
header lines VERSION/TILEWIDTH/TILEHEIGHT/PIXELSIZE, "DATA <n>",
then per tile: "<x>,<y>,LZF,<len>\n" + <len> bytes =
  1 flag byte (0=raw, 1=LZF) + planar tile data (R plane, G, B, A).
"""
import sys
from PIL import Image

TILE = 64
TILE_BYTES = TILE * TILE * 4  # 16384
PLANE = TILE * TILE           # 4096

def lzf_decompress(data, expected):
    """Port of Krita's lzff_decompress."""
    out = bytearray()
    i = 0
    n = len(data)
    while i < n - 1:  # Krita: ip < ip_limit (= end - 1)
        ctrl = data[i] + 1
        raw = data[i]
        ofs = (raw & 31) << 8
        ln = raw >> 5
        i += 1
        if ctrl < 33:  # literal run of ctrl bytes
            if len(out) + ctrl > expected:
                raise ValueError("literal overrun")
            out += data[i:i+ctrl]
            i += ctrl
        else:  # back reference
            ln -= 1
            ref = len(out) - ofs - 1
            if ln == 6:
                ln += data[i]; i += 1
            ref -= data[i]; i += 1
            if ref < 0:
                raise ValueError("bad ref")
            if len(out) + ln + 3 > expected:
                raise ValueError("backref overrun")
            for _ in range(ln + 3):
                out.append(out[ref]); ref += 1
    if len(out) != expected:
        raise ValueError(f"lzf gave {len(out)}, expected {expected}")
    return bytes(out)

def deplanarize(data):
    """Planar tile -> interleaved RGBA. Krita stores RGBA8 as BGRA, so the
    planes arrive in B,G,R,A order."""
    out = bytearray(TILE_BYTES)
    for j in range(PLANE):
        out[j*4]     = data[PLANE*2 + j]  # R
        out[j*4 + 1] = data[PLANE + j]    # G
        out[j*4 + 2] = data[j]            # B
        out[j*4 + 3] = data[PLANE*3 + j]  # A
    return bytes(out)

def read_layer(path, w, h):
    d = open(path, 'rb').read()
    pos = d.find(b'\nDATA ') + len(b'\nDATA ')
    nl = d.index(b'\n', pos)
    n_tiles = int(d[pos:nl])
    pos = nl + 1
    canvas = bytearray(w * h * 4)
    for _ in range(n_tiles):
        nl = d.index(b'\n', pos)
        x_str, y_str, comp, clen = d[pos:nl].decode().split(',')
        pos = nl + 1
        tx, ty, clen = int(x_str), int(y_str), int(clen)
        blob = d[pos:pos+clen]
        pos += clen
        flag = blob[0]
        if flag == 1:
            tile = deplanarize(lzf_decompress(blob[1:], TILE_BYTES))
        elif flag == 0:
            tile = deplanarize(blob[1:1+TILE_BYTES])
        else:
            raise ValueError(f"unknown flag {flag} at tile ({tx},{ty})")
        for row in range(TILE):
            cy = ty + row
            if cy >= h: continue
            for dx in range(TILE):
                cx = tx + dx
                if cx >= w: continue
                src = (row*TILE + dx)*4
                dst = (cy*w + cx)*4
                canvas[dst:dst+4] = tile[src:src+4]
    return bytes(canvas)

def unpremultiply(rgba):
    out = bytearray(len(rgba))
    for i in range(0, len(rgba), 4):
        r, g, b, a = rgba[i], rgba[i+1], rgba[i+2], rgba[i+3]
        if a == 0: r = g = b = 0
        elif a < 255:
            r = min(255, r*255//a); g = min(255, g*255//a); b = min(255, b*255//a)
        out[i:i+4] = bytes((r, g, b, a))
    return bytes(out)

if __name__ == '__main__':
    W, H = 1200, 896
    layers = 'kra_extract/Unnamed/layers/'
    for layer_file, out_name in [('layer4', 'base.png'), ('layer3', 'masks.png')]:
        raw = read_layer(layers + layer_file, W, H)
        Image.frombytes('RGBA', (W, H), unpremultiply(raw)).save(out_name)
        print(out_name, 'written')
