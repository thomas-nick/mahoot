import { getStrapiServerUrl } from "@/lib/strapi-server-url";

const STRAPI_URL = getStrapiServerUrl();

/**
 * Roles that can review and decide on submissions. The Authenticated default
 * role is intentionally NOT included so a stray opt-in does not give every
 * user moderation power.
 *
 * Override via MODERATOR_ROLE_NAMES (comma-separated) when you have custom
 * role names.
 */
const DEFAULT_MODERATOR_ROLES = ["Moderator", "Admin", "Owner"];

const moderatorRoles = (process.env.MODERATOR_ROLE_NAMES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedRoles = (moderatorRoles.length > 0 ? moderatorRoles : DEFAULT_MODERATOR_ROLES)
  .map((name) => name.toLowerCase());

export type ModeratorIdentity = {
  id: number;
  username?: string | null;
  email?: string | null;
  roleName: string | null;
  isModerator: boolean;
};

/**
 * Resolve the user behind a JWT and tell whether they can act as a moderator.
 * Returns null if the JWT is invalid.
 */
export async function getModeratorIdentity(jwt: string): Promise<ModeratorIdentity | null> {
  if (!jwt) return null;
  const response = await fetch(`${STRAPI_URL}/api/users/me?populate=role`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const me = (await response.json()) as {
    id?: number;
    username?: string | null;
    email?: string | null;
    role?: { name?: string | null; type?: string | null } | null;
  };
  if (!me.id) return null;
  const roleName = me.role?.name ?? null;
  const isModerator = roleName ? allowedRoles.includes(roleName.toLowerCase()) : false;
  return {
    id: me.id,
    username: me.username ?? null,
    email: me.email ?? null,
    roleName,
    isModerator,
  };
}

export const allowedModerationDecisions = ["approved", "rejected", "pending"] as const;
export type ModerationDecision = (typeof allowedModerationDecisions)[number];

export const allowedSubmissionKinds = ["disc", "course"] as const;
export type SubmissionKind = (typeof allowedSubmissionKinds)[number];

export const submissionEndpointFor = (kind: SubmissionKind) =>
  kind === "disc" ? "disc-submissions" : "course-submissions";
