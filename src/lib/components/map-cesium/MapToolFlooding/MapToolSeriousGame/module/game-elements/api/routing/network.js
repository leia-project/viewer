// network.js
import fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import JSONStream from 'JSONStream';
//import geobuf from 'geobuf';
//import Pbf from 'pbf';
import path from 'path';
import { fileURLToPath } from 'url';
//import { geojson } from 'flatgeobuf';
import { graphObjectToArrays as indexGraph } from './graphtoarray.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NetworkFileInfo {
  constructor(dataPath, filename) {
    this.dirname = path.dirname(filename);
    this.basename = path.basename(filename);
    this.ext = path.extname(this.basename);
    this.stem = path.basename(this.basename, this.ext);
    this.isNetworkNodesOrEdges = this.dirname === "." && (this.stem === 'nodes' || this.stem === 'edges');
    this.isNetworkGraph = this.dirname === "." && (this.stem === 'graph' || this.stem === 'graph2');
    if (this.isNetworkNodesOrEdges || this.isNetworkGraph) {
      this.dirname = dataPath;
    }
    this.fullStem = path.resolve(this.dirname, this.stem);
    this.extensions = this.ext ? [this.ext] : ['.pbf', '.fgb', '.geojson'];
  }
}

export class Network {
  constructor(area, mode) {
    this.area = area;
    this.mode = mode;
    this.nodes = null;
    this.edges = null;
    this.graph = null;
    this.loaded = {
      nodes: false,
      edges: false,
      graph: false
    };
    this.dataPath = path.resolve(__dirname, '.', '.', `data/${area}/${mode}`);

    this.dataPath = 'C:/Users/Stefan.de.Graaf/git/FIER/leia/static/data/' + area + '/' + mode;
    console.log(`Network initialized with data path: ${this.dataPath}`);
  }

  /** 
   * delete all files from cache and disk
   */
  deleteAllFiles() {
    const files = ['nodes', 'edges', 'graph.json', 'graph2.json'];
    try {
      for (const file of files) {
        const fileInfo = new NetworkFileInfo(this.dataPath, file);
        for (const extension of fileInfo.extensions) {
          if (fs.existsSync(fileInfo.fullStem + extension)) {
            fs.unlinkSync(fileInfo.fullStem + extension);
          }
        }
        if (fileInfo.isNetworkNodesOrEdges) {
          this[fileInfo.stem] = null;
          this.loaded[fileInfo.stem] = false;
        }
        if (fileInfo.isNetworkGraph) {
          this.graph = null;
          this.loaded.graph = false;
        }
      }
      return true;
    } catch (error) {
      console.error('deleteAllFiles:', error);
    }
    return false;
  }

  /**
   * Load GeoJSON FeatureCollection into edges or nodes cache and returns it
   * @public
   * @param {string} filename - 'nodes' or 'edges' or full file path with or wihout extension (.geojson, .pbf, .fgb)
   * @returns {object} - GeoJSON object from cache or file or null if not found
   * @public
   */
  async getFeatureCollection(filename) {
    const fileInfo = new NetworkFileInfo(this.dataPath, filename);
    for (const extension of fileInfo.extensions) {
      if (!fs.existsSync(fileInfo.fullStem + extension)) {
        continue;
      }
      const result = await this._loadFeatures(fileInfo.fullStem + extension);
      if (result?.type === 'FeatureCollection' && result?.features) {
        if (fileInfo.isNetworkNodesOrEdges) {
          this[fileInfo.stem] = result;
          this.loaded[fileInfo.stem] = true;
        }
        return result;
      }
    }
    if (fileInfo.isNetworkNodesOrEdges) {
      this[fileInfo.stem] = null;
      this.loaded[fileInfo.stem] = false;
    }
    return null;
  }

