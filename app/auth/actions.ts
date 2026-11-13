"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readRawField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function getSiteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL || requestHeaders.get("origin") || "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();
  // Passwords are intentionally not trimmed: whitespace can be part of a password.
  const password = readRawField(formData, "password");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    redirect("/login?error=invalid");
  }

  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/login?error=credentials");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const displayName = readField(formData, "displayName");
  const email = readField(formData, "email").toLowerCase();
  const password = readRawField(formData, "password");

  if (
    displayName.length < 2 ||
    displayName.length > 60 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8
  ) {
    redirect("/register?error=invalid");
  }

  if (!isSupabaseConfigured()) redirect("/register?error=setup");

  const origin = await getSiteOrigin();
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

  if (error) redirect("/register?error=signup");
  if (data.session) redirect("/dashboard");
  redirect("/register?message=check-email");
}

export async function requestPasswordReset(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/forgot-password?error=invalid");
  }

  if (!isSupabaseConfigured()) redirect("/forgot-password?error=setup");

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/auth/confirm?type=recovery", origin).toString(),
  });

  if (error) redirect("/forgot-password?error=send");
  redirect("/forgot-password?message=sent");
}

export async function updatePassword(formData: FormData) {
  const password = readRawField(formData, "password");
  const confirmation = readRawField(formData, "confirmation");

  if (password.length < 8 || password !== confirmation) {
    redirect("/reset-password?error=invalid");
  }

  if (!isSupabaseConfigured()) redirect("/reset-password?error=setup");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/forgot-password?error=session");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=update");

  redirect("/login?message=password-updated");
}

export async function updateDisplayName(formData: FormData) {
  const displayName = readField(formData, "displayName");

  if (displayName.length < 2 || displayName.length > 60) {
    redirect("/profile?error=display-name");
  }

  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) redirect("/login");

  const userId = claimsData.claims.sub;
  if (typeof userId !== "string") redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", userId);

  if (error) redirect("/profile?error=profile-update");
  redirect("/profile?message=updated");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login?message=signed-out");
}
