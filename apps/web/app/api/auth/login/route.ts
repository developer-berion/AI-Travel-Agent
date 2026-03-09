import { signInOperator } from "@/lib/auth";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
  };

  return signInOperator(payload);
}
