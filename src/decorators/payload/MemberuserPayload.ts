import { tags } from "typia";

/**
 * JWT payload structure for an authorized member user. 'id' is the primary key
 * of community_platform_memberusers (top-level user identifier).
 */
export interface MemberuserPayload {
  /**
   * Top-level member user ID. Always corresponds to
   * community_platform_memberusers.id
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated role. */
  type: "memberUser";
}
