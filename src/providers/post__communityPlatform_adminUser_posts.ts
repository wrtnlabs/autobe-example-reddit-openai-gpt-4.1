import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new post in community_platform_posts by providing the post details
 * and community association.
 *
 * This operation creates a new post record in the community_platform_posts
 * table on behalf of an authenticated adminUser. It verifies the admin account
 * is active, ensures the provided community exists and is not deleted, and
 * enforces all business validation rules, including content lengths and
 * normalization of the optional display name. The post is linked to the admin
 * user, is immediately visible in feeds, and returns the fully populated post
 * object on success.
 *
 * @param props - Request properties
 * @param props.adminUser - The authenticated admin user creating the post
 * @param props.body - New post data including community_platform_community_id,
 *   title, body, and optional display name
 * @returns The newly created post, including all persisted fields
 * @throws {Error} If admin is inactive or missing, community does not exist or
 *   is deleted, or validation fails
 */
export async function post__communityPlatform_adminUser_posts(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const { adminUser, body } = props;

  // 1. Verify admin account is active and not deleted
  const admin = await MyGlobal.prisma.community_platform_adminusers.findFirst({
    where: {
      id: adminUser.id,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!admin) throw new Error("Admin user is not active or does not exist");

  // 2. Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: body.community_platform_community_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) throw new Error("Community does not exist");

  // 3. Enforce title/body length constraints
  if (body.title.length < 5 || body.title.length > 120) {
    throw new Error("Title must be between 5 and 120 characters");
  }
  if (body.body.length < 10 || body.body.length > 10000) {
    throw new Error("Body must be between 10 and 10,000 characters");
  }

  // 4. Normalize author_display_name (set to 'Anonymous' if missing/blank)
  let authorDisplayName: string | undefined = undefined;
  if (body.author_display_name && body.author_display_name.trim().length > 0) {
    authorDisplayName = body.author_display_name.trim();
  } else {
    authorDisplayName = "Anonymous";
  }

  // 5. Prepare date/time fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const postId: string & tags.Format<"uuid"> = v4();

  // 6. Create the post record with all required/optional fields inline (no type assertions, inline defs)
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: postId,
      community_platform_community_id: body.community_platform_community_id,
      author_adminuser_id: adminUser.id,
      title: body.title,
      body: body.body,
      author_display_name: authorDisplayName,
      created_at: now,
      updated_at: now,
      // author_memberuser_id omitted (null/undefined, as it's for members)
      // deleted_at omitted (null by default)
    },
  });

  // 7. Return typed result (ensure all date fields use toISOStringSafe)
  return {
    id: created.id,
    community_platform_community_id: created.community_platform_community_id,
    author_adminuser_id: created.author_adminuser_id ?? undefined,
    title: created.title,
    body: created.body,
    author_display_name: created.author_display_name ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
