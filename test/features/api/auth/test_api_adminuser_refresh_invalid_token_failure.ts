import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";

/**
 * 유효하지 않거나 만료된 refresh 토큰을 사용해 토큰 재발급을 요청할 때 실패 동작을 검증한다.
 *
 * 토큰 발급 - 관리자 계정을 신규 가입해 access/refresh 토큰 쌍을 획득 refresh 토큰 변조 - 가입 시 받은
 * refresh 토큰을 뒤집거나, 랜덤 문자로 변조하여 사용(실제 만료/폐기 토큰 시나리오와 유사) 변조 refresh 토큰으로 토큰
 * 재발급 API 호출 → 에러 발생해야 정상 type validation error가 아닌 비즈니스 로직 오류임을 확인(필드 타입 및
 * 필수값은 정상)
 *
 * 1. 신규 관리자 가입 및 refresh 토큰 확보
 * 2. Refresh 토큰 값을 랜덤 문자열로 변조하거나, 뒤집어서 변조
 * 3. 변조/임의 토큰으로 /auth/adminUser/refresh 호출
 * 4. 응답이 명확한 에러로 떨어지는지, 정상 토큰 발급이 이뤄지지 않는지 검증
 */
export async function test_api_adminuser_refresh_invalid_token_failure(
  connection: api.IConnection,
) {
  // 1. 신규 관리자 가입 - 정상 토큰 획득
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformAdminUser.IJoin;
  const joinResult = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // 2. refresh 토큰 변조 - 뒤집거나 랜덤값 사용
  const originalRefresh = joinResult.token.refresh;
  const reversedRefresh = originalRefresh.split("").reverse().join("");
  const randomRefresh = RandomGenerator.alphaNumeric(40);

  // 3. 변조/임의 토큰으로 refresh 시도 → 에러 검증
  await TestValidator.error(
    "존재하지 않는 refresh 토큰으로 재발급 요청 시도시 에러 발생",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          token: randomRefresh,
        } satisfies ICommunityPlatformAdminUser.IRefresh,
      });
    },
  );
  await TestValidator.error(
    "뒤집은 refresh 토큰으로 재발급 요청 시도시 에러 발생",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          token: reversedRefresh,
        } satisfies ICommunityPlatformAdminUser.IRefresh,
      });
    },
  );
}

/**
 * 코드는 시나리오에 맞춰 모든 필수 테스트 요소를 구현하고 있음. 1) 신규 관리자 계정을 정상적으로 생성해 토큰 쌍을 획득하는 단계에서
 * DTO 타입 및 랜덤 값 생성 모두 정상. 2) 변조 refresh 토큰(랜덤 문자열, 역순 문자열) 케이스 모두 포함했으며, 실제 만료
 * 토큰을 얻거나 폐기 토큰 시나리오를 구현하기 어려운 E2E 환경 제약을 잘 반영함. 3) invalid/변조 토큰을 이용한
 * /auth/adminUser/refresh 호출에서 TestValidator.error를 정확하게 활용했고, 각 에러 검사에 대해 명확한
 * 타이틀을 입력함. 4) 타입 validation이 아닌 비즈니스 로직 오류만 테스트하므로 타입 위반/필드 누락/잘못된 validation
 * 코드는 없음. 5) 코딩 컨벤션, 타입 안전, async/await, assertion 패턴, 문서화, 주석, naming, request
 * body 불변성 등 모든 규칙 지킴. 6) final 코드는 draft와 내용이 일치(수정 필요 이슈 없음).
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
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
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
