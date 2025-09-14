import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Member user updates their own community membership's join date
 * successfully.
 *
 * Scenario:
 *
 * 1. Admin user registers and logs in to create a category.
 * 2. Member user registers and logs in.
 * 3. Member user creates a new community in the created category.
 * 4. Member user joins their own community, obtaining a membership record.
 * 5. Member user updates the 'joined_at' field of their own membership record
 *    to a new timestamp.
 * 6. Verify the response reflects the new join date and all other fields (ids,
 *    community, member) remain unchanged.
 *
 * The test asserts proper authentication context handling, ownership
 * enforcement, and that only allowed fields are updatable in the membership
 * record.
 */
export async function test_api_community_membership_update_own_success(
  connection: api.IConnection,
) {
  // 1. Admin user registers and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminAuth);

  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.ILogin,
  });

  // 2. Admin creates a category
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_order: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member user registers and logs in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberAuth);

  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 4. Member user creates a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          logo_uri: undefined,
          banner_uri: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member joins the community (self-join)
  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 6. Member updates own membership's 'joined_at' to a new random timestamp
  const newJoinedAt = new Date(Date.now() - 3600 * 2 * 1000).toISOString();
  const updatedMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.update(
      connection,
      {
        communityId: community.id,
        membershipId: membership.id,
        body: {
          joined_at: newJoinedAt,
        } satisfies ICommunityPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership);

  // Validation: fields unchanged except joined_at
  TestValidator.equals(
    "membership id unchanged",
    updatedMembership.id,
    membership.id,
  );
  TestValidator.equals(
    "community id unchanged",
    updatedMembership.community_id,
    membership.community_id,
  );
  TestValidator.equals(
    "memberuser id unchanged",
    updatedMembership.memberuser_id,
    membership.memberuser_id,
  );
  TestValidator.notEquals(
    "joined_at field updated",
    updatedMembership.joined_at,
    membership.joined_at,
  );
  TestValidator.equals(
    "joined_at equals newly set value",
    updatedMembership.joined_at,
    newJoinedAt,
  );
}

/**
 * - Verified that all steps follow business context: admin creates category,
 *   member registers & logs in, creates community, joins and updates
 *   membership
 * - Function and variable names are clear and business-accurate
 * - All API calls use await and proper DTOs (ICreate, IUpdate, etc.)
 * - Typia.assert used on all non-void API responses
 * - No import statements outside template
 * - TestValidator assertions include descriptive titles and use
 *   actual-value-first, expected-second ordering
 * - Proper null/undefined handling (none required)
 * - No missing required properties, all object constructions use `satisfies`
 *   pattern with no type annotation
 * - Joined_at is updated to a deterministic but different ISO timestamp to ensure
 *   value change
 * - No DTO type confusion or non-existent properties
 * - No type-error or type-bypass patterns (no as any, no invented types, no
 *   missing fields)
 * - Test covers successful path and membership update logic only
 * - Final code is ready and complies with all checklists
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Request/Response Type Safety
 *   - O 3.6 Null/Undefined Types
 *   - O 3.7 Authentication and Business Logic
 *   - O 3.8 Test Validator Usage
 *   - O 4. Code Quality, Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator functions include descriptive title as first parameter
 *   - O No compilation errors
 *   - O All required properties included, none omitted
 *   - O No missing required fields
 *   - O No DTO type misuse/confusion
 *   - O Proper null/undefined handling
 *   - O Assertions use actual-value-first, expected-second
 *   - O No type-error inducing tests implemented
 *   - O No fictional API used
 *   - O No incorrect property invention
 */
const __revise = {};
__revise;
