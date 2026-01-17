import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Settings } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
}

export function AdminHeader({ title = 'Painel Admin' }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-primary-foreground/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao site</span>
          </Link>
          <div className="flex items-center gap-2 text-primary-foreground">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-display font-bold">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
