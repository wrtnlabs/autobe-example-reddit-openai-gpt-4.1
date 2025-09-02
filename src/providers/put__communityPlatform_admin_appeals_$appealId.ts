import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the details of an existing appeal such as its status, decision
 * rationale, or assigned admin handler.
 *
 * This endpoint allows an authenticated admin to update a moderation or admin
 * appeal record, identified by appealId. Supported updates include changing the
 * appeal status (such as 'under_review', 'resolved', or 'rejected'), providing
 * a decision rationale, or associating an admin reviewer. Admins can only
 * update fields allowed by business rules. Every update automatically refreshes
 * the updated_at timestamp.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user executing the update
 * @param props.appealId - The unique appealId of the record to modify
 * @param props.body - Partial update: appeal_status, decision_reason, admin_id
 * @returns Updated appeal record including all new field values and updated
 *   timestamps
 * @throws {Error} If appeal does not exist, or on data layer failure
 */
export async function put__communityPlatform_admin_appeals_$appealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAppeal.IUpdate;
}): Promise<ICommunityPlatformAppeal> {
  const { admin, appealId, body } = props;
  // Authorization already enforced via admin payload/decorator

  // Step 1: Find the existing appeal; throw if not found
  const appeal = await MyGlobal.prisma.community_platform_appeals.findFirst({
    where: { id: appealId },
  });
  if (!appeal) {
    throw new Error("Appeal not found");
  }

  // Step 2: Perform update (only allowed fields and always update 'updated_at')
  await MyGlobal.prisma.community_platform_appeals.update({
    where: { id: appealId },
    data: {
      appeal_status: body.appeal_status ?? undefined,
      decision_reason: body.decision_reason ?? undefined,
      admin_id: body.admin_id ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 3: Fetch and return the updated record (convert date fields)
  const updated =
    await MyGlobal.prisma.community_platform_appeals.findFirstOrThrow({
      where: { id: appealId },
    });

  return {
    id: updated.id,
    member_id: updated.member_id,
    admin_action_id: updated.admin_action_id,
    appeal_status: updated.appeal_status,
    decision_reason: updated.decision_reason ?? null,
    admin_id: updated.admin_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
