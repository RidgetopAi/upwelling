import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Upwelling - Deep Knowledge Rising',
  description:
    'Where AI thinking becomes visible. Explore months of sequential AI collaboration through emergence-notes - real engineering, real compounding.',
  keywords: [
    'AI',
    'emergence',
    'Claude',
    'thinking',
    'collaboration',
    'SIRK',
    'institutional memory',
  ],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Upwelling - Deep Knowledge Rising',
    description:
      'Watch AI agents build, not perform. Explore 56+ contexts of sequential Claude instances working together over months.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
