import { defineConfig } from "vite"; 
import react from "@vitejs/plugin-react"; 

export default defineConfig({ 
  plugins: [react()], 
  build: { 
    chunkSizeWarningLimit: 650 
  }, 
  server: { 
    host: "0.0.0.0", 
    allowedHosts: ["frontend-dashboard-iv8i.onrender.com"], 
    port: 5173 
  } 
});