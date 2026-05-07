/** @type {import("next").NextConfig} */
const nextConfig = {
  // Temporary for diagnostics: disable React StrictMode double-invocation in dev.
  reactStrictMode: false,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;