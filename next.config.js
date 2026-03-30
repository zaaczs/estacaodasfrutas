/** @type {import('next').NextConfig} */
const nextConfig = {
  // Em dev, cache em disco do Webpack quebra com frequência em pastas OneDrive (ENOENT *.pack.gz).
  webpack: (config, { dev }) => {
    if (dev) {
      // Evita escrita de cache em disco no OneDrive sem quebrar geração dos chunks em dev.
      config.cache = { type: "memory" };
    }
    return config;
  },
};

module.exports = nextConfig;
