import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a single moderation/admin appeal record by ID.
 *
 * Fetch detailed information about a specific appeal record based on its unique
 * identifier. Returns all details according to the ICommunityPlatformAppeal
 * type, including references to the appealed admin action, appeal status,
 * rationale, recorded decisions, and involved parties. Used by admins for
 * transparency and workflow auditing.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the fetch
 *   (authorization enforced at controller/decorator layer)
 * @param props.appealId - Unique identifier of the appeal to retrieve
 * @returns The full appeal record matching ICommunityPlatformAppeal (all fields
 *   populated)
 * @throws {Error} If no appeal with the specified ID exists (Prisma error is
 *   propagated)
 */
export async function get__communityPlatform_admin_appeals_$appealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAppeal> {
  const { appealId } = props;
  // Fetch using Prisma. findUniqueOrThrow will raise if not found.
  const appeal =
    await MyGlobal.prisma.community_platform_appeals.findUniqueOrThrow({
      where: { id: appealId },
      select: {
        id: true,
        member_id: true,
        admin_action_id: true,
        appeal_status: true,
        decision_reason: true,
        admin_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    id: appeal.id,
    member_id: appeal.member_id,
    admin_action_id: appeal.admin_action_id,
    appeal_status: appeal.appeal_status,
    decision_reason:
      typeof appeal.decision_reason === "undefined"
        ? null
        : appeal.decision_reason,
    admin_id: typeof appeal.admin_id === "undefined" ? null : appeal.admin_id,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
  };
}
