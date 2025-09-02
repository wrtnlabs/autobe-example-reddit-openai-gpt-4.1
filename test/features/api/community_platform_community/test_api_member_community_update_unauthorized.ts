import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Validate that non-owners cannot update a community.
 *
 * This test ensures that the platform enforces proper authorization and
 * community ownership for update operations. It follows a multi-actor
 * flow:
 *
 * 1. Register admin and login for category creation (so the test can create a
 *    fresh category).
 * 2. Register the first member and login.
 * 3. Create a community category as the admin, capturing categoryId.
 * 4. Login as the first member and create a community using the admin-created
 *    category, capture communityId.
 * 5. Register and login a second member, switching context to this new user.
 * 6. Attempt to update the previously created community with valid body (e.g.,
 *    changing display_title, description), but as non-owner.
 * 7. Validate that the update operation fails with an authorization or
 *    forbidden error.
 *
 * Steps ensure JWT/Authorization tokens are utilized per role, and that
 * only an owner (or an admin, not tested here) may update a community.
 */
export async function test_api_member_community_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new admin (needed for category creation)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234Test!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as admin (ensures Authorization header is for admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 3. Create a new category (admin-only)
  const categoryData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // 4. Register the first member and login (switch Authorization to member)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "pwMember1!";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 5. Create a new community as the first member
  const communityData = {
    category_id: category.id,
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    // logo_uri, banner_uri는 undefined로 생략
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 6. Register the second member, switching Authentication context
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "pwMember2!";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 7. Login as the second member to perform unauthorized update
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 8. Attempt to update the first member's community as the second member
  const updateData = {
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    // logo_uri, banner_uri는 undefined로 생략
    category_id: category.id,
  } satisfies ICommunityPlatformCommunity.IUpdate;
  await TestValidator.error("non-owner update must be forbidden", async () => {
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateData,
      },
    );
  });
}
