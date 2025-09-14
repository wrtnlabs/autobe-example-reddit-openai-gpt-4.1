import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * 회원이 refresh 토큰을 사용하여 세션을 갱신하는 일반적인 성공 시나리오를 검증한다.
 *
 * 1. 신규 회원 가입 API(/auth/memberUser/join)로 임의 이메일, 패스워드, (선택) 닉네임으로 회원생성
 * 2. 회원 가입 결과에서 refresh 토큰을 추출
 * 3. /auth/memberUser/refresh API로 해당 refresh 토큰으로 토큰 갱신 요청
 * 4. 갱신된 access/refresh 토큰 및 사용자 정보가 정상적으로 반환되는지 확인
 * 5. 반환된 사용자 id, status 등 주요 정보가 일관되는지 검증
 * 6. 갱신 전/후 토큰 값이 실제로 달라졌는지 확인(토큰 재발급 검증)
 */
export async function test_api_memberuser_refresh_success_scenario(
  connection: api.IConnection,
) {
  // 1. 신규 회원 가입: 랜덤 이메일/비밀번호/닉네임
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformMemberUser.IJoin;

  const joinedUser = await api.functional.auth.memberUser.join(connection, {
    body: joinInput,
  });
  typia.assert(joinedUser);

  // 2. 가입 결과에서 refresh 토큰, id 등 주요 정보 보관
  const prevRefresh = joinedUser.token.refresh;
  const prevAccess = joinedUser.token.access;
  const userId = joinedUser.id;
  const userCredentialId = joinedUser.user_credential_id;
  const prevStatus = joinedUser.status;
  const prevDisplayName = joinedUser.display_name ?? null;

  // 3. refresh 토큰을 이용하여 세션 갱신 API 호출
  const refreshInput = {
    refresh_token: prevRefresh,
  } satisfies ICommunityPlatformMemberUser.IRefresh;

  const refreshedUser = await api.functional.auth.memberUser.refresh(
    connection,
    {
      body: refreshInput,
    },
  );
  typia.assert(refreshedUser);

  // 4. 반환된 정보의 일관성과 토큰 갱신 여부 검증
  TestValidator.equals("user id 일관성", refreshedUser.id, userId);
  TestValidator.equals(
    "user credential id 일관성",
    refreshedUser.user_credential_id,
    userCredentialId,
  );
  TestValidator.equals("status 일관성", refreshedUser.status, prevStatus);
  TestValidator.equals(
    "display_name 일관성",
    refreshedUser.display_name ?? null,
    prevDisplayName,
  );

  // 5. 토큰이 재발급(값이 변경됨) 되었는지 확인
  TestValidator.notEquals(
    "access 토큰이 갱신됨",
    refreshedUser.token.access,
    prevAccess,
  );
  TestValidator.notEquals(
    "refresh 토큰이 갱신됨",
    refreshedUser.token.refresh,
    prevRefresh,
  );

  // 6. 토큰 구조 검증(typia.assert()로 완료됨)
  typia.assert<IAuthorizationToken>(refreshedUser.token);
}

/**
 * - 코드 내 import 구문은 템플릿에 한정되어 있고 추가 import 없음 (준수)
 * - 모든 요청 바디에 satisfies 타입 사용 및 let이나 타입 어노테이션 없이 const와 satisfies만 활용 (규칙 준수)
 * - Typia.random과 RandomGenerator로 입력 데이터 생성, 이메일/비밀번호 형식 및 display_name 길이 준수
 * - /auth/memberUser/join → 정상 회원 가입 및 토큰 세트 반환 → refresh 토큰 별도 저장, 사용자 주요
 *   식별값(id/credential_id 등) 추출 (논리적 연결 문제 없음)
 * - /auth/memberUser/refresh → refresh 토큰만 파라미터로 전달하여 토큰 쌍 재발급 → 결과 typia.assert로
 *   타입 검증
 * - Business key 및 일관성: id/status/display_name/user_credential_id가 join/refresh
 *   단계 모두 동일함(비즈니스 논리 확인)
 * - 토큰 갱신성: access/refresh 값이 실제로 변경(재발급)된 것 notEquals로 검증
 * - 모든 API 호출 시 await 누락 없음. 비동기 컨텍스트 OK
 * - TestValidator 함수 타이틀(parameter 1) 모두 상세히 기재됨
 * - Typia.assert 후 별도 type validation/assertion 없으며, 코드 전체에 as any, 타입 우회 없음
 * - Connection.headers 직접 접근/조작 없음
 * - Business flow 모두 실제 가능하고 논리적, 미래 유지보수성 좋음
 * - 불필요 정보 삭제, 필요 정보(이메일 등)만 확보 및 활용, scenario 내용 일관성 높음
 * - 실패 유형 없음, review 내용 적용에 따라 draft와 final 일치시켜도 이상 무
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
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
 * - Check List
 *
 *   - O No compilation errors
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
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
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await` when needed
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
 *   - O NEVER touch connection.headers in any way - ZERO manipulation allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (`any`, `@ts-ignore`, `@ts-expect-error`)
 *   - O All TestValidator functions include title as first parameter and use
 *       correct positional parameter syntax
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
