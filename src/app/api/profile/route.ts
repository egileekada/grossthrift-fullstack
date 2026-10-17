import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  }

  const [profileResult, privateResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, bio, rating_avg, completed_splits")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_private")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error || privateResult.error) {
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });
  }

  return NextResponse.json({
    profile: profileResult.data,
    phone: privateResult.data?.phone ?? null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send valid JSON." }, { status: 400 });
  }

  const allowedFields = ["display_name", "avatar_url", "bio", "phone"];
  if (Object.keys(body).length === 0 || Object.keys(body).some((key) => !allowedFields.includes(key))) {
    return NextResponse.json({ error: "Send one or more supported profile fields." }, { status: 400 });
  }

  for (const field of allowedFields) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `${field} must be text.` }, { status: 400 });
    }
  }

  const profileUpdates: Record<string, string | null> = {};
  for (const field of ["display_name", "avatar_url", "bio"] as const) {
    if (field in body) profileUpdates[field] = body[field] as string | null;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Could not update your profile details." }, { status: 500 });
    }
  }

  if ("phone" in body) {
    const { error } = await supabase
      .from("profile_private")
      .update({ phone: body.phone as string | null })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Could not update your phone number." }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "Profile updated." });
}