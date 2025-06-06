import { MinHeap } from './minheap.js';

function nodeMode(graphArray, node) {
  let mode = 'c'; // c = car, b = boat, t = transshipment
  if (node >= graphArray.lastCarId) {
    if (node <= graphArray.lastBoatId) {
      mode = 'b';
    } else if (node <= graphArray.lastTransshipmentId) {
      mode = 't';
    } else if (node <= graphArray.lastStartId) {
      mode = 's';
    } else if (node <= graphArray.lastEndId) {
      mode = 'e';
    }
  }
  return mode;
}

export function getCost(graph, node1, node2, modeCosts) {
  const cost = graph.graphArray[node1][node2];
  if (cost === null) {
    // wrong way of one-way road
    return Infinity; 
  }
  if (cost < 0) {
    // negative cost, not allowed
    return Infinity;
  }
  if (!modeCosts) {
    // no mode costs, return the cost as is
    return cost;
  }
  let mode = nodeMode(graph, node2);
  if (mode === 's' || mode === 'e') {
    // start or end
    mode = nodeMode(graph, node1); // set mode to the segment mode
  }
  if (modeCosts[mode]) {
    if (mode === 't') {
      // transshipment
      const segmentmode = nodeMode(graph, node1);
      if (modeCosts[segmentmode]) {
        return cost * modeCosts[segmentmode] + modeCosts[mode];
      }
      return cost + modeCosts[mode];
    } 
    return cost * modeCosts[mode];
  }
  return cost;
}


