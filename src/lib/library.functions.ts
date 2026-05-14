import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const addToLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        game_slug: z.string().min(1).max(200),
        game_id: z.number().int().optional(),
        game_name: z.string().min(1).max(300),
        game_image: z.string().url().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("user_library").insert({
      user_id: userId,
      game_slug: data.game_slug,
      game_id: data.game_id ?? null,
      game_name: data.game_name,
      game_image: data.game_image ?? null,
    });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    return { success: true };
  });

export const removeFromLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ game_slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_library")
      .delete()
      .eq("user_id", userId)
      .eq("game_slug", data.game_slug);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getMyLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_library")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const isInLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ game_slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("user_library")
      .select("id")
      .eq("user_id", userId)
      .eq("game_slug", data.game_slug)
      .maybeSingle();
    return { inLibrary: !!row };
  });
