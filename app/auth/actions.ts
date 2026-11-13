"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    redirect("/login?error=invalid");
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?error=setup");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=credentials");
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const displayName = readField(formData, "displayName");
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (
    displayName.length < 2 ||
    displayName.length > 60 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8
  ) {
    redirect("/register?error=invalid");
  }

  if (!isSupabaseConfigured()) {
    redirect("/register?error=setup");
  }

  const requestHeaders = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    requestHeaders.get("origin") ||
    "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: new URL("/auth/confirm", origin).toString(),
      // Display-only profile information. Never use user metadata for permissions.
      data: { display_name: displayName },
    },
  });

  if (error) {
    redirect("/register?error=signup");
  }

  if (data.session) {
    redirect("/dashboard");
  }

  redirect("/register?message=check-email");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login?message=signed-out");
}
