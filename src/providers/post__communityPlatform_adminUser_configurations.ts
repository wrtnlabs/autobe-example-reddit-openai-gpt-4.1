import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new platform configuration parameter (admin only).
 *
 * Creates a new configuration parameter in the
 * community_platform_configurations table, permitting platform operators/admins
 * to add new system settings, feature toggles, or operational parameters as
 * required by platform business logic.
 *
 * Access is restricted to authenticated adminUser roles. Enforces unique key
 * constraint. Throws an error if a duplicate key is attempted. Sets audit
 * timestamps and assigns a generated UUID.
 *
 * @param props - The parameter object
 * @param props.adminUser - Authenticated adminUser payload
 * @param props.body - Configuration parameter input (key, value, description)
 * @returns The created configuration parameter record
 * @throws {Error} When a configuration with the given key already exists or DB
 *   error occurs
 */
export async function post__communityPlatform_adminUser_configurations(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformConfiguration.ICreate;
}): Promise<ICommunityPlatformConfiguration> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.community_platform_configurations.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          key: body.key,
          value: body.value,
          description: body.description ?? null,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error("A configuration with this key already exists.");
    }
    throw err;
  }
}
