import type { MetadataRoute } from 'next';

/** Lets members add CAN to their phone's home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CAN — Computer Association Network',
    short_name: 'CAN',
    description: "Gujarat's IT associations, one trusted network",
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F8FA',
    theme_color: '#1C1917',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
