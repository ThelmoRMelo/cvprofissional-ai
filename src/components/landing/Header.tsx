import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-display font-bold text-xl">CurrículoPro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#planos" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm font-medium">
            Planos
          </a>
          <Link
            to="/admin"
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm font-medium"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
