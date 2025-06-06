export class MinHeap {
  constructor() {
      this.heap = [];
  }

  getParentIndex(i) { return Math.floor((i - 1) / 2); }
  getLeftChildIndex(i) { return 2 * i + 1; }
  getRightChildIndex(i) { return 2 * i + 2; }
  hasParent(i) { return this.getParentIndex(i) >= 0; }
  hasLeftChild(i) { return this.getLeftChildIndex(i) < this.heap.length; }
  hasRightChild(i) { return this.getRightChildIndex(i) < this.heap.length; }

  swap(i, j) {
      [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  insert(numericKey, value) {
      this.heap.push({ numericKey, value });
      this.heapifyUp();
  }

  heapifyUp() {
      let index = this.heap.length - 1;
      while (this.hasParent(index) && this.heap[this.getParentIndex(index)].numericKey > this.heap[index].numericKey) {
          this.swap(this.getParentIndex(index), index);
          index = this.getParentIndex(index);
      }
  }

  extractMin() {
      if (this.heap.length === 0) return null;
      if (this.heap.length === 1) return this.heap.pop();
      
      const min = this.heap[0];
      this.heap[0] = this.heap.pop(); // Move the last element to the top
      this.heapifyDown();
      return min;
  }

  heapifyDown() {
      let index = 0;
      while (this.hasLeftChild(index)) {
          let smallerChildIndex = this.getLeftChildIndex(index);
          if (this.hasRightChild(index) && this.heap[this.getRightChildIndex(index)].numericKey < this.heap[smallerChildIndex].numericKey) {
              smallerChildIndex = this.getRightChildIndex(index);
          }

          if (this.heap[index].numericKey <= this.heap[smallerChildIndex].numericKey) {
              break;
          } else {
              this.swap(index, smallerChildIndex);
          }
          index = smallerChildIndex;
      }
  }

  peek() {
      if (this.heap.length === 0) return null;
      return this.heap[0];
  }

  isEmpty() {
      return this.heap.length === 0;
  }
}

/*
// Example usage:
const heap = new MinHeap();
for (let i = 0; i < 10000; i++) {
  const key = Math.floor(Math.random() * 1000000);
  const value = Math.floor(Math.random() * 1000000);
  heap.insert(key, {name: `Item ${value}`});
}
console.log("Min:", heap.extractMin()); 
console.log("Next Min:", heap.peek());
while (!heap.isEmpty()) {
  const i = heap.extractMin();
  console.log(i);
}
console.log('done');
*/