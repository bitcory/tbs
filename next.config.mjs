import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project. A stray /Users/toolb/package-lock.json
  // otherwise makes Next infer the home dir as root, which breaks file tracing and
  // causes recurring "Cannot find module './xxx.js'" chunk errors on recompile.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