  /**
   * Write GeoJSON FeatureCollection to file and cache
   * @param {*} filename - 'nodes' or 'edges' or full file path with or wihout extension (.geojson, .pbf, .fgb)
   * @param {*} data - optional GeoJSON object to write
   * @returns {boolean} - true if successful, false otherwise
   * @public
   */
  async saveFeatureCollection(filename, data) {
    const fileInfo = new NetworkFileInfo(this.dataPath, filename);
    if (fileInfo.isNetworkNodesOrEdges) {
      if (!fs.existsSync(fileInfo.dirname)) {
        fs.mkdirSync(fileInfo.dirname, { recursive: true });
      }
      if (!data) {
        data = this[fileInfo.stem];
      }
    }
    if (!data?.type || !data?.features) {
      console.error('saveFeatureCollection: data is not a valid FeatureCollection:');
      return false;
    }
    try {
      await this._saveFeatures(fileInfo.fullStem + fileInfo.extensions[0], data);
      if (fileInfo.isNetworkNodesOrEdges) {
        this[fileInfo.stem] = data;
        this.loaded[fileInfo.stem] = true;
      }
      return true;
    } catch (error) {
      console.error('saveFeatureCollection:', error);
      return false;
    }
  }

  toBasicGraph(graph) {
    if (this._isIndexedGraph(graph)) {
      const basicGraph = {};
      for (let i = 0; i < graph.idArray.length; i++) {
        const id = graph.idArray[i];
        if (i < graph.lastStartid) { 
          result[id] = graph.graphArray[i];
        }
      }
      return basicGraph;
    } else if (this._isBasicGraph(graph)) {
      return graph;
    }
    return null; // input graph is no an indexed graph object
  }

  /**
   * get basic graph object from cache or file
   */
  async getBasicGraph() {
    if (this.loaded.graph) {
      return this.toBasicGraph(this.graph);
    }
    const fileInfo = new NetworkFileInfo(this.dataPath, 'graph.json');
    if (fs.existsSync(fileInfo.fullStem + '.json')) {
      const json = await this._readEntireJson(fileInfo.fullStem + '.json');
      if (this._isBasicGraph(json)) {
        this.graph = indexGraph(json);
        this.loaded.graph = true;
        return json;
      } else {
        console.error(`getBasicGraph: Invalid graph in ${fileInfo.fullStem + '.json'}`);
      }
    } else {
      const fileInfo = new NetworkFileInfo(this.dataPath, 'graph2.json');
      if (fs.existsSync(fileInfo.fullStem + '.json')) {
        const json = await this._readEntireJson(fileInfo.fullStem + '.json');
        if (this._isIndexedGraph(json)) {
          this.graph = json;
          this.loaded.graph = true;
          return this.toBasicGraph(json);
        } else {
          console.error(`getBasicGraph: Invalid graph in ${fileInfo.fullStem + '.json'}`);
        }
      }
    }
    return null;
  }

  /**
   * get simple graph object from cache or file
   */
  async getGraphObject(filename) {
    const fileInfo = new NetworkFileInfo(this.dataPath, filename);
    if (fileInfo.isNetworkGraph && fileInfo.stem === 'graph2' && this.loaded.graph) {
      return this.graph;
    }
    if (!fs.existsSync(fileInfo.fullStem + '.json')) {
      return null;
    }
    const json = await this._readEntireJson(fileInfo.fullStem + '.json');
    if (fileInfo.stem === 'graph2') {
      this.graph = json;
      this.loaded.graph = true;
    }
    return json;
  }

  _isIndexedGraph(obj) {
    return obj?.idArray && obj?.graphArray;
  }

