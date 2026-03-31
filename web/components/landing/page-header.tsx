interface PageHeaderProps {
  badge?: string
  title: string
  highlight?: string
  description: string
}

export function PageHeader({ badge, title, highlight, description }: PageHeaderProps): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-[var(--landing-bg)] pb-16 pt-32 md:pb-24 md:pt-40">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute -left-[10%] -top-[10%] h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ backgroundColor: 'rgba(204, 251, 241, 0.4)' }}
        />
        <div
          className="absolute -right-[10%] bottom-0 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ backgroundColor: 'rgba(219, 234, 254, 0.4)' }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          {badge && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--landing-primary-light)] bg-[var(--landing-primary-lighter)] px-4 py-1.5">
              <span className="text-sm font-semibold text-[var(--landing-primary-hover)]">{badge}</span>
            </div>
          )}

          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-[var(--landing-text-primary)] md:text-5xl lg:text-6xl">
            {title}{' '}
            {highlight && <span className="text-4xl md:text-5xl lg:text-6xl text-[var(--landing-primary)]">{highlight}</span>}
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--landing-text-secondary)] md:text-xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}
