import { tags } from "typia";

/**
 * JWT payload structure for a regular platform member.
 *
 * - Id: the top-level member unique identifier (UUID)
 * - Type: discriminates the role, always "member" for this payload
 */
export interface MemberPayload {
  /** Top-level member user ID (the unique system identifier for a member). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the role type in authorization (always "member"). */
  type: "member";
}
