import Link from "next/link";
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
          <Link className="topbar-brand" href="/quotes">
            <span className="topbar-brand-mark" aria-hidden="true">
              AL
            </span>
            <div className="topbar-copy">
              <p className="eyebrow">Alana AI</p>
              <h1>Workspace de cotizaciones</h1>
            </div>
          </Link>
          <div className="topbar-actions">
            <details className="runtime-panel">
              <summary>Entorno</summary>
              <div className="runtime-panel-body">
                <p className="eyebrow">Diagnóstico técnico</p>
                <ul className="runtime-panel-list">
                  <li>
                    <span>Acceso</span>
                    <strong>
                      {runtimeConfig.AUTH_MODE === "mock"
                        ? "Simulado"
                        : "Supabase"}
                    </strong>
                  </li>
                  <li>
                    <span>Repositorio</span>
                    <strong>
                      {runtimeConfig.QUOTE_REPOSITORY_MODE === "mock"
                        ? "Simulado"
                        : "Supabase"}
                    </strong>
                  </li>
                  <li>
                    <span>IA</span>
                    <strong>
                      {runtimeConfig.AI_PROVIDER === "mock"
                        ? "Simulada"
                        : runtimeConfig.OPENAI_MODEL}
                    </strong>
                  </li>
                </ul>
              </div>
            </details>
            <span className="operator-chip">{operator.fullName}</span>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
