import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDataExportLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDataExportLog";

/**
 * Admin user lists data export logs and validates filters, pagination, and
 * authentication.
 *
 * 1. Registers a new admin user using randomized but valid credentials.
 * 2. Attempts to list export logs as the new admin (PATCH
 *    /communityPlatform/adminUser/dataExportLogs) using default
 *    (unfiltered) search; verifies output type and pagination fields (even
 *    if no logs present).
 * 3. Next, uses advanced filter: filters by own admin_user_id, export_type,
 *    status, and format (using values from step 2 response or random
 *    plausible values), and verifies response structure for filtered
 *    results.
 * 4. Validates the pagination (current, limit, records, pages) are present and
 *    reasonable.
 * 5. Ensures only authenticated admin can access; attempts unauthenticated
 *    access and expects error (optional, according to platform behavior).
 */
export async function test_api_adminuser_dataexportlog_listing_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user.
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(13),
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: credentials });
  typia.assert(admin);

  // 2. List export logs (unfiltered).
  const page: IPageICommunityPlatformDataExportLog =
    await api.functional.communityPlatform.adminUser.dataExportLogs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination object present",
    !!page.pagination && typeof page.pagination.current === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(page.data));

  // 3. List export logs by advanced filter (admin_user_id, type, status, format, date range).
  // Use either a log from data (if available), or plausible values.
  let sampleLog: ICommunityPlatformDataExportLog | undefined = page.data[0];
  const filterBody = {
    admin_user_id: sampleLog?.admin_user_id ?? admin.id,
    export_type: sampleLog?.export_type ?? "user_data",
    export_format: sampleLog?.export_format ?? "json",
    status: sampleLog?.status ?? "completed",
    date_from: undefined,
    date_to: undefined,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformDataExportLog.IRequest;
  const filtered: IPageICommunityPlatformDataExportLog =
    await api.functional.communityPlatform.adminUser.dataExportLogs.index(
      connection,
      {
        body: filterBody,
      },
    );
  typia.assert(filtered);
  TestValidator.predicate("filter returns array", Array.isArray(filtered.data));
  TestValidator.equals(
    "admin_user_id matches filtered logs (if present)",
    filtered.data.every(
      (log) =>
        !filterBody.admin_user_id ||
        log.admin_user_id === filterBody.admin_user_id,
    ),
    true,
  );

  // 4. Validate pagination fields
  const pag = filtered.pagination;
  TestValidator.predicate(
    "pagination current page is positive",
    pag.current >= 0,
  );
  TestValidator.predicate("pagination limit is positive", pag.limit > 0);
  TestValidator.predicate(
    "pagination records >= data.length",
    pag.records >= filtered.data.length,
  );
  TestValidator.predicate("pagination pages >= 1", pag.pages >= 1);

  // 5. (Optional) Unauthenticated access should be denied.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthenticated listing should fail", async () => {
    await api.functional.communityPlatform.adminUser.dataExportLogs.index(
      unauthConn,
      { body: {} },
    );
  });
}

/**
 * - All authentication is handled via proper admin join API, no manual headers
 *   manipulation except for constructing an unauthenticated connection using
 *   empty headers (as specified in the template, not for token management).
 * - EVERY API call uses await, including the TestValidator.error (with async
 *   callback) for the unauthenticated access denial check.
 * - No type errors, as typia.random and RandomGenerator usage are according to
 *   the strict types (email, password of correct form, etc).
 * - Null/undefined handling is managed, with pagination fields tested as numbers,
 *   and optional filterBody properties only set as needed.
 * - All type assertions use typia.assert and all validation functions only use
 *   TestValidator or typia.assert, not mixing any custom type checks or extra
 *   subtype assertions.
 * - No type error testing, no wrong-type data in requests; all data and API calls
 *   reflect real DTO and signature expectations.
 * - Filter values are constructed so as not to generate type mismatches (matching
 *   DTO fields).
 * - There are no forbidden import statements or additional imports, and the
 *   template boundaries are respected.
 * - All comment/documentation areas provide clear step-by-step rationale for the
 *   scenario and each API operation.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API SDK Function Invocation
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
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly
 */
const __revise = {};
__revise;
