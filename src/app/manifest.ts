import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HMSdemo Hospital Management System',
    short_name: 'HMSdemo',
    description: 'Secure hospital operations and patient portal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    categories: ['medical', 'health', 'business'],
  };
}
