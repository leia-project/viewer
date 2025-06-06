import { MinHeap } from './minheap.js';
import { getCost } from './dijkstra.js';
import { getNetwork, getEdgeIndex} from './graph.js';
import { findFeature } from './findfeature.js';
import {  pointToLineDistance as turfPointToLineDistance, 
  distance as turfDistance } from '@turf/turf'

/**
 * Find all nodes within a given distance from a starting point
 * @param {Object} graphArray - The graph representation
 * @param {Array} sourceNodes - Array of starting nodes with their initial cost [{node: 'nodeId', cost: 0}]
 * @param {number} maxDistance - Maximum distance to search
 * @param {Object} modeCosts - Optional cost modifiers for different transportation modes
 * @returns {Object} - Object with node IDs as keys and their distances as values
 */
export function findNodesInRange(graphArray, sourceNodes, maxDistance, modeCosts = null) {
  // Initialize structures
  const costs = new Float32Array(graphArray.graphArray.length).fill(Infinity);
  const visited = new Int8Array(graphArray.graphArray.length).fill(0); // false
  const minHeap = new MinHeap();
  const nodesInRange = {nodeIds:[], nodeCosts:[]}; // Will store nodeId: distance pairs for result

  // Set the source costs and insert them in the heap
  for (const { node, cost } of sourceNodes) {
    let nodeIndex;
    if (node === 'start') {
      nodeIndex = graphArray.lastStartId;
    } else {
      nodeIndex = graphArray.idArray.findIndex((element) => element == node);
    }
    
    if (nodeIndex === -1) {
      console.error(`Node ${node} not found in graph`);
      continue;
    }
    
    costs[nodeIndex] = cost;
    minHeap.insert(cost, nodeIndex);
  }

  // Standard Dijkstra algorithm with maxDistance as termination condition
  while (!minHeap.isEmpty()) {
    const { numericKey: currentCost, value: currentNodeIndex } = minHeap.extractMin();
    
    // Skip if we've already processed this node
    if (visited[currentNodeIndex]) {
      continue;
    }
    
    // Mark as visited
    visited[currentNodeIndex] = 1; // true
    
    // If current cost exceeds maxDistance, we can stop exploring from this node
    if (currentCost > maxDistance) {
      continue;
    }
    
    // Add to result
    const nodeId = graphArray.idArray[currentNodeIndex];
    nodesInRange.nodeIds.push(nodeId)
    nodesInRange.nodeCosts.push(currentCost);
    
    // Explore neighbors
    for (let neighbor in graphArray.graphArray[currentNodeIndex]) {
      neighbor = parseInt(neighbor);
      if (visited[neighbor]) {
        continue;
      }
      
      const edgeCost = getCost(graphArray, currentNodeIndex, neighbor, modeCosts);
      if (edgeCost === Infinity) {
        continue;
      }
      
      const newCost = currentCost + edgeCost;
      
      // Only consider paths that stay within the maximum distance
      if (newCost <= maxDistance) {
        if (newCost < costs[neighbor]) {
          costs[neighbor] = newCost;
          minHeap.insert(newCost, neighbor);
        }
      }
    }
  }
  return nodesInRange;
}

/**
 * Find all nodes and paths within a given distance from a starting point
 * @param {Object} graphArray - The graph representation
 * @param {Array} sourceNodes - Array of starting nodes with their initial cost [{node: 'nodeId', cost: 0}]
 * @param {number} maxDistance - Maximum distance to search
 * @param {Object} modeCosts - Optional cost modifiers for different transportation modes
 * @returns {Object} - Object with nodes, costs, and previous nodes for path reconstruction
 */
