/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For GitHub Pages: use static export
  // For Vercel: use standalone (set via environment variable)
  output: process.env.GITHUB_PAGES === 'true' ? 'export' : 'standalone',
  // Base path for GitHub Pages (if repository is not username.github.io)
  // Set GITHUB_PAGES_BASE_PATH environment variable if needed
  basePath: process.env.GITHUB_PAGES_BASE_PATH || '',
  // Trailing slash for GitHub Pages compatibility
  trailingSlash: process.env.GITHUB_PAGES === 'true',
  // Disable image optimization for static export
  images: {
    unoptimized: process.env.GITHUB_PAGES === 'true',
  },
  // API rewrites for development only (production uses NEXT_PUBLIC_API_URL)
  async rewrites() {
    // Skip rewrites for static export or production
    if (process.env.GITHUB_PAGES === 'true' || process.env.NODE_ENV === 'production') {
      return [];
    }
    // Development: proxy API calls to local backend
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/:path*`
          : 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

