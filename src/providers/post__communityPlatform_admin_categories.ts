import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new community category for sub-community classification.
 *
 * Allows admin users to create a new category entity for organizing
 * sub-communities. Requires a unique code, unique name, and a human-readable
 * display name. Optionally, an admin may set a long-form description. The
 * system enforces uniqueness of code and name in the
 * 'community_platform_categories' table. If a code or name is already in use,
 * this operation returns a 409 conflict error.
 *
 * All entries are tracked for audits with an immutable creation timestamp and a
 * current updated timestamp.
 *
 * Admin privilege is mandatory and validated by the controller decorator.
 *
 * @param props - Provider properties
 * @param props.admin - Authenticated admin user context
 * @param props.body - Category creation input ({ code, name, description })
 * @returns Newly created community category entity with all populated fields
 * @throws {Error} If the category code or name already exists (409 conflict)
 * @throws {Error} On database or system error
 */
export async function post__communityPlatform_admin_categories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCategory.ICreate;
}): Promise<ICommunityPlatformCategory> {
  const { admin, body } = props;
  // Authorization is handled at the controller/decorator layer

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  try {
    const created = await MyGlobal.prisma.community_platform_categories.create({
      data: {
        id,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    // Handle unique constraint violation (Prisma error code "P2002")
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      // TypeScript limitation: no type assertions, but we can check for code string
      (err as { code?: string }).code === "P2002"
    ) {
      const conflictError = new Error("Category code or name already exists");
      (conflictError as any).status = 409;
      throw conflictError;
    }
    throw err;
  }
}
