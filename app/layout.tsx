import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zero Prompt Site Builder — build websites without writing a single prompt',
  description:
    'Upload a resume, pitch deck, or business document and six AI agents plan, design, write, and build a unique, responsive, SEO-ready website. No prompts, no templates.',
  openGraph: {
    title: 'Zero Prompt Site Builder',
    description: 'One upload. One click. One unique website.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07090c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
