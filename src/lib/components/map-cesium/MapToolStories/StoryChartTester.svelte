<script lang="ts">
    import StoryChart from './StoryChart.svelte';
    import { writable } from 'svelte/store';
    
    // Create test datasets
    let testCases = [
        {
            name: "Valid Data",
            data: [
                { group: "A", value: 20 },
                { group: "B", value: 15 },
                { group: "C", value: 30 },
                { group: "D", value: 25 },
                { group: "E", value: 10 }
            ]
        },
        {
            name: "All Zeros",
            data: [
                { group: "A", value: 0 },
                { group: "B", value: 0 },
                { group: "C", value: 0 },
                { group: "D", value: 0 },
                { group: "E", value: 0 }
            ]
        },
        {
            name: "Empty Array",
            data: []
        },
        {
            name: "Undefined",
            data: undefined
        }
    ];
    
    let selectedTestCase = testCases[0];
    let loading = false;
</script>

<div class="test-container">
    <h2>StoryChart Test Harness</h2>
    
    <div class="controls">
        <label>
            Select test case:
            <select bind:value={selectedTestCase}>
                {#each testCases as testCase}
                    <option value={testCase}>{testCase.name}</option>
                {/each}
            </select>
        </label>
        
        <label>
            <input type="checkbox" bind:checked={loading} />
            Simulate loading
        </label>
    </div>
    
    <div class="chart-container">
        <h3>Chart Preview: {selectedTestCase.name}</h3>
        <StoryChart data={selectedTestCase.data} {loading} />
    </div>
    
    <div class="data-preview">
        <h3>Current Test Data:</h3>
        <pre>{JSON.stringify(selectedTestCase.data, null, 2)}</pre>
    </div>
</div>

<style>
    .test-container {
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
    }
    
    .controls {
        margin: 20px 0;
        display: flex;
        gap: 20px;
    }
    
    .chart-container {
        margin: 20px 0;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
    
    .data-preview {
        margin-top: 20px;
    }
    
    pre {
        background: #f5f5f5;
        padding: 10px;
        border-radius: 4px;
        overflow: auto;
    }
</style>