import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter({}), react()],
	server: {
    allowedHosts: [
      "1ccf4894dcc5.ngrok-free.app" // 👈 add your ngrok domain here
    ]
  },
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
