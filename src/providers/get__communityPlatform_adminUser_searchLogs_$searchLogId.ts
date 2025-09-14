import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSearchLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Retrieve detailed information for a specific search log entry
 * (community_platform_search_logs).
 *
 * This endpoint allows an authorized adminUser to retrieve full details of a
 * particular search event logged by the platform. The function only allows
 * access to soft-delete active entries, mapped directly from the audit/search
 * log schema. Throws an error if the log entry is not found.
 *
 * @param props - Properties for the operation
 * @param props.adminUser - Authenticated adminUser payload (authorization
 *   enforced by controller/decorator)
 * @param props.searchLogId - The UUID primary key identifying the search log to
 *   retrieve
 * @returns ICommunityPlatformSearchLog representing the detailed log
 *   information
 * @throws {Error} If the search log is not found or is soft-deleted
 */
export async function get__communityPlatform_adminUser_searchLogs_$searchLogId(props: {
  adminUser: AdminuserPayload;
  searchLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSearchLog> {
  const { searchLogId } = props;
  const record = await MyGlobal.prisma.community_platform_search_logs.findFirst(
    {
      where: {
        id: searchLogId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_user_id: true,
        admin_user_id: true,
        search_query: true,
        target_scope: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        deleted_at: true,
      },
    },
  );
  if (!record) throw new Error("Search log entry not found");
  return {
    id: record.id,
    member_user_id: record.member_user_id ?? undefined,
    admin_user_id: record.admin_user_id ?? undefined,
    search_query: record.search_query,
    target_scope: record.target_scope,
    ip_address: record.ip_address,
    user_agent: record.user_agent ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
