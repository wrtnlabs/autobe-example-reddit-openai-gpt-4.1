import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new report about a post for moderation review
 * (community_platform_post_reports table).
 *
 * This endpoint allows an authenticated member to create a new report for a
 * given post, enabling members to flag inappropriate content, spam, or rule
 * violations for moderation review. A member may only report the same post once
 * (duplicate reports are prohibited per business constraint). Requested
 * report_type and reason are required as input; status is initialized to
 * 'open'. The response includes all report fields as per API contract, with
 * correct ISO 8601 timestamp string types. All UUIDs are generated via v4().
 *
 * @param props - Request parameters
 * @param props.member - The authenticated member performing the report
 * @param props.postId - The UUID of the post being reported
 * @param props.body - Report creation input, including report_type and reason
 * @returns The created ICommunityPlatformPostReport entity with all fields
 *   populated
 * @throws {Error} Duplicate report: when a member already reported this post
 * @throws {Error} When required fields are missing or invalid
 */
export async function post__communityPlatform_member_posts_$postId_reports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.ICreate;
}): Promise<ICommunityPlatformPostReport> {
  // Enforce one report per post per member (soft-deleted are ignored)
  const exists =
    await MyGlobal.prisma.community_platform_post_reports.findFirst({
      where: {
        community_platform_post_id: props.postId,
        reported_by_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error(
      "Duplicate report: this member has already reported this post",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_post_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_post_id: props.postId,
      reported_by_member_id: props.member.id,
      admin_id: null,
      report_type: props.body.report_type,
      reason: props.body.reason,
      status: "open",
      resolution_notes: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    community_platform_post_id: created.community_platform_post_id,
    reported_by_member_id: created.reported_by_member_id,
    admin_id: created.admin_id ?? null,
    report_type: created.report_type,
    reason: created.reason,
    status: created.status,
    resolution_notes: created.resolution_notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
