"""
Builds public/images/mashaer-map.jpg: the real map of Makkah, Mina, Muzdalifah and Arafat behind the
operations room's live incident map (app/staff/operations/view.tsx, MashaerMap).

OpenStreetMap tiles are stitched once and kept as a static picture, so the page needs no map library
and works offline. The picture covers exactly BOUNDS below in Web Mercator, at the map's 700×400 ratio;
the page uses the same numbers to put each place on it, so if they change here they change there too.
The picture is tinted to the operations room's dark green. Map data © OpenStreetMap contributors (ODbL),
credited on the map itself.

Usage: python scripts/build-mashaer-map.py   (needs Pillow and network access; run from the repo root)
"""
import io
import math
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

# West and east edges, and the latitude the picture is centred on; north and south follow from the ratio
WEST, EAST, CENTER_LAT = 39.79, 40.01, 21.385
RATIO = 700 / 400
ZOOM = 14
OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "mashaer-map.jpg"
UA = "SDHU-demo-map-builder/1.0 (one static picture for a demo site)"


def merc_y(lat):
    r = math.radians(lat)
    return math.log(math.tan(math.pi / 4 + r / 2))


def lat_of(y):
    return math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)


# The mercator height the ratio allows, split evenly around the centre latitude
span_x = math.radians(EAST - WEST)
cy = merc_y(CENTER_LAT)
NORTH, SOUTH = lat_of(cy + span_x / RATIO / 2), lat_of(cy - span_x / RATIO / 2)


def tile_xy(lat, lon):
    n = 2 ** ZOOM
    return (lon + 180) / 360 * n, (1 - merc_y(lat) / math.pi) / 2 * n


x0, y0 = tile_xy(NORTH, WEST)
x1, y1 = tile_xy(SOUTH, EAST)
tiles = {}
for tx in range(int(x0), int(x1) + 1):
    for ty in range(int(y0), int(y1) + 1):
        req = urllib.request.Request(f"https://tile.openstreetmap.org/{ZOOM}/{tx}/{ty}.png", headers={"User-Agent": UA})
        tiles[tx, ty] = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
        time.sleep(0.2)

sheet = Image.new("RGB", ((int(x1) - int(x0) + 1) * 256, (int(y1) - int(y0) + 1) * 256))
for (tx, ty), im in tiles.items():
    sheet.paste(im, ((tx - int(x0)) * 256, (ty - int(y0)) * 256))
box = tuple(round(v) for v in ((x0 - int(x0)) * 256, (y0 - int(y0)) * 256, (x1 - int(x0)) * 256, (y1 - int(y0)) * 256))
crop = sheet.crop(box).resize((1400, 800), Image.LANCZOS)

# Night tint: roads and built-up areas light, open desert dark, all in the room's greens
grey = ImageOps.invert(ImageOps.grayscale(crop))
grey = ImageEnhance.Contrast(grey).enhance(1.35)
tinted = ImageOps.colorize(grey, black="#011f1b", mid="#0c4a42", white="#8fc4b9")
tinted.save(OUT, quality=80, optimize=True, progressive=True)

print(f"{len(tiles)} tiles -> {OUT} ({OUT.stat().st_size // 1024} KB)")
print(f"BOUNDS = {{ west: {WEST}, east: {EAST}, north: {NORTH:.5f}, south: {SOUTH:.5f} }}")
