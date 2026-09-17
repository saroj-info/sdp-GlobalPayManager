/**
 * Slim greeting row at the top of a dashboard — no card, no gradient.
 * Left: greeting + context line; right: quick-action slot.
 */

interface GreetingBandProps {
  greeting: string;
  chip?: string;
  actions?: React.ReactNode;
}

export function timeGreeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${part}, ${firstName}` : part;
}

export function GreetingBand({ greeting, chip, actions }: GreetingBandProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" data-testid="dashboard-greeting">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{greeting}</h2>
        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
          {today}
          {chip && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {chip}
            </span>
          )}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
