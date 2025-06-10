import { findPath, dijkstra, getCost} from './dijkstra.js';
import {  pointToLineDistance as turfPointToLineDistance, 
          lineSlice as turfLineSlice, 
          length as turfLength } from '@turf/turf'
import { findFeature } from './findfeature.js';
import { getNetwork, getEdgeIndex } from './graph.js';

function getStartEndFeature(edges, source, target) {
  for (let i = edges.features.length - 1; i >= 0 && i > edges.features.length - 5; i--) {
    const feature = edges.features[i];
    if (feature.properties.source == source && feature.properties.target == target) {
      return feature;
    }
  }
}

// returns a GeoJSON featureCollection with the route segments
// example: const routefeature = await calculateRoute([{node:'NLJ1562', cost: 0}], 'NLJ1281', map);
async function calculateRouteBetweenNodes(graph, networkArea, networkType, edges, sourceNodes, targetNodes, modeCosts) {
  const { costs, previous } = dijkstra(graph, sourceNodes, targetNodes[0].node, modeCosts);
  const targetNodeIndex = targetNodes[0].node === 'end' ? graph.lastEndId : graph.idArray.indexOf(targetNodes[0].node.toString());
  const path = findPath(graph, previous, targetNodeIndex);
  const edgeIndex = getEdgeIndex(networkArea, networkType, edges);
  const features = [];
  for (let i = 0; i < path.length - 1; i++) {
    const source = path[i].nodeId;
    const target = path[i + 1].nodeId;
    let feature;
    if (source === 'start' || target === 'end') {
      feature = getStartEndFeature(edges, source, target);
      if (feature) {
        feature.properties = {...feature.properties};
        feature.properties.sourceIndex = path[i].nodeIndex;
        feature.properties.targetIndex = path[i + 1].nodeIndex;
        features.push(feature);
      } else {
        const feature = getStartEndFeature(edges, target, source);
        if (feature) {
          feature.properties = {...feature.properties};
          feature.properties.sourceIndex = path[i + 1].nodeIndex;
          feature.properties.targetIndex = path[i].nodeIndex;
          features.push(feature);
        }
      }
    } else if (edgeIndex[source]?.[target]) {
      feature = edgeIndex[source][target];
      feature.properties = {...feature.properties};
      feature.properties.sourceIndex = path[i].nodeIndex;
      feature.properties.targetIndex = path[i + 1].nodeIndex;
      features.push(feature);
    } else if (edgeIndex[target]?.[source]) {
      feature = edgeIndex[target][source];
      feature.properties = {...feature.properties};
      feature.properties.sourceIndex = path[i + 1].nodeIndex;
      feature.properties.targetIndex = path[i].nodeIndex;
      features.push(feature);
    }
  }
  const geojsonResult = {
    "type": "FeatureCollection",
    "features": features
  }
  return geojsonResult;
}

function getModeFromFeature(feature, modes) {
  return 'c';
  /* const type = feature.properties.type;
  for (const mode of modes) {
    for (const tags in networkTypes[mode].tags) {
      for (const value in networkTypes[mode].tags[tags].values) {
        if (value === type) {
          return mode;
        }
      }
    }
  }
  return 'unknown';*/
}

