interface PanelProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function Panel({ children, title, subtitle, className = "" }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {subtitle && <p className="panel-subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
