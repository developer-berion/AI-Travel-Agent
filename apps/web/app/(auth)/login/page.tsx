import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LoginForm } from "@/components/workbench/login-form";
import { getOperatorFromCookie } from "@/lib/auth";
import { getRuntimeConfig } from "@/lib/runtime-config";

export default async function LoginPage() {
  const operator = await getOperatorFromCookie();
  const runtimeConfig = getRuntimeConfig();

  if (operator) {
    redirect("/quotes");
  }

  return (
    <main className="auth-layout">
      <section className="auth-shell">
        <header className="auth-toolbar">
          <div>
            <p className="eyebrow">Operator workspace</p>
            <h2>Access control</h2>
          </div>
          <ThemeToggle />
        </header>
        <LoginForm authMode={runtimeConfig.AUTH_MODE} />
      </section>
    </main>
  );
}