function addTotlalLengthAndCost(routefeature, graph, mode, modeCosts) {
  if (routefeature.features.length === 0) {
    return;
  }
  const totalLengthAndCostStart = performance.now();
  const modes = mode.split('-');
  //const prefixes = modes.map(mode => networkTypes[mode].idprefix);
  const prefixes = ['c'];
  
  let sourceId = routefeature.features[0].properties.source;
  let sourceIndex = routefeature.features[0].properties.sourceIndex;
  let targetIndex = routefeature.features[0].properties.targetIndex;
  let targetId = routefeature.features[0].properties.target;
  let nextSourceId = routefeature.features[1]?.properties.source;
  let nextTargetId = routefeature.features[1]?.properties.target;
  let to = (sourceId === nextSourceId || sourceId === nextTargetId) ? sourceId : targetId;
  let toIndex = (sourceId === nextSourceId || sourceId === nextTargetId) ? sourceIndex : targetIndex;
  let from = (sourceId === to) ? targetId : sourceId;
  let fromIndex = (sourceId === to) ? targetIndex : sourceIndex;
  //fromIndex = graph.idArray.indexOf(from);
  //toIndex = graph.idArray.indexOf(to);
  let routeLength = 0;
  let routeCost = 0;
  let routeTime = 0; // to be implemented

  
  for (let i = 0; i < routefeature.features.length; i++) {
    const feature = routefeature.features[i];
    feature.properties.routeFrom = from;
    feature.properties.routeTo = to;
    let modeprefix = from[0];
    if (modeprefix === to[0]) {
      // both nodes are of the same type
      const routeMode = modes[prefixes.indexOf(modeprefix)];
      if (routeMode) {
        feature.properties.routeMode = routeMode;
      }
    } else {
      // different types of nodes, start, end, transshipment
      feature.properties.routeMode = getModeFromFeature(feature, modes);
    }
    routeLength += feature.properties.length;
    feature.properties.routeLength = routeLength;
    const cost = getCost(graph, fromIndex, toIndex, modeCosts);
    routeCost += cost;
    feature.properties.routeCost = routeCost;
    from = to;
    fromIndex = toIndex;
    const nextFeature = routefeature.features[i + 1];
    to = (nextFeature?.properties.source === from ? nextFeature?.properties.target : nextFeature?.properties.source);
    toIndex = (nextFeature?.properties.source === from ? nextFeature?.properties.targetIndex : nextFeature?.properties.sourceIndex);
  } 
  console.log('total length and cost', performance.now() - totalLengthAndCostStart);
}

function removeVirtualNodes(network, startFeature, endFeature) {
  const graph = network.graph;
  const startSource = graph.idArray.indexOf(startFeature.properties.source.toString());
  const startTarget = graph.idArray.indexOf(startFeature.properties.target.toString());
  const endSource = graph.idArray.indexOf(endFeature.properties.source.toString());
  const endTarget = graph.idArray.indexOf(endFeature.properties.target.toString());
  delete graph.graphArray[graph.lastStartId];
  delete graph.graphArray[graph.lastEndId];
  delete graph.graphArray[startSource]?.[graph.lastStartId];
  delete graph.graphArray[startTarget]?.[graph.lastStartId];
  delete graph.graphArray[endSource]?.[graph.lastEndId];  
  delete graph.graphArray[endTarget]?.[graph.lastEndId];
  // pop virtual segments from edge features array
  const ids = [
    `${startFeature.properties.source}-to-start`, 
    `start-to-${startFeature.properties.target}`, 
    `${endFeature.properties.source}-to-end`, 
    `end-to-${endFeature.properties.target}`];
  while (network.edges.features.length > 0) {
    const lastfeature = network.edges.features.length - 1;
    if (ids.includes(network.edges.features[lastfeature].properties.id)) {
      network.edges.features.pop();
    } else {
      break;
    }
  }
}

