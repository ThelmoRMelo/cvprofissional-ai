import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  const scrollToPlans = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="section-hero min-h-[90vh] flex items-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
            Currículo profissional em minutos
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 leading-tight animate-fade-in">
            Crie seu currículo{' '}
            <span className="text-accent">profissional</span>{' '}
            em minutos
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            Construa um currículo impressionante com nossa ferramenta simples e intuitiva. 
            Preencha seus dados, escolha um modelo e baixe após a confirmação do pagamento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '200ms' }}>
            <button
              onClick={scrollToPlans}
              className="btn-hero inline-flex items-center justify-center gap-2 group"
            >
              Ver planos
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-primary-foreground/60 text-sm animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold text-2xl">500+</span>
              <span>Currículos criados</span>
            </div>
            <div className="w-px h-8 bg-primary-foreground/20" />
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold text-2xl">98%</span>
              <span>Satisfação</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
