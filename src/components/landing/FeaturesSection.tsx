import { FileText, Sparkles, Shield, Clock } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Currículo Profissional',
    description: 'Modelos modernos e elegantes que impressionam recrutadores',
  },
  {
    icon: Sparkles,
    title: 'Fácil de Criar',
    description: 'Interface simples e intuitiva para criar seu currículo em minutos',
  },
  {
    icon: Shield,
    title: 'Dados Seguros',
    description: 'Suas informações são protegidas e nunca compartilhadas',
  },
  {
    icon: Clock,
    title: 'Liberação Rápida',
    description: 'Após confirmação do pagamento, download liberado instantaneamente',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
          Por que escolher nossa plataforma?
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Criamos uma experiência simples e eficiente para você ter o currículo dos seus sonhos
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-card p-6 rounded-2xl shadow-soft border border-border hover:shadow-card transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
