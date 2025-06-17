# DuckDB hexagons to database

Install duckdb and make sure it is added in your PATH. Open a file via the following command.

```
duckdb database.duckdb
```

Enable geospatial capabilities and support for geometry columns:
```
INSTALL SPATIAL;
LOAD SPATIAL;
```

To check which tables are available, you can use:

```
show tables;
```

To transfer a table to PostgreSQL database, you can first make an export to CSV:

```
COPY (SELECT * FROM cbs) TO 'cbs_data.csv' (HEADER, DELIMITER ',');
```

Then you create an empty table in the database with the approriate column names and types. This tables can be filled with the values from the CSV:
And then use psql to transfer it to the database:

```
\COPY datacore.cbs FROM 'cbs_data.csv' DELIMITER ',' CSV HEADER;
```


# Routing network to database

Follow this guide to use the processed network of Sweco in the game.

The source file is a .gpkg with the road network in Zeeland, including the properties:
- A: source
- B: target
- oneway_auto: "B" for both directions or "F" for a one way direction (one entry "T"; one way "terug"?)
- capaciteit: number of cars that can use the road per hour


## Load data into database

In the command promopt, cd to the folder with the .gpkg file. Then use ogr2ogr to load the .gpkg into the database. The source data is in EPSG:28992, so it is important to explicitly reproject to EPSG:4326.

```
ogr2ogr -f "PostgreSQL" PG:"host=localhost port=5432 dbname=postgres user=postgres password=password" 10_netwerk_met_evacuatieroutes_Definitief.gpkg -nln datacore.zeeland_road_network -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -lco FID=fid -t_srs EPSG:4326 -overwrite
```

We rename the columns 'a' and 'b' to our default names 'source' and 'target':

```
ALTER TABLE zeeland.road_network 
	RENAME COLUMN a to source;
ALTER TABLE zeeland.road_network 
	RENAME COLUMN b to target;
```

The network contains all the node edges. However, there are not yet costs calculated. We can add costs based on the length of the line segment (in meters) and the direction:

```
ALTER TABLE zeeland.road_network 
  ADD COLUMN cost FLOAT,
  ADD COLUMN reverse_cost FLOAT;
UPDATE zeeland.road_network
	SET cost = ST_Length(ST_Transform(geom, 28992)),
	    reverse_cost = ST_Length(ST_Transform(geom, 28992))
		WHERE oneway_auto = 'B';
UPDATE zeeland.road_network
	SET cost = ST_Length(ST_Transform(geom, 28992)),
	    reverse_cost = -ST_Length(ST_Transform(geom, 28992))
		WHERE oneway_auto = 'F';
UPDATE zeeland.road_network
	SET cost = -ST_Length(ST_Transform(geom, 28992)),
	    reverse_cost = ST_Length(ST_Transform(geom, 28992))
		WHERE oneway_auto = 'T';
```

Finally create an index on the geom column:

```
CREATE INDEX zeeland_road_network_geom_idx ON zeeland.road_network USING GIST (geom);
```

### Not needed: pgr_createTopology

If the network is incorrect, we could recreate the topology using the pgRouting extension. `pgr_createTopology` requires a column named 'source' and a column named 'target'.

```
ALTER TABLE zeeland.road_network ADD COLUMN source INTEGER;
ALTER TABLE zeeland.road_network ADD COLUMN target INTEGER;

CREATE EXTENSION IF NOT EXISTS pgRouting;
SELECT pgr_createTopology(
    'road_network',					-- target table name
    0.0001,							-- snapping tolerance (adjust as needed)
    'geom',							-- geometry column
    'fid'							-- ID column
);
```

And check if the topology is valid:

```
SELECT pgr_analyzeGraph('road_network', 0.0001, 'geom', 'fid');
```

### Exporting from PostgreSQL

If needed, the table can be exported from the database using ogr2ogr

```
ogr2ogr -f GeoJSON edges2.geojson PG:"host=localhost dbname=postgres user=postgres password=pantai45." -sql "SELECT fid, geom, source, target, capaciteit, cost, reverse_cost FROM zeeland.road_network"
```

## Routing

The edges and derived graph are imported into the Serious Game front-end dynamically using PGRest.
