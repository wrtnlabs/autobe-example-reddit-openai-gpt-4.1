import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * 인증되지 않은 상태에서 커뮤니티 어드민 게시글 신고 상세 조회 시 접근이 거부되는지 검증
 *
 * 본 테스트는, 어드민 전용 게시글 신고 상세 API (GET
 * /communityPlatform/admin/posts/{postId}/reports/{reportId})를
 * 비인증(Authorization header 없이)으로 접근할 때 반드시 접근이 차단(에러 발생)됨을 확인한다.
 *
 * 1. 어드민 가입 – 실제 join으로 connection에 인증 정보 생성 (headers.Authorization 자동 부여)
 * 2. 테스트용 postId/reportId UUID 랜덤 준비 (실제 존재여부 무관, 인증 거부만 확인 목적)
 * 3. 인증 정보가 "없는" connection(headers: {})을 별도 생성
 * 4. 이 미인증 connection으로 상세 API 요청 시 반드시 에러가 발생하는지 TestValidator.error()로 체크
 *    (에러 메시지/코드는 별도 확인 않으며, 발생 여부만 검증)
 */
export async function test_api_post_report_admin_view_report_unauthenticated_denied(
  connection: api.IConnection,
) {
  // 1. 어드민 계정 생성 (connection.headers.Authorization 자동 설정)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminResult);

  // 2. 테스트용 postId, reportId(UUID) 준비
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 3. 인증 없는 connection 만들기 (headers: {})
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. 미인증 상태로 어드민 신고 상세 API 접근 시 반드시 거부됨을 검증
  await TestValidator.error(
    "비인증 어드민 신고 상세 접근 거부 확인",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.at(
        unauthConn,
        {
          postId,
          reportId,
        },
      );
    },
  );
}
