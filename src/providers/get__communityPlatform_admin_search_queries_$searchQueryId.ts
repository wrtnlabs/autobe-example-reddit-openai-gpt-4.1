import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchQuery";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a specific search query log record by its ID (admin only).
 *
 * Fetches the full details of a specific search query log entry by unique ID.
 * Returns all available audit and query metadata for the event, including
 * user/admin reference, search text, search type, context, performer IP, and
 * event/audit timestamps. Only accessible to authorized admins, and excludes
 * soft-deleted log entries. Used for compliance, audit, and investigation
 * workflows.
 *
 * @param props - Props object containing:
 *
 *   - Admin: The authenticated admin performing the request
 *   - SearchQueryId: The unique identifier of the search query log record to fetch
 *
 * @returns Complete details for the search query log entry, including all query
 *   fields, timestamps, and performer references
 * @throws {Error} If not authorized as admin, or if the search query log is not
 *   found/active
 */
export async function get__communityPlatform_admin_search_queries_$searchQueryId(props: {
  admin: AdminPayload;
  searchQueryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSearchQuery> {
  const { admin, searchQueryId } = props;

  // 1. Authorization: Must be active, not soft-deleted admin
  const existingAdmin =
    await MyGlobal.prisma.community_platform_admins.findFirst({
      where: { id: admin.id, is_active: true, deleted_at: null },
    });
  if (!existingAdmin)
    throw new Error("Unauthorized: admin not found or inactive");

  // 2. Fetch the search query log entry by ID, only if not soft-deleted
  const row = await MyGlobal.prisma.community_platform_search_queries.findFirst(
    {
      where: {
        id: searchQueryId,
        deleted_at: null,
      },
    },
  );
  if (!row) throw new Error("Search query log not found");

  // 3. Map result to ICommunityPlatformSearchQuery DTO, converting all dates
  return {
    id: row.id,
    member_id: row.member_id ?? null,
    admin_id: row.admin_id ?? null,
    query_text: row.query_text,
    search_type: row.search_type,
    performed_at: toISOStringSafe(row.performed_at),
    context: row.context ?? null,
    ip: row.ip ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  };
}
