import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * 커뮤니티 카테고리 중복 생성(코드/이름) 실패 시나리오 테스트.
 *
 * 고유 제약조건에 의해 동일한 code나 name이 이미 등록되어 있는 경우, 관리자가 해당 값을 이용해 새 카테고리 생성을 시도하면
 * 409 CONFLICT 에러가 발생해야 함을 검증한다.
 *
 * 단계:
 *
 * 1. 새로운 관리자 회원가입 (인증 획득)
 * 2. "코드", "이름" 모두 고유한 카테고리 최초 1개 생성
 * 3. 기존과 동일한 code를 가진 카테고리 생성 시도 → 409 에러 확인
 * 4. 기존과 동일한 name를 가진 카테고리 생성 시도 → 409 에러 확인
 * 5. Code, name 모두 유니크 제약이 정상 동작하는지 검증
 */
export async function test_api_category_create_duplicate_code_or_name(
  connection: api.IConnection,
) {
  // 1. 새로운 관리자 회원가입
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "securePW123!",
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPlatformAdmin.IJoin;

  const joinResp = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(joinResp);

  // 2. 최초 카테고리 생성 (고유 code, name)
  const categoryBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. 같은 code(다른 name)으로 생성 시도 → 409
  await TestValidator.error(
    "동일한 code 값으로 카테고리 생성시 409 CONFLICT 반환",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          body: {
            ...categoryBody,
            name: RandomGenerator.name(2), // name만 변경(code는 고정)
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // 4. 같은 name(다른 code)으로 생성 시도 → 409
  await TestValidator.error(
    "동일한 name 값으로 카테고리 생성시 409 CONFLICT 반환",
    async () => {
      await api.functional.communityPlatform.admin.categories.create(
        connection,
        {
          body: {
            ...categoryBody,
            code: RandomGenerator.alphaNumeric(12), // code만 변경(name은 동일)
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );
}
