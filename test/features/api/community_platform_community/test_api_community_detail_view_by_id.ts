import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate viewing of community details by ID for an unauthenticated
 * visitor.
 *
 * 1. Register an admin user (for category creation).
 * 2. Login as admin and create a new category
 * 3. Register a member user (community owner)
 * 4. Login as member and create a community in the category
 * 5. As an unauthenticated visitor, fetch the created community by its ID and
 *    validate that all public information matches.
 * 6. Attempt to fetch a non-existent community ID and check error is raised.
 */
export async function test_api_community_detail_view_by_id(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinRes = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminJoinRes);

  // 2. Login as admin and create a new category
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  const categoryName = RandomGenerator.alphaNumeric(8);
  const categoryDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const categoryRes =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          display_order: categoryDisplayOrder,
          description: categoryDescription,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryRes);

  // 3. Register a member user (owner of community)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinRes = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberJoinRes);

  // 4. Login as member and create a community in the category
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  const communityName = RandomGenerator.alphaNumeric(10);
  const communityDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 8,
  });
  const logoUri = `https://logo.cdn/${RandomGenerator.alphaNumeric(10)}`;
  const bannerUri = `https://banner.cdn/${RandomGenerator.alphaNumeric(10)}`;
  const communityRes =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          category_id: categoryRes.id,
          description: communityDesc,
          logo_uri: logoUri,
          banner_uri: bannerUri,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityRes);

  // 5. As an unauthenticated visitor, fetch the community detail by id
  const visitorConn: api.IConnection = { ...connection, headers: {} };
  const detail = await api.functional.communityPlatform.communities.at(
    visitorConn,
    {
      communityId: communityRes.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("community id matches", detail.id, communityRes.id);
  TestValidator.equals(
    "owner id matches",
    detail.owner_id,
    communityRes.owner_id,
  );
  TestValidator.equals(
    "category id matches",
    detail.category_id,
    categoryRes.id,
  );
  TestValidator.equals("name matches", detail.name, communityName);
  TestValidator.equals(
    "description matches",
    detail.description,
    communityDesc,
  );
  TestValidator.equals("logo uri matches", detail.logo_uri, logoUri);
  TestValidator.equals("banner uri matches", detail.banner_uri, bannerUri);
  TestValidator.predicate("created date is defined", !!detail.created_at);
  TestValidator.predicate("updated date is defined", !!detail.updated_at);
  TestValidator.equals("no deleted_at", detail.deleted_at, null);

  // 6. Try fetching a non-existent communityId and expect an error
  const notFoundCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent community should error",
    async () => {
      await api.functional.communityPlatform.communities.at(visitorConn, {
        communityId: notFoundCommunityId,
      });
    },
  );
}

/**
 * The draft strictly follows the provided requirements: all data preparation
 * (admin/member registration, category/community creation) uses only documented
 * functions; session role switching is correct and uses login endpoints. All
 * validation employs TestValidator with proper titles, and typia.assert is used
 * on all responses for type enforcement. All parameters use provided DTOs/types
 * only. There is no use of non-existent properties or type errors. API calls
 * are all properly awaited and error conditions (fetching non-existent id) are
 * tested with await and correct error validation. No import statements are
 * modified. Only change: ensure detail.deleted_at is checked as null to align
 * with type (can be null). No issues detected, code is clean and correct.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.3. API SDK Function Invocation
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O EVERY api.functional.* call has await
 *   - O EVERY TestValidator.error(call) with async callback uses await
 *   - O Template code untouched except function block
 *   - O Uses only DTOs/types from provided materials
 *   - O No non-existent properties used
 *   - O TestValidator titles are descriptive and correct
 */
const __revise = {};
__revise;
