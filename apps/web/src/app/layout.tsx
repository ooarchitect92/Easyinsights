import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Easyinsights Marketing OS', template: '%s · Easyinsights' },
  description: 'AI-native marketing intelligence, attribution and activation operating system.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
