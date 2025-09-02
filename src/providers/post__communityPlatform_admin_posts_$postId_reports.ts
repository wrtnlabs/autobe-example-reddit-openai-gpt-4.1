import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new report about a post for moderation review
 * (community_platform_post_reports table).
 *
 * Allows an authenticated admin to file a new report regarding a given post.
 * The operation ensures that each admin can only file one report per post,
 * creates the report with the required status and timestamps, and returns all
 * details of the saved report entity.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing this action
 * @param props.postId - The UUID of the post being reported
 * @param props.body - The report details (report_type and reason)
 * @returns The details of the created post report entity
 * @throws {Error} When the admin has already submitted a report for this post
 */
export async function post__communityPlatform_admin_posts_$postId_reports(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.ICreate;
}): Promise<ICommunityPlatformPostReport> {
  const { admin, postId, body } = props;

  // Enforce business constraint: one report per post per admin
  const existing =
    await MyGlobal.prisma.community_platform_post_reports.findFirst({
      where: {
        community_platform_post_id: postId,
        reported_by_member_id: admin.id,
      },
    });
  if (existing) {
    throw new Error(
      "Duplicate report: you can report a post only once as admin",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_post_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_post_id: postId,
      reported_by_member_id: admin.id,
      admin_id: admin.id,
      report_type: body.report_type,
      reason: body.reason,
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
