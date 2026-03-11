import { NewQuoteButton } from "@/components/workbench/new-quote-button";
import { WorkspaceInbox } from "@/components/workbench/workspace-inbox";
import { getWorkspaceCaseSummaries } from "@/lib/quote-session";

export default async function QuotesPage() {
  const cases = await getWorkspaceCaseSummaries();

  return (
    <section className="workspace-grid single-column">
      {cases.length === 0 ? (
        <div className="empty-panel">
          <p className="eyebrow">Bandeja</p>
          <h2>No hay casos activos todavía</h2>
          <p className="muted">
            Crea la primera cotización para abrir el hilo, estructurar el caso y
            empezar a trabajar la propuesta.
          </p>
          <div className="inline-actions">
            <NewQuoteButton />
          </div>
        </div>
      ) : (
        <WorkspaceInbox cases={cases} />
      )}
    </section>
  );
}
