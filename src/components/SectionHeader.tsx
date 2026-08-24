type SectionHeaderProps = {
  id: string
  title: string
  description: string
}

export function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <header className="app-divider mb-7 border-b pb-5">
      <h2 id={id} className="app-text text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="app-muted mt-2 max-w-3xl text-base leading-relaxed sm:text-lg">{description}</p>
    </header>
  )
}