export function findNodesAndPathsInRange(graphArray, sourceNodes, maxDistance, modeCosts = null) {
  // Initialize structures
  const costs = new Float32Array(graphArray.graphArray.length).fill(Infinity);
  const previous = new Float32Array(graphArray.graphArray.length).fill(undefined);
  const visited = new Int8Array(graphArray.graphArray.length).fill(0); // false
  const minHeap = new MinHeap();
  
  // Set the source costs and insert them in the heap
  for (const { node, cost } of sourceNodes) {
    let nodeIndex;
    if (node === 'start') {
      nodeIndex = graphArray.lastStartId;
    } else {
      nodeIndex = graphArray.idArray.findIndex((element) => element === node);
    }
    
    if (nodeIndex === -1) {
      console.error(`Node ${node} not found in graph`);
      continue;
    }
    
    costs[nodeIndex] = cost;
    minHeap.insert(cost, nodeIndex);
  }

  // Standard Dijkstra algorithm with maxDistance as termination condition
  while (!minHeap.isEmpty()) {
    const { numericKey: currentCost, value: currentNodeIndex } = minHeap.extractMin();
    
    // Skip if we've already processed this node
    if (visited[currentNodeIndex]) {
      continue;
    }
    
    // Mark as visited
    visited[currentNodeIndex] = 1; // true
    
    // If current cost exceeds maxDistance, we can stop exploring from this node
    if (currentCost > maxDistance) {
      continue;
    }
    
    // Explore neighbors
    for (let neighbor in graphArray.graphArray[currentNodeIndex]) {
      neighbor = parseInt(neighbor);
      if (visited[neighbor]) {
        continue;
      }
      
      const edgeCost = getCost(graphArray, currentNodeIndex, neighbor, modeCosts);
      if (edgeCost === Infinity) {
        continue;
      }
      
      const newCost = currentCost + edgeCost;
      
      // Only consider paths that stay within the maximum distance
      if (newCost <= maxDistance) {
        if (newCost < costs[neighbor]) {
          costs[neighbor] = newCost;
          previous[neighbor] = currentNodeIndex;
          minHeap.insert(newCost, neighbor);
        }
      }
    }
  }

  // Collect results
  const nodesInRange = {};
  for (let i = 0; i < costs.length; i++) {
    if (costs[i] <= maxDistance && costs[i] !== Infinity) {
      nodesInRange[graphArray.idArray[i]] = {
        distance: costs[i],
        nodeIndex: i
      };
    }
  }

  return {
    nodes: nodesInRange,
    costs: costs,
    previous: previous
  };
}

/**
 * Get the path from a source node to a destination node
 * @param {Object} graphArray - The graph representation
 * @param {Array} previous - Array of previous nodes from Dijkstra algorithm
 * @param {number} dest - Destination node index
 * @returns {Array} - Array of node objects with nodeIndex and nodeId
 */
export function getPathTo(graphArray, previous, dest) {
  let path = [];
  let step = dest;
  
  // Check if a path exists
  if (previous[step] === undefined) {
    return path; // No path exists, return empty path
  }
  
  // Follow the previous nodes until the source
  while (step !== undefined) {
    path.push({
      nodeIndex: step,
      nodeId: graphArray.idArray[step]
    });
    step = previous[step];
  }
  
  // Reverse the path to get it from source to destination
  path.reverse();
  
  return path;
}

export async function getEdgesInRange(region, mode, point, maxDistance) {
  const result = {
    type: 'FeatureCollection',
    features: []
  }
  const network = await getNetwork(region, mode);
  if (network) {
    const centerFeature = findFeature(network.edges, point);
    // check if center feature is near a line (within 200 meters of the line)
    const centerDistance = centerFeature ? turfPointToLineDistance(point, centerFeature, {units: 'meters'}) : Infinity;
    if (centerDistance < 200) {
      const sourceDistance = turfDistance(point, centerFeature.geometry.coordinates[0], {units: 'meters'});
      const targetDistance = turfDistance(point, centerFeature.geometry.coordinates[centerFeature.geometry.coordinates.length - 1], {units: 'meters'});
      let centerNode = centerFeature.properties.source;
      if (sourceDistance > targetDistance) {
        centerNode = centerFeature.properties.target;
      }
      const nodes = findNodesInRange(network.graph, [{node: centerNode, cost: 0}], maxDistance);
      const edgeIndex = getEdgeIndex(region, mode, network.edges);
      const nodeSet = new Set(nodes.nodeIds);
      const edgeSet = new Set();
      for (let i = 0; i < nodes.nodeIds.length; i++) {
        const nodeId = nodes.nodeIds[i];
        if (edgeIndex[nodeId]) {
          for (const otherNode in edgeIndex[nodeId]) {
            if (nodeSet.has(otherNode)) {
              const feature = JSON.parse(JSON.stringify(edgeIndex[nodeId][otherNode]));
              const edgeId = feature.properties.source + '-' + feature.properties.target;
              if (!edgeSet.has(edgeId)) {
                const j = nodes.nodeIds.indexOf(otherNode);
                if (feature.properties.source == nodeId) {
                  feature.properties.sourceDistance = nodes.nodeCosts[i];
                  feature.properties.targetDistance = nodes.nodeCosts[j];
                }
                else {
                  feature.properties.sourceDistance = nodes.nodeCosts[j];
                  feature.properties.targetDistance = nodes.nodeCosts[i];
                }
                result.features.push(feature);
                edgeSet.add(edgeId);
              }
            }
          }
        }
      }
      return result;
    }
  } else {
    result.message = 'Network not found';
  }
  return result;
}