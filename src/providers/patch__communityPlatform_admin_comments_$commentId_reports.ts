import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated, filterable list of reports for a specific comment.
 *
 * This function returns a paginated list of all reports filed for a given
 * comment, supporting advanced filtering, searching, and sorting for admin
 * moderation workflows. The function allows filtering by report status,
 * reporter, admin assignment, report reason, and supports result pagination and
 * sorting based on the IRequest parameters. Only admins may use this endpoint,
 * and the business rules are enforced accordingly. Only fields specified in
 * ICommunityPlatformCommentReport.ISummary are returned.
 *
 * @param props - The request parameters
 * @param props.admin - The authenticated admin payload
 * @param props.commentId - The unique identifier of the comment whose reports
 *   will be listed
 * @param props.body - Filter, search, and pagination parameters
 * @returns A paginated list of comment report summaries, conforming to
 *   IPageICommunityPlatformCommentReport.ISummary
 * @throws {Error} If the commentId is invalid or not found
 */
export async function patch__communityPlatform_admin_comments_$commentId_reports(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IRequest;
}): Promise<IPageICommunityPlatformCommentReport.ISummary> {
  const { commentId, body } = props;
  // Defensive pagination
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit = body.limit && body.limit >= 1 ? body.limit : 20;
  // Build where clause with null/undefined checks for non-required/optional API params
  const where = {
    comment_id: commentId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.report_reason !== undefined &&
      body.report_reason !== null && {
        report_reason: {
          contains: body.report_reason,
          mode: "insensitive" as const,
        },
      }),
    ...(body.reporter_id !== undefined &&
      body.reporter_id !== null && { reporter_id: body.reporter_id }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
  };
  // Sorting: parse 'sort' string if present (e.g., 'created_at desc', 'created_at asc'). If invalid, fallback.
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort && typeof body.sort === "string") {
    const match = /^(created_at)\s+(asc|desc)$/i.exec(body.sort);
    if (match) {
      orderBy = {
        [match[1]]: match[2].toLowerCase() === "asc" ? "asc" : "desc",
      };
    }
  }
  // Query results and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_reports.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
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
    MyGlobal.prisma.community_platform_comment_reports.count({ where }),
  ]);
  // Map rows to ISummary format, ensuring all types/brands are correct and created_at is ISO string
  const data = rows.map((row) => ({
    id: row.id,
    comment_id: row.comment_id,
    reporter_id: row.reporter_id,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    ...(row.admin_id !== undefined && row.admin_id !== null
      ? { admin_id: row.admin_id }
      : {}),
  }));
  // Pagination objects (must use Number() to unbrand values for proper type matching)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
