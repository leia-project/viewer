import { length as turfLength } from '@turf/turf'
import { graphObjectToArrays } from './graphtoarray';
import { PGRestAPI } from '../pg-rest-api';

const dataPath = './data';

let edgesIndex = {};
let networks = {};

export function getEdgeIndex(networkArea, networkType, edges) {
    if (!edgesIndex[networkArea + networkType]) {
        const index = {}
        for (const feature of edges.features) {
          if (feature.properties.source !== 'start' && feature.properties.source !== 'end' && feature.properties.target !== 'start' && feature.properties.target !== 'end') {
            if (!index[feature.properties.source]) {
                index[feature.properties.source] = {};
            }
            index[feature.properties.source][feature.properties.target] = feature;
          }
        }
        edgesIndex[networkArea + networkType] = index;
    }
    return edgesIndex[networkArea + networkType];
}

async function loadGraphObjectFromJSON(path) {
  const result = await fetch(path);
  const json = await result.json();  
  return json;
}

async function loadFeatures(path) {
  const result = await fetch(path);
  const json = await result.json();
  return json;
}

export async function getNetwork(networkArea, networkType) {
  if (networks[networkArea + networkType] === undefined) {
    networks[networkArea + networkType] = {};
    const basePath = `${dataPath}/${networkArea}/${networkType}`;

    networks[networkArea + networkType].graph = await loadGraphObjectFromJSON(`${basePath}/graph2.json`);
    networks[networkArea + networkType].edges = await loadFeatures(`${basePath}/edges.geojson`);
    
    for (const edge of networks[networkArea + networkType].edges.features) {
      if (edge.geometry.type === "MultiLineString") {
        // convert MultiLineStrings to LineStrings when possible
        if (edge.geometry.coordinates.length > 1) {
            console.log(`edge ${edge.properties.id} is a multiline string`);
        } else {
          edge.geometry.type = 'LineString';
          edge.geometry.coordinates = edge.geometry.coordinates[0];
        }
      }
      edge.properties.length = turfLength(edge, {units: 'meters'});
    }
    networks[networkArea + networkType].loaded = true;
  }
  return networks[networkArea + networkType];
}

export async function getNetworkPGRest(networkArea, networkType, polgyon) {
  const pgRestAPI = new PGRestAPI();
  if (networks[networkArea + networkType] === undefined) {
    networks[networkArea + networkType] = {};
    const basePath = `${dataPath}/${networkArea}/${networkType}`;

    const edges = await pgRestAPI.getRoadNetworkEdges(polgyon);
    const graph = await pgRestAPI.getRoadNetworkGraph(polgyon);
    networks[networkArea + networkType].edges = edges;
    networks[networkArea + networkType].graph = graphObjectToArrays(graph);

    
    for (const edge of networks[networkArea + networkType].edges.features) {
      if (edge.geometry.type === "MultiLineString") {
        // convert MultiLineStrings to LineStrings when possible
        if (edge.geometry.coordinates.length > 1) {
            console.log(`edge ${edge.properties.id} is a multiline string`);
        } else {
          edge.geometry.type = 'LineString';
          edge.geometry.coordinates = edge.geometry.coordinates[0];
        }
      }
      edge.properties.length = turfLength(edge, {units: 'meters'});
    }
    networks[networkArea + networkType].loaded = true;
  }
  return networks[networkArea + networkType];
}



function getEdgeById(network, id, idField) {
  if (!network.edgesIndex) {
    network.edgesIndex = {};
    for (const feature of network.edges.features) {
      network.edgesIndex[feature.properties[idField].toString()] = feature;
    }
  }
  return network.edgesIndex[id];
}

export async function disableGraphEdges(networkArea, networkType, edgeIds, idField = 'id') {
  const network = await getNetwork(networkArea, networkType);
  if (!network.disabledGraphEntries) {
    network.disabledGraphEntries = {};
  }
  for (const edgeId of edgeIds) {
    const edge = getEdgeById(network, edgeId, idField);
    if (edge) {
      const source = edge.properties.source.toString();
      const target = edge.properties.target.toString();
      const sourceIndex = network.graph.idArray.indexOf(source);
      const targetIndex = network.graph.idArray.indexOf(target);
      if (!network.disabledGraphEntries[sourceIndex + '-' + targetIndex]) { 
        if (network.graph.graphArray[sourceIndex]?.[targetIndex]) {
          network.disabledGraphEntries[sourceIndex + '-' + targetIndex] = network.graph.graphArray[sourceIndex][targetIndex];
          network.graph.graphArray[sourceIndex][targetIndex] = null;
        }
      }
      if (!network.disabledGraphEntries[targetIndex + '-' + sourceIndex]) {
        if (network.graph.graphArray[targetIndex]?.[sourceIndex]) {
          network.disabledGraphEntries[targetIndex + '-' + sourceIndex] = network.graph.graphArray[targetIndex][sourceIndex];
          network.graph.graphArray[targetIndex][sourceIndex] = null;
        }
      }
    }
  }
}

export async function enableGraphEdges(networkArea, networkType, edgeIds, idField = 'id') {
    const network = await getNetwork(networkArea, networkType);
    if (!network.disabledGraphEntries) return;

    for (const edgeId of edgeIds) {
        const edge = getEdgeById(network, edgeId, idField);
        if (edge) {
            const source = edge.properties.source.toString();
            const target = edge.properties.target.toString();
            const sourceIndex = network.graph.idArray.indexOf(source);
            const targetIndex = network.graph.idArray.indexOf(target);

            const key1 = sourceIndex + '-' + targetIndex;
            const key2 = targetIndex + '-' + sourceIndex;

            if (network.disabledGraphEntries[key1]) {
                network.graph.graphArray[sourceIndex][targetIndex] = network.disabledGraphEntries[key1];
                delete network.disabledGraphEntries[key1];
            }
            if (network.disabledGraphEntries[key2]) {
                network.graph.graphArray[targetIndex][sourceIndex] = network.disabledGraphEntries[key2];
                delete network.disabledGraphEntries[key2];
            }
        }
    }
}

export async function resetGraphToDefault(networkArea, networkType) {
  const network = await getNetwork(networkArea, networkType);
  let disabledGraphEntries = network.disabledGraphEntries;
  if (!disabledGraphEntries) {
    return;
  }
  for (const key in disabledGraphEntries) {
    const [sourceIndex, targetIndex] = key.split('-');
    network.graph.graphArray[sourceIndex][targetIndex] = disabledGraphEntries[key];
  }
  network.disabledGraphEntries = {};
}