// Dijkstra's algorithm to find the shortest path in a graph using bidirectional search
// graph: object with nodes and their neighbors and costs
// sources: array of objects with node and cost from source, example: [{node: 'A', cost: 0}]
// target: node to find the path to, stop when this node is reached
// modeCosts: object with cost parameters for different modes of transport
export function dijkstra(graphArray, sources, target, modeCosts) {
  let preparetime = 0;
  let looptime = 0;
  let setuptime = 0;
  let forwardtime = 0;
  let backwardtime = 0;
  let exittime = 0;
  let resulttime = 0;
  let setupHeapTime = 0;
  let checkVisitedTime = 0;
  //console.time('dijkstra');
  const start = performance.now();
  const forwardCosts = new Float32Array(graphArray.graphArray.length).fill(Infinity);
  const backwardCosts = new Float32Array(graphArray.graphArray.length).fill(Infinity);
  const forwardPrevious = new Float32Array(graphArray.graphArray.length).fill(undefined);
  const backwardPrevious = new Float32Array(graphArray.graphArray.length).fill(undefined);
  const forwardMinHeap = new MinHeap();
  const backwardMinHeap = new MinHeap();

  // Set the source costs and reinsert them in the forward heap
  for (const { node, cost } of sources) {
    let nodeIndex;
    if (node === 'start') {
      nodeIndex = graphArray.lastStartId;
    } else {
      nodeIndex = graphArray.idArray.findIndex((element) => element === node);
    } 
    forwardCosts[nodeIndex] = cost;
    forwardMinHeap.insert(cost, nodeIndex);
  }

  // Set the target costs and reinsert them in the backward heap
  let targetIndex;
  if (target === 'end') {
    targetIndex = graphArray.lastEndId;
  } else {
    targetIndex = graphArray.graphIds.findIndex((element) => element === target);
  }
  backwardCosts[targetIndex] = 0;
  backwardMinHeap.insert(0, targetIndex);

  const forwardVisited = new Int8Array(graphArray.graphArray.length).fill(0); // false
  const backwardVisited = new Int8Array(graphArray.graphArray.length).fill(0); // false

  let shortestPathLength = Infinity;
  let meetingNode = null;
  preparetime = performance.now() - start;

  while (!forwardMinHeap.isEmpty() && !backwardMinHeap.isEmpty()) {
    const loopstart = performance.now();
    // Forward search
    const { numericKey: forwardCost, value: forwardNodeIndex } = forwardMinHeap.extractMin();
    const { numericKey: backwardCost, value: backwardNodeIndex } = backwardMinHeap.extractMin();
    setupHeapTime += performance.now() - loopstart;
    const checkVisitedStart = performance.now();
    forwardVisited[forwardNodeIndex] = 1; // true
    backwardVisited[backwardNodeIndex] = 1; // true
    checkVisitedTime += performance.now() - checkVisitedStart;
    setuptime += performance.now() - loopstart;
    
    const forwardstart = performance.now();
    for (let neighbor in graphArray.graphArray[forwardNodeIndex]) {
      neighbor = parseInt(neighbor);
      if (!forwardVisited[neighbor]) {
        const cost = getCost(graphArray, forwardNodeIndex, neighbor, modeCosts);
        if (cost === Infinity) {
          continue;
        }
        const alt = forwardCosts[forwardNodeIndex] + cost;
        const neighborCost = forwardCosts[neighbor] !== undefined ? forwardCosts[neighbor] : Infinity;
        if (alt < neighborCost) {
          forwardCosts[neighbor] = alt;
          forwardPrevious[neighbor] = forwardNodeIndex;
          forwardMinHeap.insert(alt, neighbor);
        }
      }
      if (backwardVisited[neighbor]) {
        const testCost = forwardCosts[forwardNodeIndex]
            + getCost(graphArray, forwardNodeIndex, neighbor, modeCosts)
            + backwardCosts[neighbor];
        if (testCost < shortestPathLength) {
          shortestPathLength = testCost;
          meetingNode = neighbor;
        }        
      }
    }
    forwardtime += performance.now() - forwardstart;

    const backwardstart = performance.now();
    for (let neighbor in graphArray.graphArray[backwardNodeIndex]) {
      neighbor = parseInt(neighbor);
      if (!backwardVisited[neighbor]) {
        const cost = getCost(graphArray, neighbor, backwardNodeIndex, modeCosts);
        if (cost === Infinity) {
          continue;
        }
        const alt = backwardCosts[backwardNodeIndex] + cost;
        const neighborCost = backwardCosts[neighbor] !== undefined ? backwardCosts[neighbor] : Infinity;
        if (alt < neighborCost) {
          backwardCosts[neighbor] = alt;
          backwardPrevious[neighbor] = backwardNodeIndex;
          backwardMinHeap.insert(alt, neighbor);
        }
      }
      if (forwardVisited[neighbor]) {
        const testCost = backwardCosts[backwardNodeIndex] 
            + getCost(graphArray, neighbor, backwardNodeIndex, modeCosts) 
            + forwardCosts[neighbor] 
        if (testCost < shortestPathLength) {
          shortestPathLength = testCost;
          meetingNode = neighbor;
        }
      }
    }
    backwardtime += performance.now() - backwardstart;
    const exitStart = performance.now()
    if (shortestPathLength !== Infinity && forwardCosts[forwardNodeIndex] + backwardCosts[backwardNodeIndex] >= shortestPathLength) {
      break;
    }
    exittime += performance.now() - exitStart;
  }
  looptime = performance.now() - start - preparetime;
  //console.timeEnd('dijkstra');

  if (shortestPathLength === Infinity) {
    return { costs: {}, previous: {} };
  }

  // Combine the paths from forward and backward searches
  if (forwardPrevious[target] === undefined) {
    // the forward search did not reach the target
    // reconstruct the path from the meeting node to the target
    let step = meetingNode;
    while (step && backwardPrevious[step]) {
      forwardPrevious[backwardPrevious[step]] = step;
      forwardCosts[backwardPrevious[step]] = forwardCosts[step] + getCost(graphArray, step, backwardPrevious[step], modeCosts);
      step = backwardPrevious[step];
    }
  }
  resulttime = performance.now() - start;
  /*console.log(`prepare: ${preparetime}`);
  console.log(`loop: ${looptime}`);
  console.log(`setup: ${setuptime}, heap: ${setupHeapTime}, visited: ${checkVisitedTime}`);
  console.log(`forward: ${forwardtime}`);
  console.log(`backward: ${backwardtime}`);
  console.log(`exit: ${exittime}`);
  console.log(`result: ${resulttime}`);*/
  return { costs: forwardCosts, previous: forwardPrevious };
}

export function findPath(graphArray, previous, dest) {
  let path = [];
  let step = dest;
  
  // Check if a path exists
  if (previous[step] === undefined) {
      return path; // No path exists, return empty path
  }
  
  // Follow the previous nodes until the source
  while (step) {
      path.push({nodeIndex: step, nodeId: graphArray.idArray[step]});
      step = previous[step];  // Move to the previous node
  }
  
  // Reverse the path to get it from source to destination
  path.reverse();
  
  return path;
}

/*
// Example usage:
const graph = {
  A: { B: 1, C: 4 },
  B: { A: 1, C: 2, D: 5 },
  C: { A: 4, B: 2, D: 1 },
  D: { B: 5, C: 1 }
};

const { costs, previous } = dijkstra(graph, 'A');
console.log(costs);  // Output the lowest cost from source A
console.log(previous);  // Output the previous node for each node on the path
*/