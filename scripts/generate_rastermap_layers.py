import geopandas as gpd
from rasterio.transform import from_bounds
from rasterio.crs import CRS
import rasterio
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import io
import os
import zipfile
import tempfile
from pathlib import Path
from pyproj import Transformer
import pandas as pd
import re
from collections import defaultdict


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SHP_DIR = os.path.join(BASE_DIR, "shapefiles")
TIF_DIR = os.path.join(BASE_DIR, "output", "tif")
WEBP_DIR = os.path.join(BASE_DIR, "output", "webp")
WIDTH = 4677
HEIGHT = 3307
FIXED_BOUNDS = [2423931.3675, 7864946.3005, 3140088.0456, 8329923.4960]
LAYER_NAME = "E_305_puittaimestik_a"

os.makedirs(TIF_DIR, exist_ok=True)
os.makedirs(WEBP_DIR, exist_ok=True)

def get_year_from_zip(zip_path):
    match = re.search(r'SHP_(\d{4})', zip_path.name)
    return match.group(1) if match else None

def extract_layer_from_zip(zip_path, layer_name=LAYER_NAME):
    tmp_dir = tempfile.mkdtemp()
    with zipfile.ZipFile(zip_path, 'r') as z:
        matching = [f for f in z.namelist() if os.path.splitext(os.path.basename(f))[0] == layer_name]
        for f in matching:
            z.extract(f, tmp_dir)
    return tmp_dir


def load_gdfs_from_folder(year_folder):
    gdfs = []

    # Try zips first
    for zip_path in sorted(year_folder.glob("*.zip")):
        tmp_dir = extract_layer_from_zip(zip_path)
        shp_files = list(Path(tmp_dir).rglob(f"{LAYER_NAME}.shp"))
        for shp in shp_files:
            print(f"    Loading {shp} from {zip_path.name}")
            gdfs.append(gpd.read_file(shp).to_crs("EPSG:3857"))

    # Also try loose shp files
    for shp in sorted(year_folder.glob("*.shp")):
        print(f"    Loading {shp.name}")
        gdfs.append(gpd.read_file(shp).to_crs("EPSG:3857"))

    return gdfs


def render_gdfs(gdfs, year):
    gdf = pd.concat(gdfs).reset_index(drop=True) if len(gdfs) > 1 else gdfs[0]
    bounds = np.array(FIXED_BOUNDS)

    fig, ax = plt.subplots(figsize=(WIDTH / 100, HEIGHT / 100), dpi=100)
    ax.set_axis_off()
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)
    ax.set_aspect('equal')

    gdf.plot(ax=ax, color='#2d6a2d', alpha=0.8)

    ax.set_xlim(bounds[0], bounds[2])
    ax.set_ylim(bounds[1], bounds[3])

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)

    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', pad_inches=0, transparent=True)
    plt.close(fig)
    buf.seek(0)

    img = Image.open(buf).convert("RGBA")
    img_array = np.array(img)
    h, w = img_array.shape[:2]

    transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], w, h)

    tif_path = os.path.join(TIF_DIR, f"{year}.tif")
    webp_path = os.path.join(WEBP_DIR, f"{year}.webp")

    with rasterio.open(
        tif_path, 'w',
        driver='GTiff',
        height=h,
        width=w,
        count=4,
        dtype=rasterio.ubyte,
        crs=CRS.from_epsg(3857),
        transform=transform,
    ) as dst:
        dst.write(img_array[:, :, 0], 1)
        dst.write(img_array[:, :, 1], 2)
        dst.write(img_array[:, :, 2], 3)
        dst.write(img_array[:, :, 3], 4)

    img.save(webp_path, 'WEBP', quality=50)

    transformer = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    west, south = transformer.transform(bounds[0], bounds[1])
    east, north = transformer.transform(bounds[2], bounds[3])

    return west, south, east, north


# --- Iterate through year folders ---
zip_files = sorted(Path(SHP_DIR).glob("ETAK_EESTI_SHP_*.zip"))
by_year = defaultdict(list)

for zip_path in zip_files:
    year = get_year_from_zip(zip_path)
    if year:
        by_year[year].append(zip_path)
    else:
        print(f"Could not determine year for {zip_path.name}, skipping.")

for year, zips in sorted(by_year.items()):
    webp_path = os.path.join(WEBP_DIR, f"{year}.webp")
    if os.path.exists(webp_path):
        print(f"  Skipping {year}, already exists.")
        continue
    
    print(f"Processing year {year}...")
    gdfs = []
    for zip_path in zips:
        tmp_dir = extract_layer_from_zip(zip_path)
        shp_files = list(Path(tmp_dir).rglob(f"{LAYER_NAME}.shp"))
        for shp in shp_files:
            print(f"    Loading {shp.name} from {zip_path.name}")
            gdfs.append(gpd.read_file(shp).to_crs("EPSG:3857"))

    if not gdfs:
        print(f"  No matching layers found, skipping.")
        continue

    west, south, east, north = render_gdfs(gdfs, year)
    print(f"  Saved to {WEBP_DIR}/{year}.webp and {TIF_DIR}/{year}.tif")
    print(f"  Bounds: [{west:.6f}, {north:.6f}], [{east:.6f}, {north:.6f}], [{east:.6f}, {south:.6f}], [{west:.6f}, {south:.6f}]")

print("Done.")