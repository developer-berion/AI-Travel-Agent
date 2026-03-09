import { redirect } from "next/navigation";

import { getOperatorFromCookie } from "@/lib/auth";

export default async function HomePage() {
  const operator = await getOperatorFromCookie();

  redirect(operator ? "/quotes" : "/login");
}
