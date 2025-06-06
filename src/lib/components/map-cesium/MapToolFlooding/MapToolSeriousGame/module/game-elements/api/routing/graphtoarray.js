/* large javascript array access is much faster than for large javascript objects
 * therefore we convert the graph object to:
 * {
    idArray, // array of all node ids, ordered by car, boat, transshipment, start and end nodes
    graphArray, // array of objects with linked nodes and costs
    lastCarId, // highest index of cars
    lastBoatId, // highest index of boats
    lastTransshipmentId, // highest index of transshipments
    lastStartId, // highest index of start nodes
    lastEndId, // highest index of end nodes
  }
*/

export function graphObjectToArrays(graph) {
  const idArray = [];
  const graphArray = [];
  const carIds = new Map();
  const boatIds = new Map();
  const transshipmentIds = new Map();
  const startIds = new Map();
  const endIds = new Map();

  let carid = 0;
  let boatid = 0;
  let transshipmentid = 0;
  let startid = 0;
  let endid = 0;

  function collectId(id) {
    switch (id[0]) {
      case 'c':
        if (!carIds.has(id)) {
          carIds.set(id, carid++);
        }
        break;
      case 'b':
        if (!boatIds.has(id)) {
          boatIds.set(id, boatid++);
        }
        break;
      case 't':
        if (!transshipmentIds.has(id)) {
          transshipmentIds.set(id, transshipmentid++);
        }
        break;
      case 's':
        if (!startIds.has(id)) {
          startIds.set(id, startid++);
        }
        break;
      case 'e':
        if (!endIds.has(id)) {
          endIds.set(id, endid++);
        }
        break;
      default:
        if (!carIds.has(id)) {
          carIds.set(id, carid++);
        }
        break;
    }
  }

  // Collect all IDs from the graph
  for (const source in graph) {
    collectId(source);
    for (const target in graph[source]) {
      collectId(target);
    }
  }
  collectId('start');
  collectId('end');

  // Calculate the last indices for each type
  const lastCarId = carIds.size - 1;
  const lastBoatId = lastCarId + boatIds.size;
  const lastTransshipmentId = lastBoatId + transshipmentIds.size;
  const lastStartId = lastTransshipmentId + startIds.size;
  const lastEndId = lastStartId + endIds.size;

  // Adjust indices for combined IDs
  const combinedIds = new Map();
  let offset = 0;

  for (const [id, index] of carIds) {
    combinedIds.set(id, index + offset);
  }
  offset += carIds.size;

  for (const [id, index] of boatIds) {
    combinedIds.set(id, index + offset);
  }
  offset += boatIds.size;

  for (const [id, index] of transshipmentIds) {
    combinedIds.set(id, index + offset);
  }
  offset += transshipmentIds.size;

  for (const [id, index] of startIds) {
    combinedIds.set(id, index + offset);
  }
  offset += startIds.size;

  for (const [id, index] of endIds) {
    combinedIds.set(id, index + offset);
  }

  // Create idArray and graphArray
  for (const [id, index] of combinedIds) {
    idArray[index] = id;
    const convertedLinks = {};
    const links = graph[id]; // link is {id: "someid", cost: 2.6}
    for (const link in links) {
      const linkIndex = combinedIds.get(link);
      convertedLinks[linkIndex] = graph[id][link];
    }
    graphArray[index] = convertedLinks;
  }

  return {
    idArray,
    graphArray,
    lastCarId,
    lastBoatId,
    lastTransshipmentId,
    lastStartId,
    lastEndId
  };
}
/*
// Example usage
const graph = {
  'c1': { 'b1': 100.5, 't1': 110.2 },
  'b1': { 'c1': 100.5, 't1': 20.3 },
  't1': { 'c1': 110.2, 'b1': null },
  's1': { 'e1': 50.0 },
  'e1': { 's1': 50.0 }
};

const result = convertGraphIds(graph);
for (let i = 0; i < result.graphArray.length; i++) {
  console.log(JSON.stringify(result.graphArray[i]));
}
*/