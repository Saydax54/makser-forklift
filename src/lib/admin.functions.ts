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

const updateSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6).max(72).optional().or(z.literal("")),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(40).default(""),
  role: z.enum(["admin", "technician"]),
});

type AuthedContext = { supabase: { from: (t: string) => any }; userId: string };

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
    throw new Error("Bu işlem için yönetici yetkisi gerekli.");
  }
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);

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

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [users, profiles, roles] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("profiles").select("id, full_name, phone"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (users.error) throw new Error(users.error.message);

    return users.data.users.map((u) => {
      const profile = (profiles.data ?? []).find((p) => p.id === u.id);
      const role = (roles.data ?? []).find((r) => r.user_id === u.id)?.role ?? "technician";
      return {
        id: u.id,
        email: u.email ?? "",
        fullName: profile?.full_name ?? "",
        phone: profile?.phone ?? "",
        role: role as "admin" | "technician",
      };
    });
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const attrs: { email: string; password?: string; user_metadata: Record<string, string> } = {
      email: data.email,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    };
    if (data.password) attrs.password = data.password;

    const updated = await supabaseAdmin.auth.admin.updateUserById(data.userId, attrs);
    if (updated.error) throw new Error(updated.error.message);

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.userId, full_name: data.fullName, phone: data.phone });

    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Kendi yönetici yetkinizi kaldıramazsınız.");
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (roleError) throw new Error(roleError.message);

    const { data: tech } = await supabaseAdmin
      .from("technicians")
      .select("id")
      .eq("user_id", data.userId)
      .maybeSingle();

    if (data.role === "technician") {
      if (tech) {
        await supabaseAdmin
          .from("technicians")
          .update({ full_name: data.fullName, phone: data.phone })
          .eq("id", tech.id);
      } else {
        await supabaseAdmin
          .from("technicians")
          .insert({ user_id: data.userId, full_name: data.fullName, phone: data.phone });
      }
    } else if (tech) {
      const { count } = await supabaseAdmin
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("technician_id", tech.id);
      if (count && count > 0) {
        await supabaseAdmin.from("technicians").update({ user_id: null }).eq("id", tech.id);
      } else {
        await supabaseAdmin.from("technicians").delete().eq("id", tech.id);
      }
    }

    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    if (data.userId === context.userId) {
      throw new Error("Kendi hesabınızı silemezsiniz.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tech } = await supabaseAdmin
      .from("technicians")
      .select("id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (tech) {
      const { count } = await supabaseAdmin
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("technician_id", tech.id);
      if (count && count > 0) {
        await supabaseAdmin.from("technicians").update({ user_id: null }).eq("id", tech.id);
      } else {
        await supabaseAdmin.from("technicians").delete().eq("id", tech.id);
      }
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    const removed = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (removed.error) throw new Error(removed.error.message);

    return { ok: true as const };
  });
