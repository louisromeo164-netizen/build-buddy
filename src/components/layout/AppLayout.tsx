import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {title && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 h-14 flex items-center">
            <h1 className="font-semibold text-lg">{title}</h1>
          </div>
        </header>
      )}
      <main className="container mx-auto px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
