import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_PROJECT_NAME,
    short_name: process.env.NEXT_PUBLIC_PROJECT_NAME,
    description: 'A platform to connect blood donors with those in need.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e11d48', // rose-600
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

