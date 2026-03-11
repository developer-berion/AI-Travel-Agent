import { redirect } from "next/navigation";

export default async function QuoteSessionIndexPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string }>;
}) {
  const { quoteSessionId } = await params;

  redirect(`/quotes/${quoteSessionId}/conversation`);
}
