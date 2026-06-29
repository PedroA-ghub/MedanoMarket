import type { ReactNode } from 'react';
import NavBar from './NavBar';

interface LayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  showFullNav?: boolean;
}

export default function Layout({ children, showSearch = false, showFullNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar showSearch={showSearch} showFullNav={showFullNav} />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">vY</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                MedanoMarket
              </span>
            </div>
            <p className="text-zinc-500 text-sm">
              &copy; {new Date().getFullYear()} MedanoMarket. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
