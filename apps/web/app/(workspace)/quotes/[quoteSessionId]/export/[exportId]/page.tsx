export default async function QuoteExportPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string; exportId: string }>;
}) {
  const { quoteSessionId, exportId } = await params;

  return (
    <section className="workspace-grid single-column">
      <div className="empty-panel">
        <p className="eyebrow">Export placeholder</p>
        <h2>Quote export route scaffolded</h2>
        <p className="muted">
          Session: {quoteSessionId} | Export: {exportId}
        </p>
        <p className="muted">
          The PDF renderer and versioned export storage will plug into this
          route in the next slice.
        </p>
      </div>
    </section>
  );
}
