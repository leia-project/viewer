"""
=============================
calculate_lowest_10percent.py
=============================

This script identifies the lowest 10% elevation areas within each polygon
from a vector dataset and outputs a raster mask file.

Input:
- Digital terrain model (DTM) raster
- Polygon vector data Peilgebieden (default)
- Polygon vector data Afwateringsgebieden (commented out)

Swap between Peilgebieden and Afwateringsgebieden by commenting/uncommenting
the appropriate lines.

Output:
- Raster file (1 = lowest 10% elevation areas, 0/NoData = other areas)
"""

import geopandas as gpd
import rasterio
from rasterio.features import rasterize
import numpy as np


def main():
    # Paths (change vector and output paths if you want to analyze Afwateringsgebieden!)
    raster_path = "data/Zeeland_AHN5_DTM_Combined.tif"

    vector_path = "data/Peilgebieden.geojson"
    #vector_path = "data/Afwateringsgebieden.geojson"

    output_path = "data/peilgebieden_low10.tif"
    #output_path = "data/afwateringsgebieden_low10.tif"

    # Load polygon data
    gdf = gpd.read_file(vector_path)

    # Open the raster
    with rasterio.open(raster_path) as src:
        raster_meta = src.meta.copy()
        raster_array = src.read(1)
        affine = src.transform
        nodata = src.nodata
        raster_shape = src.shape

    # Create empty output array
    output_array = np.zeros(raster_shape, dtype=np.uint8)

    # Loop through polygons
    for idx, row in gdf.iterrows():
        geom = row.geometry

        # Rasterize just this polygon into a mask
        poly_mask = rasterize(
            [(geom, 1)],
            out_shape=raster_shape,
            transform=affine,
            fill=0,
            dtype=np.uint8
        )

        # Mask the raster with the polygon
        masked_values = raster_array[poly_mask == 1]

        # Remove nodata values
        if nodata is not None:
            masked_values = masked_values[masked_values != nodata]

        if len(masked_values) == 0:
            continue

        # Calculate 10th percentile
        threshold = np.percentile(masked_values, 10)

        # Create a mask for values <= threshold within polygon
        low_mask = ((raster_array <= threshold) & (poly_mask == 1))

        # Set output to 1 where condition is met
        output_array[low_mask] = 1

    # Update metadata for output
    raster_meta.update({
        "dtype": "uint8",
        "count": 1,
        "nodata": 0
    })

    # Save the output raster
    with rasterio.open(output_path, "w", **raster_meta) as dst:
        dst.write(output_array, 1)


if __name__ == "__main__":
    main()