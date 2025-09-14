import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

export async function post__auth_memberUser_join(props: {
  body: ICommunityPlatformMemberUser.IJoin;
}): Promise<ICommunityPlatformMemberUser.IAuthorized> {
  const { body } = props;
  // Step 1: Check for existing credential with the same email, only if not deleted
  const existing =
    await MyGlobal.prisma.community_platform_user_credentials.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });
  if (existing) throw new Error("Duplicate email");

  // Step 2: Hash password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Step 3: Prepare IDs and timestamps (ISO format)
  const credential_id = v4() as string & tags.Format<"uuid">;
  const member_id = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 4: Create credentials
  await MyGlobal.prisma.community_platform_user_credentials.create({
    data: {
      id: credential_id,
      email: body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Create member user
  const member = await MyGlobal.prisma.community_platform_memberusers.create({
    data: {
      id: member_id,
      user_credential_id: credential_id,
      display_name: body.display_name ?? null,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 6: Issue JWT tokens
  const accessToken = jwt.sign(
    { id: member_id, type: "memberUser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: member_id, type: "memberUser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Step 7: Set expiration timestamps as ISO date-time strings
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Step 8: Return API structure
  return {
    id: member_id,
    user_credential_id: credential_id,
    display_name: member.display_name ?? null,
    status: member.status,
    created_at: member.created_at ? toISOStringSafe(member.created_at) : now,
    updated_at: member.updated_at ? toISOStringSafe(member.updated_at) : now,
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
