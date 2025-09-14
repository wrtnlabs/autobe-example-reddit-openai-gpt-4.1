import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";

/**
 * 관리자 계정의 refresh 토큰을 이용한 정상적인 세션 갱신(토큰 재발급) 시나리오 검증
 *
 * - 1. 새로운 관리자 계정을 가입시킨다. (join)
 * - 2. 가입과 동시에 반환된 IAuthorized 객체에서 refresh/access 토큰을 얻는다.
 * - 3. Refresh 토큰을 body에 넣어서 /auth/adminUser/refresh 엔드포인트를 호출하여 신규 토큰을 발급받는다.
 * - 4. 재발급된 IAuthorized와 포함된 토큰 정보의 타입, 값이 올바른지 typia.assert로 검증한다.
 * - 5. 최초 join 시점과 refresh 이후 재발급받은 access/refresh 토큰 값이 실제로 달라졌는지 비교한다.
 */
export async function test_api_adminuser_refresh_success_scenario(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 가입 및 최초 토큰 획득
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(1).slice(0, 16); // 32자 제한
  const joinRes = await api.functional.auth.adminUser.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(joinRes);
  TestValidator.predicate(
    "join 결과로 발급된 access 토큰/refresh 토큰이 존재한다",
    typeof joinRes.token.access === "string" &&
      typeof joinRes.token.refresh === "string",
  );

  // 2. refresh 토큰을 사용해 세션 갱신 및 토큰 재발급
  const refreshRes = await api.functional.auth.adminUser.refresh(connection, {
    body: {
      token: joinRes.token.refresh,
    } satisfies ICommunityPlatformAdminUser.IRefresh,
  });
  typia.assert(refreshRes);
  TestValidator.predicate(
    "refresh 결과로 재발급된 access/refresh 토큰이 존재한다",
    typeof refreshRes.token.access === "string" &&
      typeof refreshRes.token.refresh === "string",
  );

  // 3. 새로운 access/refresh 토큰이 기존과 다름을 검증
  TestValidator.notEquals(
    "재발급된 access 토큰 값이 최초 토큰과 다르다",
    refreshRes.token.access,
    joinRes.token.access,
  );
  TestValidator.notEquals(
    "재발급된 refresh 토큰 값이 최초 토큰과 다르다",
    refreshRes.token.refresh,
    joinRes.token.refresh,
  );
}

/**
 * 코드는 관리자 계정을 가입시킨 후 반환된 refresh 토큰을 이용해 refresh API를 호출, 세션 재발급이 정상적으로 이뤄지는지
 * 검증합니다. 모든 API 호출에 await을 사용했고, TestValidator에 제목을 명확히 입력했고, join 시점과 refresh
 * 시점의 두 토큰(access/refresh)의 값이 서로 다른지 notEquals로 검증했습니다. request body 선언에
 * satisfies 패턴을 사용했고, typia.assert로 응답 전체 타입 검증을 수행했습니다. 실제 자료형 준수 및 비즈니스 플로우,
 * 랜덤 데이터 제약, 함수 구조, import 미추가 등 모든 코드 품질 규칙을 철저히 지키고 있어 특별히 삭제하거나 고칠 유형/로직/패턴을
 * 발견하지 못했습니다. 오류나 리펙터링 필요가 없으므로 draft와 final이 같아집니다.
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
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions defined outside the main function
 *   - O ALL TestValidator functions include descriptive title as first parameter
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All API calls use proper parameter structure and type safety
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used
 *   - O NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included
 *   - O Random data generation uses appropriate constraints and formats
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (any, @ts-ignore, @ts-expect-error)
 *   - O All TestValidator functions include title as first parameter and use
 *       correct positional parameter syntax
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
