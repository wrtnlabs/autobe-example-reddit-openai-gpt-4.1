import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Successful retrieval of guest analytics data by an authenticated admin.
 *
 * This test covers the workflow of creating a new admin user, automatically
 * authenticating, and then accessing the backend guest analytics records
 * portal as an administrator. After admin join (which logs in and issues a
 * JWT), it lists a paginated set of platform guest analytics records using
 * the appropriate privileged endpoint. Returned data is validated for
 * correct pagination structure, guarantees of privacy (no PII present), and
 * presence of required fields. This is the standard business
 * analytics/audit path for admin users.
 *
 * Steps:
 *
 * 1. Create and log in as admin via join (obtain token)
 * 2. Call PATCH /communityPlatform/admin/guests for analytics records
 * 3. Validate result schema, guest analytics record fields, privacy rules, and
 *    pagination structure
 */
export async function test_api_admin_guests_list_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin account
  const adminInput: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(adminAuth);

  TestValidator.equals(
    "admin account is active",
    adminAuth.admin.is_active,
    true,
  );
  TestValidator.equals(
    "admin registration email matches",
    adminAuth.admin.email,
    adminInput.email,
  );

  // 2. Query guest analytics as the authenticated admin
  const guestsPage: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(guestsPage);

  // 3. Validate pagination and data schema
  TestValidator.predicate(
    "pagination record count is non-negative",
    guestsPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    guestsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    guestsPage.pagination.limit,
    10,
  );

  // 4. Check each guest entry
  for (const guest of guestsPage.data) {
    typia.assert(guest);
    TestValidator.predicate(
      "guest.id is present and a string",
      typeof guest.id === "string" && !!guest.id,
    );
    TestValidator.predicate(
      "guest.guest_identifier is present and a string",
      typeof guest.guest_identifier === "string" && !!guest.guest_identifier,
    );
    TestValidator.predicate(
      "guest.created_at is present and a string",
      typeof guest.created_at === "string" && !!guest.created_at,
    );
    TestValidator.predicate("guest does not expose email", !("email" in guest));
    TestValidator.predicate(
      "guest does not expose password",
      !("password" in guest),
    );
  }
}
