import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SessionSidebar } from "@/components/workbench/session-sidebar";
import { requireOperator } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";
import { getRuntimeConfig } from "@/lib/runtime-config";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const operator = await requireOperator();
  const repository = await getQuoteRepository();
  const sessions = await repository.listSessions(operator.id);
  const runtimeConfig = getRuntimeConfig();

  return (
    <div className="workspace-shell">
      <SessionSidebar sessions={sessions} />
      <main className="workspace-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operator workspace</p>
            <h1>Alana Travel Quoting OS</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-meta">
              <span>{operator.fullName}</span>
              <span className="status-pill">
                {runtimeConfig.AUTH_MODE === "mock"
                  ? "Mock auth"
                  : "Supabase auth"}
              </span>
              <span className="status-pill">
                {runtimeConfig.QUOTE_REPOSITORY_MODE === "mock"
                  ? "Mock repository"
                  : "Supabase repository"}
              </span>
              <span className="status-pill">
                {runtimeConfig.AI_PROVIDER === "mock"
                  ? "Mock orchestration"
                  : runtimeConfig.OPENAI_MODEL}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
