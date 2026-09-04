import { withSupabase } from "npm:@supabase/server@1.5.3";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }

    let payload: { code?: unknown };
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const code = typeof payload.code === "string"
      ? payload.code.trim().toUpperCase()
      : "";

    if (!/^[A-Z0-9]{6,12}$/.test(code)) {
      return Response.json({ error: "invalid_code" }, { status: 400 });
    }

    const userId = ctx.userClaims?.sub;
    if (!userId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: classroom, error: classroomError } = await ctx.supabaseAdmin
      .from("classrooms")
      .select("id,name,exam_focus,status")
      .eq("join_code", code)
      .eq("status", "active")
      .maybeSingle();

    if (classroomError) {
      console.error("join-classroom lookup failed", classroomError.message);
      return Response.json({ error: "lookup_failed" }, { status: 500 });
    }

    if (!classroom) {
      return Response.json({ error: "classroom_not_found" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await ctx.supabaseAdmin
      .from("classroom_members")
      .select("role")
      .eq("classroom_id", classroom.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("join-classroom membership lookup failed", existingError.message);
      return Response.json({ error: "membership_lookup_failed" }, { status: 500 });
    }

    if (existing) {
      return Response.json({
        ok: true,
        already_member: true,
        classroom,
        role: existing.role,
      });
    }

    const { error: insertError } = await ctx.supabaseAdmin
      .from("classroom_members")
      .insert({ classroom_id: classroom.id, user_id: userId, role: "student" });

    if (insertError) {
      console.error("join-classroom insert failed", insertError.message);
      return Response.json({ error: "join_failed" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      already_member: false,
      classroom,
      role: "student",
    }, { status: 201 });
  }),
};
