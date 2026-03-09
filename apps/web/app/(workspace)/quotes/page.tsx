import { NewQuoteButton } from "@/components/workbench/new-quote-button";
import { requireOperator } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";

export default async function QuotesPage() {
  const operator = await requireOperator();
  const repository = await getQuoteRepository();
  const sessions = await repository.listSessions(operator.id);

  return (
    <section className="workspace-grid single-column">
      <div className="empty-panel">
        <p className="eyebrow">No active thread selected</p>
        <h2>Start a quote to open the workbench</h2>
        <p className="muted">
          The current slice already supports intake, clarification, supplier
          search, archive behavior, and request-scoped persistence wiring.
        </p>
        <div className="inline-actions">
          <NewQuoteButton />
          <span className="muted">{sessions.length} existing session(s)</span>
        </div>
      </div>
    </section>
  );
}
