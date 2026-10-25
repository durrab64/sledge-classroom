"""
Background Remover & Transparent GIF/WebP Optimizer for Bleach Easter Egg
Usage:
    python process_gif.py <input_gif_path> <character_id>

Example:
    python process_gif.py soifon.gif soifon
    python process_gif.py "C:\\Users\\mhDur\\Downloads\\rangiku.gif" rangiku
"""

import sys
import os
import numpy as np
from PIL import Image, ImageSequence
from scipy.ndimage import label

def process_gif(input_path, char_name):
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        return False

    print(f"Opening: {input_path}...")
    im = Image.open(input_path)
    frames = []
    durations = []

    print(f"Processing frames ({getattr(im, 'n_frames', 1)} total)...")
    for frame in ImageSequence.Iterator(im):
        rgba = frame.convert('RGBA')
        arr = np.array(rgba)

        # Detect near-white background
        white_mask = (arr[:, :, 0] > 230) & (arr[:, :, 1] > 230) & (arr[:, :, 2] > 230)

        # Label connected regions
        labeled, _ = label(white_mask)

        # Find labels touching borders
        border_labels = set(np.unique(labeled[0, :])) | set(np.unique(labeled[-1, :])) | \
                        set(np.unique(labeled[:, 0])) | set(np.unique(labeled[:, -1]))
        border_labels.discard(0)

        bg_mask = np.isin(labeled, list(border_labels))
        arr[bg_mask, 3] = 0

        # Clean stray pixels near extreme outer edge
        edge_band = np.zeros_like(white_mask, dtype=bool)
        edge_band[:2, :] = True
        edge_band[-2:, :] = True
        edge_band[:, :2] = True
        edge_band[:, -2:] = True
        arr[edge_band & (arr[:, :, 3] < 220), 3] = 0

        frames.append(Image.fromarray(arr))
        durations.append(im.info.get('duration', 40))

    out_gif = f"{char_name}.gif"
    out_webp = f"{char_name}.webp"

    # Save as WebP
    frames[0].save(
        out_webp,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        lossless=True
    )
    print(f"✓ Saved transparent animated WebP: {out_webp}")

    # Save as GIF
    gif_frames = []
    for f in frames:
        alpha = f.split()[3]
        mask = Image.eval(alpha, lambda a: 255 if a <= 128 else 0)
        p_frame = f.convert('RGB').convert('P', palette=Image.ADAPTIVE, colors=255)
        p_frame.paste(255, mask)
        gif_frames.append(p_frame)

    gif_frames[0].save(
        out_gif,
        save_all=True,
        append_images=gif_frames[1:],
        duration=durations,
        loop=0,
        transparency=255,
        disposal=2
    )
    print(f"✓ Saved transparent animated GIF: {out_gif}")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python process_gif.py <path_to_gif> <character_name>")
        print("Example: python process_gif.py my_gif.gif soifon")
        sys.exit(1)

    input_file = sys.argv[1]
    character_name = sys.argv[2].lower().strip()
    success = process_gif(input_file, character_name)
    if success:
        print(f"Successfully processed {character_name}! It is ready for the Easter egg.")