  _isBasicGraph(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    if (obj.idArray && obj.graphArray) {
      return false;
    }
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const subObject = obj[key];
        return typeof subObject === 'object' && subObject !== null;
      }
    }
    return false;
  }

  async saveGraph(filename, data) {
    const fileInfo = new NetworkFileInfo(this.dataPath, filename);
    if (fileInfo.isNetworkGraph && !fs.existsSync(fileInfo.dirname)) {
      fs.mkdirSync(fileInfo.dirname, { recursive: true });
    }
    if (!data && this.loaded.graph) {
      data = this.graph;
    }
    try {
      if (fileInfo.stem === 'graph2' && this._isIndexedGraph(data)) {
        if (! await this._writeEntireJson(fileInfo.fullStem + '.json', data)) {
          return false;
        }
        this.graph = data;
        this.loaded.graph = true;
        return true;
      } else if (fileInfo.stem === 'graph' && this._isBasicGraph(data)) {
        if (!await this._writeEntireJson(fileInfo.fullStem + '.json', data)) {
          return false;
        }
        return true;
      } else {
        console.error('saveGraph: Invalid graph object');
      }
    } catch (error) {
      console.error('saveGraph:', error);
    }
    return false;
  }

  /**
   * Get ddges from the network or null if not loaded
   */
  getEdges() {
    if (this.loaded.edges) {
      return this.edges;
    }
    return null;
  }

  /** 
   * Get nodes from the network or null if not loaded
   */
  getNodes() {
    if (this.loaded.nodes) {
      return this.nodes;
    }
    return null;
  }

  /**
   * Get graph from the network or null if not loaded
   */
  async getGraph() {
    if (this.loaded.graph) {
      return this.graph;
    }
    let fileInfo = new NetworkFileInfo(this.dataPath, 'graph2.json');
    if (fs.existsSync(fileInfo.fullStem + '.json')) {
      const json = await this._readEntireJson(fileInfo.fullStem + '.json');
      if (this._isIndexedGraph(json)) {
        this.graph = json;
        this.loaded.graph = true;
        return json;
      } else {
        console.error(`getGraph: Invalid graph in ${fileInfo.fullStem + '.json'}, fall back to graph.json`);
      }
    }
    fileInfo = new NetworkFileInfo(this.dataPath, 'graph.json');
    if (fs.existsSync(fileInfo.fullStem + '.json')) {
      const json = await this._readEntireJson(fileInfo.fullStem + '.json');
      if (this._isBasicGraph(json)) {
        this.graph = indexGraph(json);
        this.loaded.graph = true;
        return this.graph;
      } else {
        console.error(`getGraph: Invalid graph in ${fileInfo.fullStem + '.json'}`);
      }
    }
    return null;
  }

  /**
   * Set edges in the network
   */
  setEdges(edges) {
    if (edges?.type === 'FeatureCollection' && edges?.features) {
      this.edges = edges;
      this.loaded.edges = true;
    } else {
      throw new Error('Invalid edges data');
    }
  }

  /** 
   * Set nodes in the network
   */
  setNodes(nodes) {
    if (nodes?.type === 'FeatureCollection' && nodes?.features) {
      this.nodes = nodes;
      this.loaded.nodes = true;
    } else {
      throw new Error('Invalid nodes data');
    }
  }

  /**
   * Set graph in the network
   */
  setGraph(graph) {
    if (this._isIndexedGraph(graph)) {
      this.graph = graph;
      this.loaded.graph = true;
    } else {
      const graphArray = indexGraph(graph);
      if (this._isIndexedGraph(graphArray)) {
        this.graph = graphArray;
        this.loaded.graph = true;
      } else {
        console.log(`Network.setGraph: invalid graph data`);
      }
    }
    return this.graph;
  }

  /**
   * Load features from file (supports both .geojson and .pbf)
   * @public
   */
  async loadFeatures(filePath, target = 'nodes') {
    try {
      console.log(`Loading ${target} from: ${filePath}`);
      const data = await this._loadFeatures(filePath);

      if (!data?.type || !data?.features) {
        throw new Error(`Invalid GeoJSON structure for ${target}`);
      }

      // Store the data in the appropriate property
      this[target] = data;
      this.loaded[target] = true;

      console.log(`Loaded ${data.features.length} ${target}`);
      return true;
    } catch (error) {
      console.error(`Error loading ${target}:`, error.message || error);
      return false;
    }
  }

  /**
   * Save features to file (supports both .geojson and .pbf)
   * @public
   */
  async saveFeatures(filePath, source = 'nodes') {
    try {
      const data = this[source];
      if (!data) {
        throw new Error(`No ${source} data available to save`);
      }

      console.log(`Saving ${source} to: ${filePath}`);
      await this._saveFeatures(filePath, data);
      console.log(`Saved ${data.features.length} ${source}`);
      return true;
    } catch (error) {
      console.error(`Error saving ${source}:`, error);
      return false;
    }
  }

  /**
   * Load from file
   * @private
   */
  async _loadFeatures(filePath) {
    const ext = path.extname(filePath).toLowerCase();
/*     if (ext === '.fgb') {
      return this._loadFromFlatGeobuf(filePath);
    }
    if (ext === '.pbf') {
      return this._loadFromPbf(filePath);
    } */
    return this._loadFromGeoJSON(filePath);
  }

  /**
   * Save to file
   * @private
   */
  async _saveFeatures(filename, data) {
    const basename = path.basename(filename);
    const ext = path.extname(basename);
  
    switch (ext.toLocaleLowerCase()) {
/*       case '.fgb':
        return this._saveToFlatGeobuf(filename, data);
      case '.pbf':
        return this._saveToPbf(filename, data); */
      case '.geojson':
        try {
          await this._saveToGeoJSON(filename, data);
          return true;
        } catch (error) {
          console.error(`_saveFeatures: Error saving GeoJSON: ${filename}: ${error}`);
          return false;
        }
      default:
        console.error(`_saveFeatures: Unsupported file extension for: ${filename}`);
        return false;
    }
  }

  /** 
   * save basic graph to file
   */
  async saveBasicGraph(inputGraph, filename = 'graph.json') {
    let graph = inputGraph;
    const fileInfo = new NetworkFileInfo(this.dataPath, filename);
    if (!graph && fileInfo.isNetworkGraph) {
      graph = this.loaded.graph ? this.graph : null;
    }
    if (!graph) {
      console.error('saveBasicGraph: No graph data available');
      return false;
    }
    if (!fs.existsSync(fileInfo.dirname)) {
      fs.mkdirSync(fileInfo.dirname, { recursive: true });
    }
    if (!this._isBasicGraph(graph) && this._isIndexedGraph(graph)) {
      graph = this.toBasicGraph(graph);
    }
    if (!this._isBasicGraph(graph)) {
      console.error('saveBasicGraph: Invalid graph object');
      return false;
    }
    try {
      await this._writeEntireJson(fileInfo.fullStem + '.json', graph);
      return true;
    } catch (error) {
      console.error('saveBasicGraph:', error);
      return false;
    }
  }

  saveGraph(inputGraph, filename = 'graph2.json') {
    let graph = inputGraph;
    const fileInfo = new NetworkFileInfo(this.dataPath, filename);
    if (!graph && fileInfo.isNetworkGraph) {
      graph = this.loaded.graph ? this.graph : null;
    }
    if (!graph) {
      console.error('saveGraph: No graph data available');
      return false;
    }
    if (!fs.existsSync(fileInfo.dirname)) {
      fs.mkdirSync(fileInfo.dirname, { recursive: true });
    }
    if (!this._isIndexedGraph(graph) && this._isBasicGraph(graph)) {
      graph = indexGraph(graph);
    } 
    if (!this._isIndexedGraph(graph)) {
      console.error('saveGraph: Invalid graph object');
      return false;
    }
    try {
      if (fileInfo.isNetworkGraph) {
        this.graph = graph;
        this.loaded.graph = true;
      }
      return this._writeEntireJson(fileInfo.fullStem + '.json', graph);
    } catch (error) {
      console.error('saveGraph:', error);
      return false;
    }
  }

  /**
   * Save to FlatGeobuf file
   * @private
   * @param {string} filePath - path to save file
   * @param {object} data - GeoJSON object to save
   * @returns {boolean} - true if successful, false otherwise
   * @private
   */
