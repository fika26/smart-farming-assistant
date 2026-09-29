import type { Metadata, Viewport } from 'next';

import { AuthProvider } from '@/components/AuthProvider';
import { RootShell } from '@/components/RootShell';
// Indic scripts are self-hosted with unicode-range subsets: a browser only
// downloads the Telugu/Devanagari files when that script is actually on screen,
// and budget phones without a good system Indic font still render correctly.
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-telugu/400.css';
import '@fontsource/noto-sans-telugu/600.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Smart Farming Assistant',
    template: '%s · Smart Farming Assistant',
  },
  description:
    'Field-deployable agricultural intelligence and early-warning system for Indian farms.',
};

export const viewport: Viewport = {
  themeColor: '#23452F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RootShell>{children}</RootShell>
        </AuthProvider>
      </body>
    </html>
  );
}
