import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new system-wide configuration parameter.
 *
 * This operation allows an admin user to create a new configuration record in
 * the community_platform_configurations table. Only admins are authorized. Key
 * uniqueness is enforced; attempts to create with a duplicate key will throw an
 * error. All timestamps are set to current and properly formatted. The full
 * configuration object is returned.
 *
 * @param props - Properties including:
 *
 *   - Admin: The authenticated admin payload.
 *   - Body: Information for configuration creation (key, value, optional
 *       description).
 *
 * @returns The complete configuration object as confirmation.
 * @throws {Error} When a configuration with the same key already exists (unique
 *   constraint violation).
 */
export async function post__communityPlatform_admin_configurations(props: {
  admin: AdminPayload;
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
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: null,
    };
  } catch (err: unknown) {
    // Check for Prisma unique constraint error: duplicate key
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("A configuration with this key already exists.");
    }
    throw err;
  }
}
