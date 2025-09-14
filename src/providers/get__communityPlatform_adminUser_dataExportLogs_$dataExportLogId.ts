import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDataExportLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Retrieve detailed information for a specific data export log entry
 * (community_platform_data_export_logs).
 *
 * Enables an authorized adminUser to fetch a full record for a data export log,
 * given its unique ID. Only admin users are permitted to access this operation,
 * which returns compliance-critical metadata for audits and investigations. The
 * returned object matches the exported DTO structure.
 *
 * Authorization is enforced via the adminUser authentication payload. If the
 * log does not exist or is soft-deleted, an error is thrown. Dates are properly
 * formatted, nullables are mapped to undefined when missing, and all type
 * requirements are strictly enforced without type assertions.
 *
 * @param props - Object containing authentication and the log ID
 * @param props.adminUser - The authenticated admin user (must be active and
 *   authorized by pipeline)
 * @param props.dataExportLogId - UUID of the data export log to fetch
 * @returns The full details of the export log, or throws if not found / deleted
 * @throws {Error} If the export log is not found or was soft-deleted
 */
export async function get__communityPlatform_adminUser_dataExportLogs_$dataExportLogId(props: {
  adminUser: AdminuserPayload;
  dataExportLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformDataExportLog> {
  const { adminUser, dataExportLogId } = props;

  // Fetch the log by ID, ensuring not soft-deleted
  const log =
    await MyGlobal.prisma.community_platform_data_export_logs.findFirst({
      where: { id: dataExportLogId, deleted_at: null },
    });
  if (!log) {
    throw new Error("Data export log not found or has been deleted.");
  }

  return {
    id: log.id,
    member_user_id: log.member_user_id ?? undefined,
    admin_user_id: log.admin_user_id ?? undefined,
    export_type: log.export_type,
    export_format: log.export_format,
    requested_ip: log.requested_ip,
    status: log.status,
    created_at: toISOStringSafe(log.created_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  };
}