/*   async _saveToFlatGeobuf(filePath, data) {
    try {
      const buffer = geojson.serialize(data);
      await fs.promises.writeFile(filePath, buffer);
      return true;
    } catch (error) {
      console.error(`_saveToFlatGeobuf: Error saving FlatGeobuf: ${filePath}: ${error}`);
      return false;
    }
  } */

  /**
   * Load from FlatGeobuf file
   * @param {string} filePath - path to load file
   * @returns {object} - GeoJSON object from file or null if not possible
   * @private
   */
/*   async _loadFromFlatGeobuf(filePath) {
    try {
      console.log('Reading FlatGeobuf file...');
      const buffer = await fs.promises.readFile(filePath);
      return geojson.deserialize(buffer);
    } catch (error) {
      console.error(`_loadFromFlatGeobuf: Error loading FlatGeobuf: ${filePath}: ${error}`);
      return null;
    }
  } */

  /**
   * Load from PBF file
   * @private
   */
/*   async _loadFromPbf(filePath) {
    try {
      console.log(`Reading ${filePath} ...`)
      const buffer = await fs.promises.readFile(filePath);
      return geobuf.decode(new Pbf(buffer));
    } catch (error) {
      console.error('Error loading PBF:', error.message || error); 
      throw error;
    }
  }
 */
  /**
   * Save to PBF file
   * @private
   */
