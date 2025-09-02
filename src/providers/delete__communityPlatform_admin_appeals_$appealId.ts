import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently erase a moderation/admin appeal by ID.
 *
 * This destructive operation irreversibly deletes an appeal from the database
 * by its unique ID. Used when an appeal is filed in error, withdrawn, or
 * legally required to be destroyed. Only admins can perform this operation. No
 * recovery is possible. Operation is not a soft delete; the underlying row is
 * fully removed.
 *
 * It is strongly recommended that system audit logs be maintained for all such
 * destructive actions for compliance and historic reference.
 *
 * @param props - Operation parameters.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.appealId - The unique identifier of the appeal to permanently
 *   erase.
 * @returns Void
 * @throws {Error} If the appeal does not exist or has already been erased.
 */
export async function delete__communityPlatform_admin_appeals_$appealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, appealId } = props;

  // 1. Confirm the appeal exists (throws if not found)
  await MyGlobal.prisma.community_platform_appeals.findUniqueOrThrow({
    where: { id: appealId },
  });

  // 2. Delete the appeal (hard delete, not soft delete)
  await MyGlobal.prisma.community_platform_appeals.delete({
    where: { id: appealId },
  });
}
