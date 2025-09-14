import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validates successful deletion of a community rule by the owning adminUser.
 *
 * 1. Register an adminUser (join)
 * 2. Create a community platform category
 * 3. Create a community owned by this adminUser
 * 4. Add a rule to the created community
 * 5. Delete the rule as the owner
 * 6. Confirm the deletion completed without error (API returns void, business
 *    logic allows owner to delete)
 */
export async function test_api_admin_user_delete_own_community_rule(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinOutput: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: adminEmail,
        password: "supersecret",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformAdminUser.IJoin,
    });
  typia.assert(joinOutput);

  // 2. Create category
  const categoryInput = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 3. Create community as the adminUser
  const communityInput = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    category_id: category.id,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: undefined,
    banner_uri: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.adminUser.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // 4. Add rule to the created community
  const ruleInput = {
    rule_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.adminUser.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleInput,
      },
    );
  typia.assert(rule);

  // 5. Delete the rule as owner (admin)
  await api.functional.communityPlatform.adminUser.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );
}

/**
 * All rules and checklist items are confirmed as satisfied. The draft strictly
 * follows the template's import rules and function structure, only modifying
 * the implementation area. All API calls use proper await, correct DTO types,
 * and are type-checked with typia.assert (except for erase, which returns
 * void). Random data generation uses the provided generators.
 * Nullable/undefined handling is correctly applied for optional description,
 * logo_uri, and banner_uri fields. Business logic and workflow are sequentially
 * and logically ordered: admin join ---> category creation ---> community
 * creation by admin ---> add rule ---> delete rule by owner. No type error
 * testing occurs. No missing required fields or DTO confusion. All
 * TestValidator functions that would be needed (here, only for type validation)
 * are correctly ordered with required parameters and descriptive use (note:
 * here, no custom assertion logic is necessary due to the void return on
 * erase). The entire code block is compliant and requires no modifications for
 * the final version.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O NO compilation errors
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O Proper async/await usage
 *   - O NO response type validation after typia.assert()
 *   - O NO illogical operations
 *   - O NO DTO type confusion
 *   - O NO missing required fields
 *   - O NO touch connection.headers in any way
 *   - O Step 4 revise COMPLETED: review+final
 */
const __revise = {};
__revise;
