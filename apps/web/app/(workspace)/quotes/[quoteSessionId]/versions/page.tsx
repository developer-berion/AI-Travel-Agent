import {
  buildQuoteVersionDiffView,
  buildQuoteVersionSummaries,
} from "@alana/database";

import { QuoteVersionsPanel } from "@/components/quote/quote-versions-panel";
import { getAuthorizedQuoteRecord } from "@/lib/quote-session";

export default async function QuoteVersionsPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string }>;
}) {
  const { quoteSessionId } = await params;
  const { record } = await getAuthorizedQuoteRecord(quoteSessionId);

  return (
    <section className="session-page-grid">
      <QuoteVersionsPanel
        versionDiffs={record.quoteVersions
          .map((version) => ({
            versionId: version.id,
            diff: buildQuoteVersionDiffView(record, version.id),
          }))
          .filter(
            (
              entry,
            ): entry is {
              versionId: string;
              diff: NonNullable<ReturnType<typeof buildQuoteVersionDiffView>>;
            } => entry.diff !== null,
          )}
        quoteSessionId={record.session.id}
        versionDetails={record.quoteVersions}
        versionSummaries={buildQuoteVersionSummaries(record)}
      />
    </section>
  );
}