function addVirtualNode(name, network, feature, point) {
  const graph = network.graph;
  let virtualNodeIndex = -1;
  if (name === 'start') {
    virtualNodeIndex = graph.lastStartId;
  } else if (name === 'end') {
    virtualNodeIndex = graph.lastEndId;
  } else {
    virtualNodeIndex = graph.idArray.indexOf(name.toString());
  }
  const source = graph.idArray.indexOf(feature.properties.source.toString());
  const target = graph.idArray.indexOf(feature.properties.target.toString());
  const sourcePoint = feature.geometry.coordinates[0];
  const targetPoint = feature.geometry.coordinates[feature.geometry.coordinates.length - 1];
  const sourceToPoint = turfLineSlice(sourcePoint, point, feature);
  const pointToTarget = turfLineSlice(point, targetPoint, feature);
  const sourceToPointLength = turfLength(sourceToPoint, {units: 'meters'});
  const pointToTargetLength = turfLength(pointToTarget, {units: 'meters'});
  const sourceTargetCost = graph.graphArray[source]?.[target];
  const sourceToPointCost = sourceTargetCost === null ? null : sourceTargetCost * sourceToPointLength / feature.properties.length;
  const pointToTargetCost = sourceTargetCost === null ? null : sourceTargetCost * pointToTargetLength / feature.properties.length;
  const targetSourceCost = graph.graphArray[target]?.[source] === null ? null : graph.graphArray[target]?.[source];
  const pointToSourceCost = targetSourceCost === null ? null : targetSourceCost * sourceToPointLength / feature.properties.length;
  const targetToPointCost = targetSourceCost === null ? null : targetSourceCost * pointToTargetLength / feature.properties.length;
  graph.graphArray[source] = graph.graphArray[source] || {};
  graph.graphArray[source][virtualNodeIndex] = sourceToPointCost;
  graph.graphArray[virtualNodeIndex] = {};
  graph.graphArray[virtualNodeIndex][target] = pointToTargetCost;
  graph.graphArray[virtualNodeIndex][source] = pointToSourceCost;
  graph.graphArray[target] = graph.graphArray[target] || {};
  graph.graphArray[target][virtualNodeIndex] = targetToPointCost;
  sourceToPoint.properties = {...feature.properties};
  sourceToPoint.properties.id = `${feature.properties.source}-to-${name}`;
  sourceToPoint.properties.target = name;
  sourceToPoint.properties.length = sourceToPointLength;
  pointToTarget.properties = {...feature.properties};
  pointToTarget.properties.id = `${name}-to-${feature.properties.target}`;
  pointToTarget.properties.source = name;
  pointToTarget.properties.length = pointToTargetLength;
  network.edges.features.push(sourceToPoint);
  network.edges.features.push(pointToTarget);
}


function addVirtualNodes(network, startFeature, startPoint, endFeature, endPoint) {
  addVirtualNode('start', network, startFeature, startPoint);
  if (startFeature === endFeature) {
    // start and end feature are on the same segment
    const sourceToStartPoint = network.edges.features[network.edges.features.length - 2]; // feature source => 'start'
    const startPointToEnd = network.edges.features[network.edges.features.length - 1]; // feature 'start' => target
    if (turfPointToLineDistance(endPoint, sourceToStartPoint) < turfPointToLineDistance(endPoint, startPointToEnd)) {
      endFeature = sourceToStartPoint; // 'end' between source and 'start'
    } else {
      endFeature = startPointToEnd; // 'end' between 'start' and target
    }
  }
  addVirtualNode('end', network, endFeature, endPoint);
  return endFeature;
}

export async function calculateRoute(networkArea, mode, startPoint, endPoint, maxDistance = 50, modeCosts = null) {
  let message = '';
  try {
    const network = await getNetwork(networkArea, mode);
    if (network) {
      const startFeature = findFeature(network.edges, startPoint);
      // check if start and end points are on a line (within 10 meters of the line)
      const startDistance = startFeature ? turfPointToLineDistance(startPoint, startFeature, {units: 'meters'}) : Infinity;
      if (startDistance < maxDistance) {
        const endFeature = findFeature(network.edges, endPoint);
        const endDistance = endFeature ? turfPointToLineDistance(endPoint, endFeature) : Infinity;
        if (endDistance < maxDistance) {
          const lastFeature = addVirtualNodes(network, startFeature, startPoint, endFeature, endPoint);
          const routefeature = await calculateRouteBetweenNodes(network.graph, networkArea, mode, network.edges, [{node:'start', cost: 0}], [{node:'end', cost: 0}], modeCosts);
          addTotlalLengthAndCost(routefeature, network.graph, mode, modeCosts);
          removeVirtualNodes(network, startFeature, lastFeature);
          if (routefeature.features.length === 0) {
            routefeature.message = `No route found between ${startPoint} and ${endPoint}`;
          }
          return routefeature;
        } else {
          message = `end point not near a line in ${networkArea}`;
        }
      } else {
        message = `start point not near a line in ${networkArea}`;
      }
    } else {
      message = `Network ${networkArea} ${mode} not found`;
    }
  } catch (error) {
    message = `CalculateRoute unexpected error: ${error.message}`;
  }
  return {
    "type": "FeatureCollection",
    "features": [],
    "message": message
  };
}


//await calculateRoute('noord-holland', 'smallboat', [4.91148, 52.37985], [4.92256, 52.38116]);