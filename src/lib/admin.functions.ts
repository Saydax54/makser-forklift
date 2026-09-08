import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(40).default(""),
  role: z.enum(["admin", "technician"]),
});

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);
    if (!(roles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Bu işlem için yönetici yetkisi gerekli.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (created.error) throw new Error(created.error.message);
    const userId = created.data.user!.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.fullName, phone: data.phone });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: insertRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (insertRoleError) throw new Error(insertRoleError.message);

    if (data.role === "technician") {
      const { data: existing } = await supabaseAdmin
        .from("technicians")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("technicians")
          .update({ full_name: data.fullName, phone: data.phone })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("technicians")
          .insert({ user_id: userId, full_name: data.fullName, phone: data.phone });
      }
    } else {
      await supabaseAdmin.from("technicians").delete().eq("user_id", userId);
    }

    return { ok: true as const };
  });
