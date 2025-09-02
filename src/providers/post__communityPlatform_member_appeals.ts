import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new moderation/admin appeal for a specific admin action on behalf of
 * a member.
 *
 * This operation creates an appeal record, linking the authenticated member to
 * the referenced admin action, with a specified appeal status and optional
 * initial rationale (decision_reason). The appeal is immediately eligible for
 * administrative review and enters the platform's formal dispute/appeal
 * workflow. Only platform members may create such appeals, and the resulting
 * entity includes all input data plus auto-generated system metadata (IDs,
 * timestamps).
 *
 * @param props - Request properties
 * @param props.member - The authenticated member filing the appeal
 *   (MemberPayload)
 * @param props.body - Appeal creation data: admin action ID, initial status,
 *   and optional rationale
 * @returns The newly created appeal entity, including all input fields and
 *   system metadata
 * @throws {Error} If the database insert fails for any reason or input is
 *   malformed
 */
export async function post__communityPlatform_member_appeals(props: {
  member: MemberPayload;
  body: ICommunityPlatformAppeal.ICreate;
}): Promise<ICommunityPlatformAppeal> {
  const { member, body } = props;

  // System-set fields
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Insert record into the community_platform_appeals table
  const created = await MyGlobal.prisma.community_platform_appeals.create({
    data: {
      id: id,
      member_id: member.id,
      admin_action_id: body.admin_action_id,
      appeal_status: body.appeal_status,
      decision_reason: body.decision_reason ?? null,
      admin_id: null,
      created_at: now,
      updated_at: now,
    },
  });
  // Return the API structure with all necessary type conversions and null defaults
  return {
    id: created.id,
    member_id: created.member_id,
    admin_action_id: created.admin_action_id,
    appeal_status: created.appeal_status,
    decision_reason: created.decision_reason ?? null,
    admin_id: created.admin_id ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
