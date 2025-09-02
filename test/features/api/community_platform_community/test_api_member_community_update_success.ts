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
 * Test a member updating metadata for their own community.
 *
 * Simulates the real-world scenario where a registered member (user) wishes
 * to edit the settings and metadata of the community they own. The flow
 * covers all major setup and mutation steps along with assertions for data
 * and audit changes.
 *
 * Steps:
 *
 * 1. Register a new member and authenticate.
 * 2. Register (join) an admin and authenticate as admin.
 * 3. Admin creates a community category (required field for community).
 * 4. Re-authenticate as the member.
 * 5. Create a new community as the member (they become owner).
 * 6. Prepare an update object (change display_title, description, logo,
 *    banner, and/or category).
 * 7. Call the update endpoint as the owner/member and assert result fields
 *    have changed as expected.
 * 8. Assert unchanged fields (e.g. owner_id, name) remain stable, and that the
 *    updated_at audit field has changed.
 */
export async function test_api_member_community_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name(2);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const memberId = memberJoin.member.id;

  // 2. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminDisplayName = RandomGenerator.name();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 3. Admin creates a community category
  const categoryReq = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryReq,
    });
  typia.assert(category);

  // 4. Re-authenticate as the member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 5. Member creates a community
  const originalCommunityReq = {
    category_id: category.id,
    name: RandomGenerator.alphaNumeric(7),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `https://logo.example.com/${RandomGenerator.alphaNumeric(8)}.png`,
    banner_uri: `https://banner.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: originalCommunityReq,
      },
    );
  typia.assert(createdCommunity);
  TestValidator.equals(
    "community owner is correct",
    createdCommunity.owner_id,
    memberId,
  );
  TestValidator.equals(
    "community name is as set",
    createdCommunity.name,
    originalCommunityReq.name,
  );

  // 6. Prepare valid update object (change display_title, description, logo, banner, and category)
  // Create a new category for change
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const categoryReq2 = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category2 =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryReq2,
    });
  typia.assert(category2);

  // Switch back to member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const updateReq = {
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `https://logo.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
    banner_uri: `https://banner.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
    category_id: category2.id,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  // 7. Call the update endpoint as the owner member
  const updated =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: createdCommunity.id,
        body: updateReq,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "display_title updated",
    updated.display_title,
    updateReq.display_title,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    updateReq.description,
  );
  TestValidator.equals(
    "logo_uri updated",
    updated.logo_uri,
    updateReq.logo_uri,
  );
  TestValidator.equals(
    "banner_uri updated",
    updated.banner_uri,
    updateReq.banner_uri,
  );
  TestValidator.equals(
    "category_id updated",
    updated.category_id,
    updateReq.category_id,
  );

  // 8. Validate non-editable fields are stable, and audit field updated
  TestValidator.equals(
    "owner_id unchanged",
    updated.owner_id,
    createdCommunity.owner_id,
  );
  TestValidator.equals(
    "name is immutable",
    updated.name,
    createdCommunity.name,
  );
  TestValidator.notEquals(
    "updated_at is changed after update",
    updated.updated_at,
    createdCommunity.updated_at,
  );
}
