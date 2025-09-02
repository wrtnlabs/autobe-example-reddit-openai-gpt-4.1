import { tags } from "typia";

/**
 * Guest authorization payload for JWT authentication. Top-level ID is
 * community_platform_guests.id (guest unique).
 */
export interface GuestPayload {
  /**
   * Top-level guest table ID (the fundamental guest identifier in the
   * platform).
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
