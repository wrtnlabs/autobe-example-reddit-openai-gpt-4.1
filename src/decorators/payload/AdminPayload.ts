import { tags } from "typia";

/** Payload for authenticated admin user. Always contains top-level admin ID. */
export interface AdminPayload {
  /** Top-level admin table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
