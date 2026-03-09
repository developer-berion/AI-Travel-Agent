import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import type { OperatorProfile } from "@alana/domain";
import { createId } from "@alana/shared";

import { getRuntimeConfig } from "@/lib/runtime-config";
import {
  createAdminSupabaseClient,
  createRequestSupabaseClient,
} from "@/lib/supabase/server";

const authCookieName = "alana-operator";

const encodeOperator = (operator: OperatorProfile) =>
  Buffer.from(JSON.stringify(operator), "utf8").toString("base64url");

const decodeOperator = (value: string): OperatorProfile | null => {
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as OperatorProfile;
  } catch {
    return null;
  }
};

const normalizeOperatorProfile = (
  user: Pick<User, "id" | "email" | "user_metadata">,
): OperatorProfile => ({
  id: user.id,
  email: user.email ?? "",
  fullName:
    String(user.user_metadata.full_name ?? "").trim() ||
    user.email?.split("@")[0] ||
    "Operator",
  role: user.user_metadata.role === "admin" ? "admin" : "operator",
});

export const createMockOperator = (email: string): OperatorProfile => ({
  id: createId(),
  email,
  fullName: email.split("@")[0] ?? "Operator",
  role: "operator",
});

const setMockOperatorCookieValue = (operator: OperatorProfile) => ({
  name: authCookieName,
  value: encodeOperator(operator),
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
});

const getMockOperatorFromCookie = async () => {
  const cookieStore = await cookies();
  const value = cookieStore.get(authCookieName)?.value;

  return value ? decodeOperator(value) : null;
};

const syncOperatorProfile = async (
  user: Pick<User, "id" | "email" | "user_metadata">,
) => {
  const profile = normalizeOperatorProfile(user);
  const adminClient = createAdminSupabaseClient();

  const { error } = await adminClient.from("operator_profiles").upsert({
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    role: profile.role,
    is_active: true,
  });

  if (error) {
    throw new Error(`operator_profile_sync_failed:${error.code ?? "unknown"}`);
  }

  return profile;
};

const getSupabaseOperator = async () => {
  const supabase = await createRequestSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return syncOperatorProfile(user);
};

export const signInOperator = async (payload: {
  email?: string;
  password?: string;
}) => {
  if (!payload.email || !payload.password) {
    return NextResponse.json(
      { error: "email_and_password_required" },
      { status: 400 },
    );
  }

  const config = getRuntimeConfig();

  if (config.AUTH_MODE === "mock") {
    const operator = createMockOperator(payload.email);
    const response = NextResponse.json({ operator });
    response.cookies.set(setMockOperatorCookieValue(operator));
    return response;
  }

  const supabase = await createRequestSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const operator = await syncOperatorProfile(data.user);
  return NextResponse.json({ operator });
};

export const getOperatorFromCookie = async () => {
  const config = getRuntimeConfig();

  return config.AUTH_MODE === "mock"
    ? getMockOperatorFromCookie()
    : getSupabaseOperator();
};

export const requireOperator = async () => {
  const operator = await getOperatorFromCookie();

  if (!operator) {
    redirect("/login");
  }

  return operator;
};
