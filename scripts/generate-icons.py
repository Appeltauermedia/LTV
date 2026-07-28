"""Generate PWA PNG icons from a square source image."""
from pathlib import Path
import sys
from PIL import Image

OUT = Path("public/icons")
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "favicon-180.png"
source = Image.open(SOURCE).convert("RGB")

for size in (192, 512):
    image = source.resize((size, size), Image.Resampling.LANCZOS)
    image.save(OUT / f"icon-{size}.png", optimize=True)

print(f"PWA icons generated from {SOURCE}.")
