import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCredential";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get user credential details by ID (community_platform_user_credentials)
 *
 * Retrieves information about a specific user's authentication credentials
 * based on credential ID. Connected to the community_platform_user_credentials
 * table for admin authentication workflows.
 *
 * This endpoint provides detailed authentication credential records for a user,
 * found by unique credential ID. It is critical for admin audit flows, password
 * reset validation, and verifying business rules on account status.
 *
 * Schema fields retrieved correspond to the community_platform_user_credentials
 * model, including email, status, and timestamps. Password hashes are never
 * returned, ensuring privacy compliance.
 *
 * Access is available exclusively to admin users. Requests for non-existent or
 * unauthorized credentials return error status codes matching platform security
 * standards.
 *
 * @param props - Object containing all required parameters for the operation
 * @param props.adminUser - The authenticated admin user making the request
 *   (must have role "adminUser")
 * @param props.userCredentialId - Unique identifier (UUID) of the user
 *   credential record
 * @returns The user credential record, with all fields except password hash
 * @throws {Error} When the credential record is not found
 */
export async function get__communityPlatform_adminUser_userCredentials_$userCredentialId(props: {
  adminUser: AdminuserPayload;
  userCredentialId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserCredential> {
  const { userCredentialId } = props;
  const credential =
    await MyGlobal.prisma.community_platform_user_credentials.findFirst({
      where: { id: userCredentialId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!credential) throw new Error("Credential not found");
  return {
    id: credential.id,
    email: credential.email,
    created_at: toISOStringSafe(credential.created_at),
    updated_at: toISOStringSafe(credential.updated_at),
    deleted_at:
      credential.deleted_at !== undefined && credential.deleted_at !== null
        ? toISOStringSafe(credential.deleted_at)
        : null,
  };
}
