"""Sinh icon PWA (PNG) từ hình hải đăng. Chạy: python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

INK = (18, 18, 18, 255)
WHITE = (255, 255, 255, 255)
ORANGE = (247, 132, 63, 255)
OUT = Path(__file__).resolve().parent.parent / "public" / "icons"


def make(size: int, out: str, maskable: bool = False) -> None:
    img = Image.new("RGBA", (size, size), WHITE)
    d = ImageDraw.Draw(img)
    pad = size * (0.2 if maskable else 0.1)
    r = (size - 2 * pad) / 2
    cx = cy = size / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ORANGE)
    # thân hải đăng
    top_w, bot_w = r * 0.42, r * 0.64
    top, bot = cy - r * 0.42, cy + r * 0.62
    d.polygon([(cx - top_w / 2, top), (cx + top_w / 2, top), (cx + bot_w / 2, bot), (cx - bot_w / 2, bot)], fill=INK)
    # đèn
    lh = r * 0.2
    d.rounded_rectangle([cx - top_w / 2 - r * 0.07, top - lh, cx + top_w / 2 + r * 0.07, top], radius=r * 0.06, fill=INK)
    # tia sáng
    w = max(2, int(size * 0.035))
    y = top - lh / 2
    d.line([(cx - r * 0.5, y + r * 0.04), (cx - r * 0.78, y - r * 0.1)], fill=INK, width=w)
    d.line([(cx + r * 0.5, y + r * 0.04), (cx + r * 0.78, y - r * 0.1)], fill=INK, width=w)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / out)


if __name__ == "__main__":
    make(192, "icon-192.png")
    make(512, "icon-512.png")
    make(512, "maskable-512.png", maskable=True)
    make(180, "apple-touch-icon-180.png")
    print("Đã tạo icon tại", OUT)
