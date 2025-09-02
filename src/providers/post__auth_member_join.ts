import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Register a new member account (community_platform_members) and issue login
 * tokens.
 *
 * This endpoint allows public users to create new member accounts for the
 * community platform. It enforces unique email addresses, securely hashes
 * passwords, and issues JWT tokens upon registration. Validation ensures
 * password complexity and uniqueness of email.
 *
 * @param props - The request payload containing email, password, and optional
 *   display_name.
 * @returns The authorized member object and initial JWT tokens
 * @throws {Error} If email is already registered
 * @throws {Error} If password does not meet complexity requirements
 */
export async function post__auth_member_join(props: {
  body: ICommunityPlatformMember.ICreate;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { body } = props;

  // Step 1: Check for duplicate email
  const existing = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { email: body.email },
  });
  if (existing) {
    throw new Error("Email is already registered");
  }

  // Step 2: Enforce password policy - minimum 8, at least one letter and one number
  const pw = body.password;
  const hasMinLength = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  if (!hasMinLength || !hasLetter || !hasNumber) {
    throw new Error(
      "Password does not meet minimum complexity requirements. Must be at least 8 characters, including at least one letter and one number.",
    );
  }

  // Step 3: Hash the password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Step 4: Create the member
  const now = toISOStringSafe(new Date());
  const memberId = v4();
  const member = await MyGlobal.prisma.community_platform_members.create({
    data: {
      id: memberId,
      email: body.email,
      password_hash,
      display_name: body.display_name !== undefined ? body.display_name : null,
      is_active: true,
      created_at: now,
      updated_at: now,
      // last_login_at, deleted_at: let DB null fields remain as default
    },
  });

  // Step 5: JWT Token generation
  const accessExp = Math.floor(Date.now() / 1000) + 60 * 60; // 1h
  const refreshExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7d
  const access = jwt.sign(
    {
      id: member.id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      id: member.id,
      type: "member",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Build and return result
  return {
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(new Date(accessExp * 1000)),
      refreshable_until: toISOStringSafe(new Date(refreshExp * 1000)),
    },
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      is_active: member.is_active,
      last_login_at: null,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: null,
    },
  };
}
