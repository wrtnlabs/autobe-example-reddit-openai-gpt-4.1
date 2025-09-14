import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCredential";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserCredential";

/**
 * Validate admin user ability to retrieve the credentials list, with pagination
 * and email filtering.
 *
 * 1. Register an admin user (this authenticates admin context and creates a user
 *    credential).
 * 2. List user credentials as admin: ensure the created credential appears in the
 *    results.
 * 3. List user credentials with email filter: confirm only the entry for
 *    registered admin is listed.
 * 4. Try listing credentials without prior authentication (should result in an
 *    error or empty data).
 */
export async function test_api_user_credential_list_search(
  connection: api.IConnection,
) {
  // 1. Register an admin user (join)
  const testEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: testEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const adminAuth: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. List credentials paginated as admin
  const listAllResp =
    await api.functional.communityPlatform.adminUser.userCredentials.index(
      connection,
      { body: {} satisfies ICommunityPlatformUserCredential.IRequest },
    );
  typia.assert(listAllResp);
  TestValidator.predicate(
    "Should contain at least one credential",
    listAllResp.data.length >= 1,
  );
  TestValidator.predicate(
    "Admin's credential is listed",
    listAllResp.data.some((cred) => cred.email === testEmail),
  );

  // 3. Filtered list by email
  const filterBody = {
    email: testEmail,
  } satisfies ICommunityPlatformUserCredential.IRequest;
  const filterResp =
    await api.functional.communityPlatform.adminUser.userCredentials.index(
      connection,
      { body: filterBody },
    );
  typia.assert(filterResp);
  TestValidator.equals(
    "Filtered list has one credential for admin",
    filterResp.data.length,
    1,
  );
  TestValidator.equals(
    "Credential email matches filter",
    filterResp.data[0].email,
    testEmail,
  );

  // 4. Try listing with unauthenticated connection (simulate non-admin)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthenticated request is denied", async () => {
    await api.functional.communityPlatform.adminUser.userCredentials.index(
      unauthConn,
      { body: {} satisfies ICommunityPlatformUserCredential.IRequest },
    );
  });
}

/**
 * The draft implementation satisfies all critical requirements: it only uses
 * allowed imports, follows the template, starts with join (admin
 * registration/auth), captures the issued email for later filtering, and
 * exercises the search endpoint both generally and with filtering. All API
 * calls use await. typia.assert() validates types for all API responses. The
 * list-all step asserts the new credential appears. The filter-by-email step
 * asserts only one credential and that its email matches. The unauthenticated
 * connection is created (with headers: {}), and error assertion is performed
 * with async/await usage. No DTO confusion, no missing awaits, no missing
 * required data, and no forbidden patterns like type error testing. All
 * variable declarations use const, data generation uses approved tools, and
 * TestValidator calls use descriptive titles. This code is clean, logical,
 * business-realistic, and compilation-error-free. No changes are required for
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
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O Proper async/await usage
 *   - O ALL TestValidator functions include descriptive title as FIRST parameter
 *   - O Compilation-error-free
 */
const __revise = {};
__revise;
