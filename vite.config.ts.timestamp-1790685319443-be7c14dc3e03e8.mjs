// vite.config.ts
import { defineConfig, loadEnv } from "file:///c:/Users/Witte.Verheul/Documents/viewer/node_modules/vite/dist/node/index.js";
import { sveltekit } from "file:///c:/Users/Witte.Verheul/Documents/viewer/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { viteStaticCopy } from "file:///c:/Users/Witte.Verheul/Documents/viewer/node_modules/vite-plugin-static-copy/dist/index.js";
var cesiumSource = "node_modules/cesium/Build/Cesium";
var vite_config_default = defineConfig(
  ({ command, mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
    const cesiumBaseUrl = `${process.env.APP_URL}/Cesium`;
    return {
      define: {
        // This is the base url for static files that CesiumJS needs to load.
        // Set to an empty string to place the files at the site's root path
        CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
        "process.env": process.env
      },
      plugins: [
        sveltekit(),
        // Copy Cesium Assets, Widgets, and Workers to a static directory.
        // If you need to add your own static files to your project, use the `public` directory
        // and other options listed here: https://vitejs.dev/guide/assets.html#the-public-directory
        viteStaticCopy({
          targets: [
            { src: `${cesiumSource}/ThirdParty`, dest: "Cesium" },
            { src: `${cesiumSource}/Workers`, dest: "Cesium" },
            { src: `${cesiumSource}/Assets`, dest: "Cesium" },
            { src: `${cesiumSource}/Widgets`, dest: "Cesium" }
          ]
        })
      ]
    };
  }
);
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJjOlxcXFxVc2Vyc1xcXFxXaXR0ZS5WZXJoZXVsXFxcXERvY3VtZW50c1xcXFx2aWV3ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcImM6XFxcXFVzZXJzXFxcXFdpdHRlLlZlcmhldWxcXFxcRG9jdW1lbnRzXFxcXHZpZXdlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vYzovVXNlcnMvV2l0dGUuVmVyaGV1bC9Eb2N1bWVudHMvdmlld2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcclxuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tIFwidml0ZS1wbHVnaW4tc3RhdGljLWNvcHlcIjtcclxuXHJcbmNvbnN0IGNlc2l1bVNvdXJjZSA9IFwibm9kZV9tb2R1bGVzL2Nlc2l1bS9CdWlsZC9DZXNpdW1cIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kLCBtb2RlIH0pID0+IHtcclxuICAvLyBMb2FkIGVudiBmaWxlIGJhc2VkIG9uIGBtb2RlYCBpbiB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBhbmQgYXBwZW5kIHRvIHByb2Nlc3MuZW52XHJcbiAgLy8gU2V0IHRoZSB0aGlyZCBwYXJhbWV0ZXIgdG8gJycgdG8gbG9hZCBhbGwgZW52IHJlZ2FyZGxlc3Mgb2YgdGhlIGBWSVRFX2AgcHJlZml4LlxyXG4gIHByb2Nlc3MuZW52ID0gey4uLnByb2Nlc3MuZW52LCAuLi5sb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKX07XHJcbiAgY29uc3QgY2VzaXVtQmFzZVVybCA9IGAke3Byb2Nlc3MuZW52LkFQUF9VUkx9L0Nlc2l1bWBcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgICAgZGVmaW5lOiB7XHJcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgYmFzZSB1cmwgZm9yIHN0YXRpYyBmaWxlcyB0aGF0IENlc2l1bUpTIG5lZWRzIHRvIGxvYWQuXHJcbiAgICAgICAgLy8gU2V0IHRvIGFuIGVtcHR5IHN0cmluZyB0byBwbGFjZSB0aGUgZmlsZXMgYXQgdGhlIHNpdGUncyByb290IHBhdGhcclxuICAgICAgICBDRVNJVU1fQkFTRV9VUkw6IEpTT04uc3RyaW5naWZ5KGNlc2l1bUJhc2VVcmwpLFxyXG4gICAgICAgIFwicHJvY2Vzcy5lbnZcIjogcHJvY2Vzcy5lbnZcclxuICAgICAgfSxcclxuICAgICAgcGx1Z2luczogW1xyXG4gICAgICAgIHN2ZWx0ZWtpdCgpLFxyXG4gICAgICAgIC8vIENvcHkgQ2VzaXVtIEFzc2V0cywgV2lkZ2V0cywgYW5kIFdvcmtlcnMgdG8gYSBzdGF0aWMgZGlyZWN0b3J5LlxyXG4gICAgICAgIC8vIElmIHlvdSBuZWVkIHRvIGFkZCB5b3VyIG93biBzdGF0aWMgZmlsZXMgdG8geW91ciBwcm9qZWN0LCB1c2UgdGhlIGBwdWJsaWNgIGRpcmVjdG9yeVxyXG4gICAgICAgIC8vIGFuZCBvdGhlciBvcHRpb25zIGxpc3RlZCBoZXJlOiBodHRwczovL3ZpdGVqcy5kZXYvZ3VpZGUvYXNzZXRzLmh0bWwjdGhlLXB1YmxpYy1kaXJlY3RvcnlcclxuICAgICAgICB2aXRlU3RhdGljQ29weSh7XHJcbiAgICAgICAgICB0YXJnZXRzOiBbXHJcbiAgICAgICAgICAgIHsgc3JjOiBgJHtjZXNpdW1Tb3VyY2V9L1RoaXJkUGFydHlgLCBkZXN0OiAnQ2VzaXVtJyB9LFxyXG4gICAgICAgICAgICB7IHNyYzogYCR7Y2VzaXVtU291cmNlfS9Xb3JrZXJzYCwgZGVzdDogJ0Nlc2l1bScgfSxcclxuICAgICAgICAgICAgeyBzcmM6IGAke2Nlc2l1bVNvdXJjZX0vQXNzZXRzYCwgZGVzdDogJ0Nlc2l1bScgfSxcclxuICAgICAgICAgICAgeyBzcmM6IGAke2Nlc2l1bVNvdXJjZX0vV2lkZ2V0c2AsIGRlc3Q6ICdDZXNpdW0nIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfVxyXG4gIH1cclxuKTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQWlULFNBQVMsY0FBYyxlQUFlO0FBQ3ZWLFNBQVMsaUJBQWlCO0FBQzFCLFNBQVMsc0JBQXNCO0FBRS9CLElBQU0sZUFBZTtBQUdyQixJQUFPLHNCQUFRO0FBQUEsRUFBYSxDQUFDLEVBQUUsU0FBUyxLQUFLLE1BQU07QUFHakQsWUFBUSxNQUFNLEVBQUMsR0FBRyxRQUFRLEtBQUssR0FBRyxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRSxFQUFDO0FBQ2xFLFVBQU0sZ0JBQWdCLEdBQUcsUUFBUSxJQUFJLE9BQU87QUFFNUMsV0FBTztBQUFBLE1BQ0gsUUFBUTtBQUFBO0FBQUE7QUFBQSxRQUdOLGlCQUFpQixLQUFLLFVBQVUsYUFBYTtBQUFBLFFBQzdDLGVBQWUsUUFBUTtBQUFBLE1BQ3pCO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJVixlQUFlO0FBQUEsVUFDYixTQUFTO0FBQUEsWUFDUCxFQUFFLEtBQUssR0FBRyxZQUFZLGVBQWUsTUFBTSxTQUFTO0FBQUEsWUFDcEQsRUFBRSxLQUFLLEdBQUcsWUFBWSxZQUFZLE1BQU0sU0FBUztBQUFBLFlBQ2pELEVBQUUsS0FBSyxHQUFHLFlBQVksV0FBVyxNQUFNLFNBQVM7QUFBQSxZQUNoRCxFQUFFLEtBQUssR0FBRyxZQUFZLFlBQVksTUFBTSxTQUFTO0FBQUEsVUFDbkQ7QUFBQSxRQUNGLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFtdCn0K
