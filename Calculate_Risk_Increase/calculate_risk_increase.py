"""
=============================
calculate_risk_increase.py
=============================

This script merges two GeoJSON datasets based on geometry and identifies
areas where risk levels have increased between current and future scenarios.

Input:
- GeoJSON file with current risk data (opwm_opp_huidig.geojson)
- GeoJSON file with 2050 risk projection data (opwm_opp_2050.geojson)

Output:
- GeoJSON file with merged data and risk increase indicator (opwm_opp_risk_increase.geojson)
"""

import geopandas as gpd


def main():
    # Load the GeoDataFrames
    gdf1 = gpd.read_file("data/opwm_opp_huidig.geojson")
    gdf2 = gpd.read_file("data/opwm_opp_2050.geojson")

    # Merge the GeoDataFrames on geometry
    joined = gdf1.merge(gdf2, on='geometry', how='inner')

    # Create a new column to indicate risk increase
    joined["risk_increase"] = joined["risicokl_3_y"] > joined["risicokl_3_x"]
    print(joined)

    # Save output
    joined.to_file("data/opwm_opp_risk_increase.geojson", driver='GeoJSON')


if __name__ == "__main__":
    main()
