import { tags } from "typia";

/**
 * JWT payload type for adminUser authorization.
 *
 * - Id: Top-level admin user id (community_platform_adminusers.id)
 * - Type: Discriminator, always "adminUser"
 */
export interface AdminuserPayload {
  /** Top-level admin user table ID (community_platform_adminusers.id) */
  id: string & tags.Format<"uuid">;
  /** Role discriminator (for adminUser) */
  type: "adminUser";
}
