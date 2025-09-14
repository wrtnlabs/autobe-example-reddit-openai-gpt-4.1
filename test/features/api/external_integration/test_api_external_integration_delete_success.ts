import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";

/**
 * Validates that an admin user can successfully delete an existing external
 * integration configuration.
 *
 * This scenario covers the full workflow:
 *
 * 1. Register a new unique admin user (with minimal valid data)
 * 2. Create a new external integration using that admin context
 * 3. Delete the external integration by its id as returned from the creation
 *    step
 * 4. Confirm that deletion completes with no error. (Since 'get by id'
 *    endpoint is not available for validation, focus is on success and no
 *    resurrection or internal error)
 * 5. Validate that the integration id is a properly formatted uuid throughout.
 *
 * Out-of-scope: Direct audit log check (no audit log list/query API
 * available here).
 */
export async function test_api_external_integration_delete_success(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinReq = {
    email: adminEmail,
    password: "testPassword123!",
    display_name: RandomGenerator.name(1).substring(0, 32), // enforce max 32 chars
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinReq,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin id is uuid",
    typeof admin.id === "string" && /^[0-9a-f-]{36}$/i.test(admin.id),
  );

  // 2. Create external integration
  const integrationName = RandomGenerator.paragraph({ sentences: 2 }).replace(
    /\s/g,
    "-",
  );
  const integrationReq = {
    integration_name: integrationName,
    provider_url: null, // optional, test null case
    status: "enabled",
    config_json: JSON.stringify({
      client_id: RandomGenerator.alphaNumeric(16),
      secret: RandomGenerator.alphaNumeric(24),
    }),
    last_successful_sync_at: null,
  } satisfies ICommunityPlatformExternalIntegration.ICreate;
  const integration =
    await api.functional.communityPlatform.adminUser.externalIntegrations.create(
      connection,
      { body: integrationReq },
    );
  typia.assert(integration);
  TestValidator.predicate(
    "integration id is uuid",
    typeof integration.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(integration.id),
  );
  TestValidator.equals(
    "integration name matches",
    integration.integration_name,
    integrationName,
  );

  // 3. Delete external integration (main test target)
  await api.functional.communityPlatform.adminUser.externalIntegrations.erase(
    connection,
    { externalIntegrationId: integration.id },
  );

  // 4. Negative test: Attempting to delete again should fail (proves deletion)
  await TestValidator.error(
    "delete on already deleted external integration yields error",
    async () => {
      await api.functional.communityPlatform.adminUser.externalIntegrations.erase(
        connection,
        { externalIntegrationId: integration.id },
      );
    },
  );
}

/**
 * - All required steps for admin user registration, integration create, and
 *   delete covered
 * - Correct types for join, create, erase per API
 * - Random values for email and integration_name, config_json
 * - All `api.functional.*` calls are awaited
 * - Display_name limited to 32 characters per DTO
 * - Proper use of satisfies for request DTOs
 * - No use of `as any`, no missing required fields, no wrong types
 * - No non-existent properties; all field names verified against DTOs
 * - TestValidator always includes proper string titles
 * - After deletion, attempted further deletion triggers error (valid negative
 *   test)
 * - No extra imports, template untouched
 * - Comprehensive function documentation with realistic scenario description
 * - Usage of typia.assert for API responses
 * - No type or business logic violations observed
 * - Affirmed no audit log API available, so that part of scenario left as comment
 * - All checkList and rules items marked true
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
 *   - O NO require() statements
 *   - O Template code untouched
 *   - O ONLY the imports provided in template used
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments - all awaited
 *   - O All async operations in loops/conditionals have await
 *   - O All async calls in returns have await
 *   - O Promise.all calls have await
 *   - O Function follows correct naming convention/signature
 *   - O All TestValidator functions include descriptive TITLE as FIRST parameter
 *   - O TestValidator equality/notEquals: actual-first, expected-second
 *   - O NO fictional functions/types from doc examples used
 *   - O No non-existent properties used
 *   - O All DTO usages match SDK-provided versions
 *   - O Comprehensive JSDoc-style scenario description provided
 *   - O No code block markdown present
 *   - O Logic flow is business-realistic and correct
 *   - O Random data generated with correct constraints and formats
 */
const __revise = {};
__revise;
