/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async redirects() {
    return [
      // English moved from /en to the root. Permanent, so Google transfers the ranking
      // of the already-indexed /en/* URLs instead of treating them as duplicates.
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
    ]
  },
}
module.exports = nextConfig
