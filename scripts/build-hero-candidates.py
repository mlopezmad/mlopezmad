#!/usr/bin/env python3
"""Genera una bolsa de candidatas para la portada dinámica de mlopezmad.

La página no analiza imágenes en cada visita: este script se ejecuta al publicar
fotografías y deja preparado data/hero-candidates.json.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

try:
    from PIL import Image, ImageOps
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Pillow es necesario para generar hero-candidates.json. "
        "Instala con: python3 -m pip install Pillow"
    ) from exc

ROOT = Path(__file__).resolve().parents[1]
COLLECTIONS_FILE = ROOT / "collections.json"
OUTPUT_FILE = ROOT / "data" / "hero-candidates.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

DESKTOP_FRAME_RATIO = 2.25
MOBILE_FRAME_RATIO = 0.62
MAX_ITEMS_PER_MODE = 90


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def image_path(collection: Dict[str, Any], filename: str) -> Path:
    filename = str(filename or "")
    if filename.startswith("images/"):
        return ROOT / filename
    return ROOT / str(collection.get("path", "")) / filename


def public_source(collection: Dict[str, Any], filename: str) -> str:
    filename = str(filename or "")
    if filename.startswith("images/"):
        return filename
    return f"{collection.get('path', '').strip('/')}/{filename}"


def gallery_filenames(collection: Dict[str, Any]) -> List[str]:
    gallery_path = ROOT / str(collection.get("json", ""))
    gallery = read_json(gallery_path, {"imagenes": []})
    names: List[str] = []
    for item in gallery.get("imagenes", []):
        if isinstance(item, str):
            name = item
        elif isinstance(item, dict):
            name = item.get("archivo") or item.get("file") or ""
        else:
            name = ""
        if name and name not in names:
            names.append(name)
    cover = collection.get("cover")
    if cover and cover not in names:
        names.insert(0, cover)
    return names


def crop_fraction(image_ratio: float, frame_ratio: float) -> float:
    if image_ratio <= 0 or frame_ratio <= 0:
        return 1.0
    if image_ratio >= frame_ratio:
        return 1.0 - (frame_ratio / image_ratio)
    return 1.0 - (image_ratio / frame_ratio)


def analyze_pixels(path: Path) -> Dict[str, float]:
    """Devuelve foco aproximado, detalle, contraste y brillo.

    No interpreta la foto con IA. Solo usa energía visual/contraste en una
    cuadrícula pequeña para encontrar una zona con información.
    """
    fallback = {"focusX": 50.0, "focusY": 50.0, "contrast": 0.42, "brightness": 0.5, "detail": 0.32}
    try:
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert("L")
            image.thumbnail((48, 48), Image.Resampling.LANCZOS)
            w, h = image.size
            if w < 4 or h < 4:
                return fallback
            pixels = list(image.tobytes())
    except Exception:
        return fallback

    values = [p / 255.0 for p in pixels]
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)

    total_energy = 0.0
    weighted_x = 0.0
    weighted_y = 0.0

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            idx = y * w + x
            dx = abs(values[idx + 1] - values[idx - 1])
            dy = abs(values[idx + w] - values[idx - w])
            distance = math.hypot((x / (w - 1)) - 0.5, (y / (h - 1)) - 0.5)
            center_bias = 0.74 + 0.26 * (1.0 - min(1.0, distance / 0.707))
            energy = (dx + dy) * center_bias
            total_energy += energy
            weighted_x += energy * x
            weighted_y += energy * y

    if total_energy <= 0:
        focus_x = 50.0
        focus_y = 50.0
    else:
        focus_x = (weighted_x / total_energy) / (w - 1) * 100.0
        focus_y = (weighted_y / total_energy) / (h - 1) * 100.0

    return {
        "focusX": round(clamp(focus_x, 0, 100), 2),
        "focusY": round(clamp(focus_y, 0, 100), 2),
        "contrast": round(clamp(math.sqrt(variance) * 3.1, 0, 1), 4),
        "brightness": round(clamp(mean, 0, 1), 4),
        "detail": round(clamp(total_energy / max(1, (w * h) / 42), 0, 1), 4),
    }


def read_dimensions(path: Path) -> Optional[Tuple[int, int]]:
    try:
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original)
            return image.size
    except Exception:
        return None


def object_position(meta: Dict[str, float], mode: str, frame_ratio: float) -> Dict[str, float]:
    ratio = meta["ratio"]
    x = 50.0
    y = 50.0
    if ratio > frame_ratio:
        x = clamp(meta.get("focusX", 50.0), 28 if mode == "mobile" else 30, 72 if mode == "mobile" else 70)
    if ratio < frame_ratio:
        y = clamp(meta.get("focusY", 50.0), 32 if mode == "mobile" else 36, 70 if mode == "mobile" else 64)
    return {"x": round(x, 1), "y": round(y, 1)}


def score_for_mode(meta: Dict[str, float], mode: str) -> Optional[float]:
    ratio = meta["ratio"]
    width = meta["width"]
    height = meta["height"]
    frame_ratio = MOBILE_FRAME_RATIO if mode == "mobile" else DESKTOP_FRAME_RATIO
    crop = crop_fraction(ratio, frame_ratio)

    if mode == "mobile":
        if ratio < 0.43 or ratio > 1.08:
            return None
        if height < 950 and width < 850:
            return None
        max_crop = 0.48
        sweet = 1.0 if 0.52 <= ratio <= 0.82 else 0.78
        resolution = clamp(min(height / 1700.0, width / 950.0), 0, 1)
    else:
        if ratio < 1.18:
            return None
        if width < 1150:
            return None
        max_crop = 0.46
        sweet = 1.0 if 1.32 <= ratio <= 2.1 else 0.80
        resolution = clamp(min(width / 1900.0, height / 980.0), 0, 1)

    if crop > max_crop:
        return None

    contrast = clamp(meta.get("contrast", 0.35) * 0.88 + meta.get("detail", 0.24) * 0.22, 0, 1)
    brightness = meta.get("brightness", 0.5)
    brightness_penalty = 0.10 if brightness < 0.16 or brightness > 0.9 else 0.0
    crop_score = 1.0 - (crop / max_crop)

    score = (
        crop_score * 55.0
        + resolution * 20.0
        + contrast * 18.0
        + sweet * 10.0
        - brightness_penalty * 22.0
    )
    return round(max(0.0, score), 2)


def candidate_entry(collection: Dict[str, Any], filename: str) -> Optional[Dict[str, Any]]:
    path = image_path(collection, filename)
    if not path.exists() or path.suffix.lower() not in IMAGE_EXTENSIONS:
        return None
    dimensions = read_dimensions(path)
    if not dimensions:
        return None
    width, height = dimensions
    analysis = analyze_pixels(path)
    ratio = width / height if height else 0
    return {
        "source": public_source(collection, filename),
        "collectionId": collection.get("id"),
        "title": collection.get("title", ""),
        "url": collection.get("url", "portfolio.html"),
        "width": width,
        "height": height,
        "ratio": round(ratio, 4),
        **analysis,
    }


def build() -> Dict[str, Any]:
    data = read_json(COLLECTIONS_FILE, {"collections": []})
    collections = data.get("collections", [])
    seen: set[str] = set()
    raw: List[Dict[str, Any]] = []

    for collection in collections:
        if collection.get("type") not in {"portfolio", "iphone4s"}:
            continue
        for filename in gallery_filenames(collection):
            source = public_source(collection, filename)
            if source in seen:
                continue
            seen.add(source)
            entry = candidate_entry(collection, filename)
            if entry:
                raw.append(entry)

    pools: Dict[str, List[Dict[str, Any]]] = {"desktop": [], "mobile": []}
    for entry in raw:
        for mode, frame_ratio in (("desktop", DESKTOP_FRAME_RATIO), ("mobile", MOBILE_FRAME_RATIO)):
            score = score_for_mode(entry, mode)
            if score is None:
                continue
            pools[mode].append(
                {
                    "source": entry["source"],
                    "desktopSource": entry["source"],
                    "mobileSource": entry["source"],
                    "collectionId": entry.get("collectionId"),
                    "title": entry.get("title", ""),
                    "url": entry.get("url", "portfolio.html"),
                    "width": entry["width"],
                    "height": entry["height"],
                    "ratio": entry["ratio"],
                    "score": score,
                    "objectPosition": object_position(entry, mode, frame_ratio),
                }
            )

    for mode in pools:
        pools[mode].sort(key=lambda item: item["score"], reverse=True)
        pools[mode] = pools[mode][:MAX_ITEMS_PER_MODE]

    home_cover = data.get("homeCover") or {}
    fallback_source = home_cover.get("source") or "images/portada.jpg"
    mobile_fallback = home_cover.get("mobileSource") or fallback_source

    return {
        "version": "3.5.1",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "strategy": "precomputed-smart-random-hero",
        "desktopFrameRatio": DESKTOP_FRAME_RATIO,
        "mobileFrameRatio": MOBILE_FRAME_RATIO,
        "fallback": {
            "source": fallback_source,
            "desktopSource": fallback_source,
            "mobileSource": mobile_fallback,
            "objectPosition": {"x": 50, "y": 50},
            "url": "portfolio.html",
        },
        "desktop": pools["desktop"],
        "mobile": pools["mobile"],
        "counts": {
            "raw": len(raw),
            "desktop": len(pools["desktop"]),
            "mobile": len(pools["mobile"]),
        },
    }


def comparable_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(payload)
    clean.pop("generatedAt", None)
    return clean


def main() -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result = build()

    previous = read_json(OUTPUT_FILE, None) if OUTPUT_FILE.exists() else None
    if isinstance(previous, dict) and comparable_payload(previous) == comparable_payload(result):
        result["generatedAt"] = previous.get("generatedAt", result["generatedAt"])

    OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "Hero candidates generated: "
        f"desktop={len(result['desktop'])}, mobile={len(result['mobile'])}, raw={result['counts']['raw']}"
    )


if __name__ == "__main__":
    main()
