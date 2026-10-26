#!/usr/bin/env python3
"""
Generate simple PNG icons for the Sledge Now Playing Chrome Extension.
Run this once: python generate_icons.py
Requires no external packages (uses only stdlib).
"""
import struct, zlib, os

def make_png(size, bg=(99, 102, 241), fg=(255, 255, 255)):
    """Generate a minimal solid-color PNG with a music note symbol."""
    def pack_chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)

    # Build raw pixel data
    rows = []
    for y in range(size):
        row = b'\x00'  # filter type None
        for x in range(size):
            # Draw a rounded square background with music note
            margin = size // 6
            in_bg = margin <= x < size - margin and margin <= y < size - margin
            # Simple music note: oval body + stem
            cx, cy = size * 0.38, size * 0.60
            rx, ry = size * 0.15, size * 0.12
            stem_x = size * 0.53
            in_note_body = ((x - cx)**2 / rx**2 + (y - cy)**2 / ry**2) <= 1.0
            in_stem = (stem_x - size*0.025 <= x <= stem_x + size*0.025 and
                       size*0.25 <= y <= size*0.60)
            if in_note_body or in_stem:
                row += bytes(fg) + b'\xff'
            elif in_bg:
                row += bytes(bg) + b'\xff'
            else:
                row += b'\x00\x00\x00\x00'
        rows.append(row)

    raw = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n' +
           pack_chunk(b'IHDR', ihdr) +
           pack_chunk(b'IDAT', compressed) +
           pack_chunk(b'IEND', b''))
    return png

os.makedirs('icons', exist_ok=True)
for sz in (16, 48, 128):
    with open(f'icons/icon{sz}.png', 'wb') as f:
        f.write(make_png(sz))
    print(f'Generated icons/icon{sz}.png')

print('Done! Icons ready for the Chrome Extension.')
