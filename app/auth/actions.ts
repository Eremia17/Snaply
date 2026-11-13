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


export async function submitTask(formData: FormData) {
  const taskId = readField(formData, "taskId");
  const response = readField(formData, "response");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)) {
    redirect("/tasks");
  }

  if (response.length < 3 || response.length > 5000) {
    redirect(`/tasks/${taskId}?error=response`);
  }

  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    redirect("/login?error=auth");
  }

  const { error } = await supabase.from("task_attempts").insert({
    task_id: taskId,
    user_id: userId,
    submission_data: { response },
  });

  if (error?.code === "23505") {
    redirect(`/tasks/${taskId}?error=duplicate`);
  }
  if (error) {
    redirect(`/tasks/${taskId}?error=closed`);
  }

  redirect(`/tasks/${taskId}?submitted=1`);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login?message=signed-out");
}


export async function reviewTaskAttempt(formData: FormData) {
  const attemptId = readField(formData, "attemptId");
  const decision = readField(formData, "decision");
  const note = readField(formData, "note");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
    redirect("/admin?error=invalid");
  }
  if (decision !== "approved" && decision !== "rejected") {
    redirect("/admin?error=invalid");
  }
  if (note.length > 2000) redirect("/admin?error=note");

  if (!isSupabaseConfigured()) redirect("/login?error=setup");

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") redirect("/dashboard?error=forbidden");

  const { error } = await supabase.rpc("admin_review_task_attempt", {
    p_attempt_id: attemptId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) {
    const code = error.code === "55000" ? "already-reviewed" : "review";
    redirect(`/admin?error=${code}`);
  }

  redirect(`/admin?reviewed=${decision}`);
}
