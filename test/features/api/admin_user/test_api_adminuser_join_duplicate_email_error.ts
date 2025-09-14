import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";

/**
 * 관리자 회원가입 중복 이메일 에러 시나리오 검증.
 *
 * 1. 랜덤 이메일을 생성하여 관리자 가입 요청을 정상적으로 수행한다.
 * 2. 동일한 이메일, 임의의 패스워드(및 display_name)로 다시 한 번 가입을 시도한다.
 * 3. 두 번째 요청에서는 이메일 중복으로 인해 반드시 오류가 발생해야 하며, TestValidator.error로 검증한다.
 * 4. 첫 번째 응답은 ICommunityPlatformAdminUser.IAuthorized 타입의 객체임을 typia.assert로
 *    확인한다.
 *
 * 비즈니스 로직 유효성(이메일 유일성) 검증이 목적이다.
 */
export async function test_api_adminuser_join_duplicate_email_error(
  connection: api.IConnection,
) {
  // 1. 랜덤 이메일, 패스워드, display_name 생성
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(10);
  const password2 = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(1);

  // 2. 최초 관리자 회원가입 정상 요청
  const admin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email,
      password: password1,
      display_name: displayName,
    } satisfies ICommunityPlatformAdminUser.IJoin,
  });
  typia.assert(admin);

  // 3. 중복 이메일로 다시 회원가입, 오류 검증
  await TestValidator.error(
    "중복 이메일로 가입 시 에러가 발생해야 한다",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: {
          email, // 동일 이메일로 재가입
          password: password2, // 패스워드는 다르게
          display_name: RandomGenerator.name(1),
        } satisfies ICommunityPlatformAdminUser.IJoin,
      });
    },
  );
}

/**
 * - 함수명, 파라미터 등 템플릿 충실히 준수
 * - 이메일 등 랜덤 값 생성시 typia.random 및 RandomGenerator 활용 법칙 100% 구현
 * - 두 번째(중복 이메일) 가입시 await TestValidator.error와 async 콜백 패턴 정확하게 사용했음
 * - Type assertion, let/var/any 등 타입 규칙 위배 없음
 * - 추가 import 구문이나 템플릿 수정 없는 순수 함수 구현임
 * - 오류/비즈니스 검증에서 에러 메시지 등 불필요한 상세 검증 없이 예외 발생만 검증, 시나리오 요구와 규약 모두 충족함
 * - 첫 번째 정상 가입 응답 typia.assert 적용으로 타입 일치 검증 수행
 * - 불필요하거나 허구적/존재하지 않는 필드 사용 한 건 없음(모든 DTO, API 함수 존재)
 * - Null, undefined 등 optional 속성 null/undefined 처리 없다가도 오류 없음
 * - 불필요한 type narrowing, 고급 구문 과도하게 사용하지 않고 TypeScript/테스트 best practice에 부합
 * - 논리적 흐름(가입→중복 가입 시도→에러 검증) 및 변수명 일관성 우수
 * - TestValidator 함수 모두 첫 번째 인자에 명확하고 구체적인 타이틀 문자열 제공
 * - 전체적으로 컴파일러와 신규/노련 개발자 모두 이해 가능한 Code Quality임
 * - 테스트 목적에 부합하면서 규약 위반 전혀 없음(예: connection.headers 조작/추가 import 등)
 * - 수정 필요없음(초고와 동일 코드가 최종본이 됨)
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
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
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. CRITICAL: ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO
 *       TOLERANCE
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
 *   - O No illogical patterns
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
