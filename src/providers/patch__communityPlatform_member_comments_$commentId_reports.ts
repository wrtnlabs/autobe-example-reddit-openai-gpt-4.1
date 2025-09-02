import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve a paginated, filterable list of reports for a specific comment
 * (member view).
 *
 * This operation retrieves a paginated list of all reports that were filed by
 * the requesting member (authenticated) against a specific comment. The result
 * is always limited to the requesting member's own reports for that comment,
 * never revealing reports created by others. Filtering by status, report
 * reason, and admin_id is supported. Pagination and sorting are provided. All
 * date fields are converted to ISO format per contract.
 *
 * @param props - Request properties
 * @param props.member - Authenticated member performing the lookup
 * @param props.commentId - Unique identifier for the target comment
 * @param props.body - Filter, search, and pagination parameters
 *   (ICommunityPlatformCommentReport.IRequest)
 * @returns A paginated summary list of comment reports authored by the
 *   authenticated member for the given comment
 * @throws {Error} When invalid parameters, filter construction errors, or
 *   schema violations occur
 */
export async function patch__communityPlatform_member_comments_$commentId_reports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IRequest;
}): Promise<IPageICommunityPlatformCommentReport.ISummary> {
  const { member, commentId, body } = props;

  // Handle pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build Prisma filters
  const filters = {
    comment_id: commentId,
    reporter_id: member.id,
    ...(body.report_reason !== undefined &&
      body.report_reason !== null &&
      body.report_reason.length > 0 && {
        report_reason: { contains: body.report_reason },
      }),
    ...(body.status !== undefined &&
      body.status !== null &&
      body.status.length > 0 && { status: body.status }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
  };

  // Sorting: support only allowed sort values
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort === "created_at_asc") orderBy = { created_at: "asc" };
  else if (body.sort === "created_at_desc") orderBy = { created_at: "desc" };

  // Query DB for count and page
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_reports.findMany({
      where: filters,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        comment_id: true,
        reporter_id: true,
        status: true,
        created_at: true,
        admin_id: true,
      },
    }),
    MyGlobal.prisma.community_platform_comment_reports.count({
      where: filters,
    }),
  ]);

  // Compose DTO array with date conversion and proper typing
  const data = rows.map((row) => ({
    id: row.id,
    comment_id: row.comment_id,
    reporter_id: row.reporter_id,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    admin_id: row.admin_id ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
