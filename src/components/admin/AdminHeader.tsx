import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, LogOut } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  onLogout?: () => void;
}

export function AdminHeader({ title = 'Painel Admin', onLogout }: AdminHeaderProps) {
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
          {onLogout && <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"><LogOut className="h-4 w-4" /> Sair</button>}
        </div>
      </div>
    </header>
  );
}
