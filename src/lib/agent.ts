/**
 * Returns the current agent ID.
 * Single place to swap in real auth once Supabase Auth is wired:
 *   const { data } = await createClient().auth.getUser();
 *   return data.user?.id ?? 'anonymous';
 */
export function getAgentId(): string {
  return 'current-agent-id';
}
