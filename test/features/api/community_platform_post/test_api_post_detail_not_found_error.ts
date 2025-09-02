import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * 테스트 목적: 존재하지 않거나 잘못된 postId로 게시글 상세 조회 시 NotFound 에러가 반환되는지 검증한다.
 *
 * - Public 역할로 인증 없이 API를 호출한다.
 * - 존재하지 않는 랜덤 UUID(postId)로 GET /communityPlatform/posts/{postId}를 요청한다.
 * - 404 NotFound(혹은 플랫폼의 표준 없는 리소스 접근 에러) 오류가 반환되는지 httpError로 검증한다.
 * - Soft-delete된 post 조차도 반환하지 않으므로 추가 검증은 불필요하다.
 *
 * 검증포인트:
 *
 * 1. 임의의 UUID 값으로 GET /communityPlatform/posts/{postId} 호출 시 404 NotFound 에러
 *    발생
 */
export async function test_api_post_detail_not_found_error(
  connection: api.IConnection,
) {
  // 1. 임의의 UUID(postId)로 존재하지 않는 게시글 상세 조회 시도
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "존재하지 않는 postId 조회시 404 NotFound 에러 발생",
    404,
    async () => {
      await api.functional.communityPlatform.posts.at(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