/*   async _saveToPbf(filePath, data) {
    try {
      // Encode using the exact same method as Geobuf class
      const buffer = geobuf.encode(data, new Pbf());
      await fs.promises.writeFile(filePath, buffer);
      return true;
    } catch (error) {
      console.error(`_saveToPbf:  Error saving PBF: ${filePath}: ${error.message || error}`);
      return false;
    }
  } */

  /**
   * Load from GeoJSON file
   * @private
   */
  async _loadFromGeoJSON(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const stream = createReadStream(filePath, { encoding: 'utf8' });
        const typeParser = JSONStream.parse('type');

        stream.on('error', reject);

        stream.pipe(typeParser)
          .on('data', (type) => {
            if (type === 'FeatureCollection') {
              stream.destroy();
              this._streamGeoJsonFeatures(filePath)
                .then(resolve)
                .catch(reject);
            } else {
              stream.destroy();
              this._readEntireJson(filePath)
                .then(resolve)
                .catch(reject);
            }
          })
          .on('end', () => {
            this._readEntireJson(filePath)
              .then(resolve)
              .catch(reject);
          })
          .on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save to GeoJSON file
   * @private
   */
  async _saveToGeoJSON(filePath, data) {
    return new Promise((resolve, reject) => {
      try {
        const writeStream = createWriteStream(filePath);
        const BATCH_SIZE = 1000;  // Process 1000 features at a time
        let isWriting = false;

        // Write opening
        writeStream.write('{\n');
        writeStream.write('  "type": "FeatureCollection",\n');
        writeStream.write('  "features": [\n');

        // Process features in batches
        const processFeatures = async () => {
          for (let i = 0; i < data.features.length; i += BATCH_SIZE) {
            const batch = data.features.slice(i, i + BATCH_SIZE);

            for (let j = 0; j < batch.length; j++) {
              // Add comma if not first feature
              if (i + j > 0) {
                writeStream.write(',\n');
              }

              const feature = batch[j];
              writeStream.write(JSON.stringify(feature, null, 2));
            }

            // Log progress every 100,000 features
            if (i % 500000 === 0) {
              console.log(`Processed ${i} features...`);
            }

            // Allow event loop to process other tasks
            await new Promise(resolve => setImmediate(resolve));
          }

          // Write closing
          writeStream.write('\n  ]\n');
          writeStream.write('}');
          writeStream.end();
        };

        writeStream.on('finish', () => {
          console.log(`Finished writing ${data.features.length} features to ${filePath}`);
          resolve();
        });

        writeStream.on('error', reject);

        // Start processing
        processFeatures().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stream GeoJSON features from file
   * @private
   */
  async _streamGeoJsonFeatures(filePath) {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { encoding: 'utf8' });
      const parser = JSONStream.parse('features.*');
      const features = [];
      let featureCount = 0;

      stream.pipe(parser)
        .on('data', (feature) => {
          features.push(feature);
          featureCount++;
          if (featureCount % 500000 === 0) {
            console.log(`Processed ${featureCount} features...`);
          }
        })
        .on('end', () => {
          console.log(`Finished loading ${featureCount} features`);
          resolve({
            type: 'FeatureCollection',
            features: features
          });
        })
        .on('error', reject);

      stream.on('error', reject);
    });
  }

  /**
   * Read entire JSON file
   * @private
   */
  async _readEntireJson(filePath) {
    try {
      const data = await fs.promises.readFile(filePath, { encoding: 'utf8' });
      return JSON.parse(data);
    } catch (error) {
      console.error(`_readEntireJson: Error reading JSON: ${filePath}: ${error.message || error}`);
      return null;
    }
  }

  /** Write entire JSON file 
   * @private
   */
  async _writeEntireJson(filePath, data) {
    try {
      const json = JSON.stringify(data);
      await fs.promises.writeFile(filePath, json);
      return true;
    } catch (error) {
      console.error(`_writeEntireJson: Error writing JSON: ${filePath}: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Load graph object from json
   * @public
   */
  async loadGraphObjectFromJSON(filePath) {
    try {
      console.log('Loading graph from:', filePath);
      const graphObject = await this._readEntireJson(filePath);
      if (!graphObject) {
        throw new Error('Invalid graph structure');
      }
      if (this._isIndexedGraph(graphObject)) {
        this.graph = graphObject;
      } else {
        console.time('Converting graph object to arrays');
        this.graph = indexGraph(graphObject);
        console.timeEnd('Converting graph object to arrays');
      }
      this.loaded.graph = true;
      return true;
    } catch (error) {
      console.error('Error loading graph structure:', error.message || error);
      return false;
    }
  }

  /**
   * Check if all required data is loaded
   * @public
   */
  isFullyLoaded() {
    return this.loaded.nodes && this.loaded.edges && this.loaded.graph;
  }

  /**
   * Get network statistics
   * @public
   */
  getStats() {
    if (!this.isFullyLoaded()) {
      throw new Error('Network data not fully loaded');
    }

    return {
      nodeCount: this.nodes.features.length,
      edgeCount: this.edges.features.length,
      area: this.area,
      mode: this.mode
    };
  }

  /**
   * Clear memory
   * @public
   */
  clear() {
    this.nodes = null;
    this.edges = null;
    this.graph = null;
    this.loaded = {
      nodes: false,
      edges: false,
      graph: false
    };
  }
}

export async function createNetwork(area, mode) {
  const network = new Network(area, mode);
  return network;
}

export async function createGraph(area, mode) {
  console.log(`Creating graph for area: ${area}, mode: ${mode}`);
    const network = new Network(area, mode);
    const edges = await network.getFeatureCollection('edges');
    if (edges) {
      console.log(`Number of edges: ${edges.features.length}`);
    }
/*     const nodes = await network.getFeatureCollection('nodes');
    if (nodes) {
      console.log(`Number of nodes: ${nodes.features.length}`);
      let result = await network.saveFeatureCollection('edges.fgb');
      console.log(`Saved: ${result}`);
    
    } */
  
    const basicGraph = await network.getBasicGraph();
    if (basicGraph) {
      console.log(`Number of ids in graph: ${Object.keys(basicGraph).length}`);
    }
    const graph = await network.getGraph();
    if (graph) {
      console.log(`Number of ids in graph: ${graph.idArray.length}`);
    }
    if (edges && graph) {
      
      //result = await network.saveBasicGraph(basicGraph);
      //console.log(`SaveBasicGaph: ${result}`);
      let result = await network.saveGraph(graph);
      console.log(`SaveGraph: ${result}`);
      result = await network.saveFeatureCollection('edges', edges);
      console.log(`Save edges: ${result}`);
    }
}

/* if (process.argv[1] === __filename) {
  const network = new Network('zeeland', 'car');
  const edges = await network.getFeatureCollection('edges');
  if (edges) {
    console.log(`Number of edges: ${edges.features.length}`);
  }
  const nodes = await network.getFeatureCollection('nodes');
  if (nodes) {
    console.log(`Number of nodes: ${nodes.features.length}`);
    let result = await network.saveFeatureCollection('edges.fgb');
    console.log(`Saved: ${result}`);
  
  }
 
  const basicGraph = await network.getBasicGraph();
  if (basicGraph) {
    console.log(`Number of ids in graph: ${Object.keys(basicGraph).length}`);
  }
  const graph = await network.getGraph();
  if (graph) {
    console.log(`Number of ids in graph: ${graph.idArray.length}`);
  }
  if (edges && graph) {
    
    //result = await network.saveBasicGraph(basicGraph);
    //console.log(`SaveBasicGaph: ${result}`);
    let result = await network.saveGraph(graph);
    console.log(`SaveGraph: ${result}`);
    result = await network.saveFeatureCollection('edges', edges);
    console.log(`Save edges: ${result}`);
  }
} */