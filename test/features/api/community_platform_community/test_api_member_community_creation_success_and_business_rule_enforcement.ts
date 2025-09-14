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
 * Validates member user community creation (success and business rule
 * enforcement).
 *
 * This test implements the entire workflow:
 *
 * 1. Register and login as an admin user to create a new category.
 * 2. Create a new community category as admin—capture category_id.
 * 3. Register a member user and login as member (role switch).
 * 4. Create a community using all required/optional fields, referencing the
 *    created category; expect success and validate returned data matches
 *    input (excluding immutable fields).
 * 5. Attempt to create another community with the same name (test uniqueness)
 *    and expect failure.
 * 6. Try creating a community with an invalid name (e.g., too short, invalid
 *    chars); expect failure.
 * 7. Try non-existent category_id and expect failure.
 */
export async function test_api_member_community_creation_success_and_business_rule_enforcement(
  connection: api.IConnection,
) {
  // 1. Register and login as an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUser = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create category as admin
  const categoryName = RandomGenerator.alphabets(8) + "_catg";
  const categoryCreate = {
    name: categoryName,
    display_order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.adminUser.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // 3. Register & login as member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const memberUser = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMemberUser.IJoin,
  });
  typia.assert(memberUser);
  // Login as member to ensure context
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMemberUser.ILogin,
  });

  // 4. Create a community (happy path)
  const communityName = RandomGenerator.alphaNumeric(6) + "_comm";
  const communityCreate = {
    name: communityName,
    category_id: category.id,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    logo_uri: `https://logo.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
    banner_uri: `https://banner.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityCreate.name,
  );
  TestValidator.equals(
    "category id matches input",
    community.category_id,
    communityCreate.category_id,
  );
  TestValidator.equals(
    "description matches input",
    community.description,
    communityCreate.description,
  );
  TestValidator.equals(
    "logo_uri matches input",
    community.logo_uri,
    communityCreate.logo_uri,
  );
  TestValidator.equals(
    "banner_uri matches input",
    community.banner_uri,
    communityCreate.banner_uri,
  );

  // 5. Uniqueness: Attempt to create community with same name
  await TestValidator.error("community name must be unique", async () => {
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          ...communityCreate,
          category_id: category.id,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // 6. Name format: too short and invalid chars
  await TestValidator.error("community name too short", async () => {
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: "a$%",
          category_id: category.id,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // 7. Category reference does not exist
  await TestValidator.error(
    "category_id must reference existing category",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: {
            ...communityCreate,
            name: RandomGenerator.alphaNumeric(8) + "_comm2",
            category_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}

/**
 * Draft e2e test is structurally and conceptually sound and follows all
 * required business, structure, and type safety rules:
 *
 * - Comprehensive flow: Admin registration, admin category creation, member
 *   registration/login, community creation, and tested all business logic
 *   (uniqueness, format, reference constraint)
 * - API calls are made with correct parameter structure and DTO types, including
 *   use of satisfies and specific type for each request
 * - Makes use of typia.assert for response validation and proper, strong type
 *   assertions everywhere
 * - Proper async/await for all SDK and error test calls
 * - Follows template (no import changes), makes no illegal imports, and leverages
 *   only available tools
 * - Handles context switching for authentication (admin/member)
 * - All TestValidator calls have title as FIRST parameter
 * - No attempts at type validation errors, no type safety violations, and no use
 *   of as any
 * - Random value and string constraints are well-defined; correct and realistic
 *   test data generated
 * - Comprehensive scenario description in JSDoc, appropriately placed
 * - No missing awaits or business workflow logic gaps
 * - No business logic or placement errors detected
 * - Final checklist and all rules satisfied as per system requirements.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
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
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 4.12.1. ABSOLUTELY FORBIDDEN PATTERNS
 *   - O 4.12.2. WHY THIS IS ABSOLUTELY FORBIDDEN
 *   - O 4.12.3. WHAT TO DO INSTEAD
 *   - O 4.12.4. WHEN TEST SCENARIO REQUESTS TYPE ERROR TESTING - IGNORE IT
 *   - O 4.12.5. MANDATORY REVISE STEP ENFORCEMENT
 *   - O 4.12.6. CRITICAL REMINDERS
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
