// app/layout.tsx
import './globals.css'; // optional
import { ReactNode } from 'react';

export const metadata = {
  title: 'Safe City App',
  description: 'Map-based safety evaluation using NASA, FBI, Google, and OpenAI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
