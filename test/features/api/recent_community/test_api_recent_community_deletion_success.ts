import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";

/**
 * Test the successful deletion of a recent community navigation entry from a
 * member user's list.
 *
 * This E2E test validates the business workflow for removing a community from a
 * member user's recent navigation list.
 *
 * Steps:
 *
 * 1. Register a member user and authenticate.
 * 2. Register an admin user and authenticate.
 * 3. Create a new category as the admin user.
 * 4. Login as the member user.
 * 5. Create a community as the member user with the created category.
 * 6. As the member user, add the new community to recent communities.
 * 7. Delete the recent community entry using its id.
 * 8. Verify API returns no error and void result (undefined) for the deletion.
 */
export async function test_api_recent_community_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberDisplayName = RandomGenerator.name();

  const memberUser = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberUser);

  // 2. Register and authenticate as an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminDisplayName = RandomGenerator.name();

  const adminUser = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminUser);

  // 3. As admin, create a category
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const displayOrder = typia.random<number & tags.Type<"int32">>();
  const categoryDesc = RandomGenerator.paragraph({ sentences: 2 });
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          display_order: displayOrder,
          description: categoryDesc,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch to member user (login)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 5. As member user, create a new community under the created category
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const communityDesc = RandomGenerator.paragraph({ sentences: 2 });
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          category_id: category.id,
          description: communityDesc,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Add community to recent communities
  const recentCommunity =
    await api.functional.communityPlatform.memberUser.recentCommunities.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformRecentCommunity.ICreate,
      },
    );
  typia.assert(recentCommunity);

  // 7. Delete the recent community
  const result =
    await api.functional.communityPlatform.memberUser.recentCommunities.erase(
      connection,
      {
        recentCommunityId: recentCommunity.id,
      },
    );
  TestValidator.equals("erase returns void (undefined)", result, undefined);
}

/**
 * - Imports and usage are correct, only using what is provided in the template.
 * - TestValidator.equals is used for the void (undefined) check after deletion.
 * - All steps are annotated/logically ordered, with realistic business scenario
 *   steps and switching of authenticated user context.
 * - No additional helper imports or mutation of connection.headers.
 * - Random data is generated using RandomGenerator and typia.random with correct
 *   tags/constraints.
 * - There are no type error tests, wrong types, or invalid DTO usage.
 * - The function parameters and response types are strictly correct.
 * - All API calls have await and use correct parameter structures.
 * - No missing awaits, no missing required API steps, and all DTO properties used
 *   exactly match those in the provided definitions.
 * - No type bypass with 'as any', no omissions in null/undefined handling.
 * - Comments and step breakdown are appropriate and explain why each action is
 *   needed.
 * - Step 4 revise is thorough. No errors left to fix.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O CRITICAL: All TestValidator functions include title as FIRST parameter
 *   - O Step 4 revise COMPLETED
 */
const __revise = {};
__revise;
