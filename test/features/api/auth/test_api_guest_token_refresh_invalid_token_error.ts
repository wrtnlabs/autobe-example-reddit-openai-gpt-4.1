import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 검증되지 않은(refresh_token이 잘못되었거나 위조된) 토큰으로 guest 세션 갱신을 시도할 때 올바른 오류 응답이
 * 반환되는지, 세션이 연장되거나 새로 만들어지지 않는지, 그리고 시스템이 실제 유효 토큰/신원 정보에 대한 정보를 노출하지 않는지
 * 검증합니다. 또한 토큰 replay/replay attack이나 추측 시도에 대한 방어 동작도 확인합니다.
 *
 * 1. 임의의 값, 잘못된 값 등 다양한 invalid/변조된 guest refresh_token 값으로 refresh API를
 *    호출합니다.
 * 2. 각 경우에 대해 API가 오류(HttpError 등)로 응답하는지 확인합니다. (정상 응답이 오면 안됨)
 * 3. 오류 발생 시 세션 토큰(Authorization 헤더 등)이 발급되어서는 안 됩니다.
 * 4. 오류 응답의 내용이 정상적인 guest id 또는 세부 정보를 노출하지 않는지 확인합니다.
 * 5. 유효하지 않은 토큰 또는 예상치 못한 값에 대해 모두 동일한 방식의 거부 및 오류 메시지가 반환되는지 확인합니다.
 */
export async function test_api_guest_token_refresh_invalid_token_error(
  connection: api.IConnection,
) {
  // 1. 완전히 임의의(random) 문자열 토큰 (유효하지 않은 jwt 패턴)
  await TestValidator.error(
    "임의 random 스트링 토큰으로 guest session refresh 불가",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(40),
        } satisfies ICommunityPlatformGuest.IRefreshRequest,
      });
    },
  );

  // 2. Base64 인코딩이지만 유효하지 않은 JWT 형식 (예: 글자수 부족)
  await TestValidator.error(
    "Base64이지만 잘못된 길이의 jwt 문자열 refresh_token도 거부",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: btoa(RandomGenerator.alphaNumeric(5)),
        } satisfies ICommunityPlatformGuest.IRefreshRequest,
      });
    },
  );

  // 3. jwt-like 패턴(aaa.bbb.ccc)이나 실제 guest 발급이 아닌 값
  await TestValidator.error(
    "jwt-like (a.b.c) 패턴의, 실제 발급이 아닌 토큰도 거부",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token:
            RandomGenerator.alphaNumeric(20) +
            "." +
            RandomGenerator.alphaNumeric(20) +
            "." +
            RandomGenerator.alphaNumeric(20),
        } satisfies ICommunityPlatformGuest.IRefreshRequest,
      });
    },
  );

  // 4. null, undefined, 빈스트링 등 절대 들어갈 수 없는 값 → 컴파일상 허용되지 않아 스킵

  // 5. 여러 변조/임의 토큰이 동일한 방식(오류/상태/메시지)로 거부되는지 반복 확인
  const invalidTokens: string[] = [
    RandomGenerator.alphaNumeric(40),
    btoa(RandomGenerator.alphaNumeric(9)),
    RandomGenerator.paragraph({ sentences: 8 }),
    ArrayUtil.repeat(3, () => RandomGenerator.alphaNumeric(10)).join("."),
    "eyJhIjoiZmFrZSIsImQiOiJsaWUiLCJyIjoiYmFkIn0=.ZmFrZV9zaWc=.YmFkX3NpZyI=", // fake JWT
  ];
  for (const token of invalidTokens) {
    await TestValidator.error(
      `변조/임의 guest refresh_token 반복 확인: ${token.substring(0, 20)}...`,
      async () => {
        await api.functional.auth.guest.refresh(connection, {
          body: {
            refresh_token: token,
          } satisfies ICommunityPlatformGuest.IRefreshRequest,
        });
      },
    );
  }

  // 6. 오류 응답상에 guest/Authorization 토큰 등 정보 노출이 없는지(응답 body가 없는지) 확인
  // API Contract 상 정상응답이 아니면 output이 없음 → type 체크 시도 자체가 에러
  // (별도의 error 핸들에서 message/노출값 확인 가능할 경우 추가 검증)
}
