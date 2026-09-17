import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// Manages the current user's team membership: which team they're in (if any),
// their teammates' profiles, and actions to create or join a team.
export function useTeam(userId) {
  const [team, setTeam] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      setTeam(null);
      setTeammates([]);
      setLoading(false);
      return;
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("id", membership.team_id)
      .single();

    const { data: memberRows } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", membership.team_id);

    const memberIds = (memberRows || []).map((m) => m.user_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", memberIds);

    setTeam(teamData);
    setTeammates(profiles || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTeam = useCallback(
    async (name) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name, created_by: userId })
        .select()
        .single();
      if (error) return { error };
      const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: data.id, user_id: userId });
      if (joinError) return { error: joinError };
      await load();
      return { data };
    },
    [userId, load]
  );

  const joinTeam = useCallback(
    async (inviteCode) => {
      const { data: teamData, error: findError } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode.trim())
        .maybeSingle();
      if (findError || !teamData) return { error: { message: "No team found with that code." } };
      const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: teamData.id, user_id: userId });
      if (joinError) return { error: joinError };
      await load();
      return { data: teamData };
    },
    [userId, load]
  );

  const leaveTeam = useCallback(async () => {
    if (!team) return;
    await supabase.from("team_members").delete().eq("team_id", team.id).eq("user_id", userId);
    await load();
  }, [team, userId, load]);

  return { team, teammates, loading, createTeam, joinTeam, leaveTeam };
}