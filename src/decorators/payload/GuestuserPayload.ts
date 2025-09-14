import { tags } from "typia";

/**
 * Payload for unauthenticated visitor (guest user) authentication.
 *
 * - Id: top-level guest user UUID
 * - Type: "guestUser" discriminator
 */
export interface GuestuserPayload {
  /**
   * Top-level guest user table ID (the fundamental user identifier for guest
   * logins).
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for role type: always "guestUser". */
  type: "guestUser";
}
