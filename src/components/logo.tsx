type MarkProps = {
  className?: string;
  title?: string;
};

const compassArms = (
  <>
    <path d="M10 32L32 26.4L54 32L32 37.6Z" fill="currentColor" className="text-cream" />
    <path d="M32 54L26.4 32H37.6Z" fill="currentColor" className="text-cream" />
    <path d="M32 8L24.8 32H39.2Z" fill="currentColor" className="text-coral" />
    <circle cx="32" cy="32" r="5" fill="currentColor" className="text-ink" />
    <circle cx="32" cy="32" r="2.6" fill="currentColor" className="text-coral" />
  </>
);

export function LexNavMark({ className, title = "LexNav" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="64" height="64" rx="16" fill="currentColor" className="text-ink" />
      {compassArms}
    </svg>
  );
}

export function LexNavMarkLight({ className, title = "LexNav" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="64" height="64" rx="16" fill="currentColor" className="text-paper" />
      <path d="M10 32L32 26.4L54 32L32 37.6Z" fill="currentColor" className="text-ink/20" />
      <path d="M32 54L26.4 32H37.6Z" fill="currentColor" className="text-ink/20" />
      <path d="M32 8L24.8 32H39.2Z" fill="currentColor" className="text-coral" />
      <circle cx="32" cy="32" r="5" fill="currentColor" className="text-paper" />
      <circle cx="32" cy="32" r="2.6" fill="currentColor" className="text-coral" />
    </svg>
  );
}

export function LexNavMarkMono({
  className,
  title = "LexNav",
  inverted = false,
}: MarkProps & { inverted?: boolean }) {
  const fill = inverted ? "text-paper" : "text-ink";
  const arm = inverted ? "text-ink" : "text-paper";
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="64" height="64" rx="16" fill="currentColor" className={fill} />
      <path d="M10 32L32 26.4L54 32L32 37.6Z" fill="currentColor" className={arm} />
      <path d="M32 54L26.4 32H37.6Z" fill="currentColor" className={arm} />
      <path d="M32 8L24.8 32H39.2Z" fill="currentColor" className={arm} />
      <circle cx="32" cy="32" r="5" fill="currentColor" className={fill} />
      <circle cx="32" cy="32" r="2.6" fill="currentColor" className={arm} />
    </svg>
  );
}

export function LexNavGlyph({ className, title = "LexNav" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M6 32L32 24.8L58 32L32 39.2Z" fill="currentColor" className="text-ink/25" />
      <path d="M32 58L24.8 32H39.2Z" fill="currentColor" className="text-ink/25" />
      <path d="M32 4L22 32H42Z" fill="currentColor" className="text-coral" />
      <circle cx="32" cy="32" r="5.5" fill="currentColor" className="text-paper" />
      <circle cx="32" cy="32" r="3" fill="currentColor" className="text-coral" />
    </svg>
  );
}

export function LexNavWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LexNavMark className="size-11 shrink-0" />
      <span className="leading-none tracking-tight">
        <span className="font-serif text-[1.85rem] text-ink">Lex</span>
        <span className="font-sans text-[1.55rem] font-extrabold text-ink">Nav</span>
      </span>
    </div>
  );
}

export function LexNavWordmarkOnDark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LexNavMarkLight className="size-11 shrink-0" />
      <span className="leading-none tracking-tight">
        <span className="font-serif text-[1.85rem] text-paper">Lex</span>
        <span className="font-sans text-[1.55rem] font-extrabold text-paper">Nav</span>
      </span>
    </div>
  );
}
