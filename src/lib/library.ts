import { supabase } from "@/integrations/supabase/client";

export async function addToLibrary({ data }: { data: any }) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user.id) throw new Error("Not logged in");
  
  const { error } = await supabase.from("user_library").insert({
    user_id: session.session.user.id,
    game_slug: data.game_slug,
    game_id: data.game_id ?? null,
    game_name: data.game_name,
    game_image: data.game_image ?? null,
  });
  if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
  return { success: true };
}

export async function removeFromLibrary({ data }: { data: any }) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user.id) throw new Error("Not logged in");

  const { error } = await supabase
    .from("user_library")
    .delete()
    .eq("user_id", session.session.user.id)
    .eq("game_slug", data.game_slug);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getMyLibrary() {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user.id) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("user_library")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { items: data ?? [] };
}

export async function isInLibrary({ data }: { data: any }) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user.id) return { inLibrary: false };

  const { data: row } = await supabase
    .from("user_library")
    .select("id")
    .eq("user_id", session.session.user.id)
    .eq("game_slug", data.game_slug)
    .maybeSingle();
  return { inLibrary: !!row };
}
