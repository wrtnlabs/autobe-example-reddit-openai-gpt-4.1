import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced community discovery: filtering, searching, sorting, and
 * pagination.
 *
 * Ensures that community discovery (explore/search) API:
 *
 * - Correctly filters by category_id
 * - Correctly searches by partial name (case-insensitive substring)
 * - Allows sorting by creation date, updated date, and other sortable fields
 * - Supports ascending/descending order
 * - Returns result data and pagination meta accurately across requests
 * - Handles edge pagination windows and empty result sets
 *
 * Test Steps:
 *
 * 1. Retrieve first page of communities with default parameters; assert meta
 *    pagination fields
 * 2. If data present: Pick a random result's category_id and re-query with
 *    that filter; check each result's category_id matches
 * 3. Pick a partial substring from a result's name and re-query using name or
 *    search field; check each result's name includes substring
 * 4. Test sortBy with direction (asc/desc) for supported fields (created_at,
 *    name, display_title) and assert sorting order in results
 * 5. Request an obviously out-of-bounds page and verify empty data array and
 *    correct pagination meta
 * 6. Vary the limit (per page), request multiple adjacent pages, and confirm
 *    data not duplicated or missing across windows
 * 7. Combine category, text search, sort, and direction to test intersection
 *    logic; validate every result matches all criteria
 * 8. If no data, at least validate endpoint returns correct default meta
 *    structure (empty data, correct pagination format)
 */
export async function test_api_community_discovery_with_search_filters(
  connection: api.IConnection,
) {
  // 1. Retrieve first page with default parameters
  const base = await api.functional.communityPlatform.communities.index(
    connection,
    { body: {} satisfies ICommunityPlatformCommunity.IRequest },
  );
  typia.assert(base);
  TestValidator.predicate(
    "pagination current is page 1 by default",
    base.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    base.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    base.pagination.records >= 0,
  );

  // 2. Filter by category if any data found
  if (base.data.length > 0) {
    const anyCommunity = RandomGenerator.pick(base.data);
    // Category filter
    const catFiltered =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          category_id: anyCommunity.category_id,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(catFiltered);
    for (const comm of catFiltered.data) {
      TestValidator.equals(
        "community matches filtered category",
        comm.category_id,
        anyCommunity.category_id,
      );
    }
    // 3. Partial name search (substring)
    let partial = RandomGenerator.substring(anyCommunity.name);
    // Ensure partial is >1 char and not redundant
    if (partial.length < 2 || partial === anyCommunity.name)
      partial = anyCommunity.name.slice(
        0,
        Math.max(2, Math.floor(anyCommunity.name.length / 2)),
      );
    const searchResults =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          search: partial,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(searchResults);
    for (const comm of searchResults.data) {
      const nameMatch = comm.name
        ?.toLowerCase()
        .includes(partial.toLowerCase());
      const titleMatch = (comm.display_title ?? "")
        .toLowerCase()
        .includes(partial.toLowerCase());
      TestValidator.predicate(
        `community name or title includes search '${partial}'`,
        nameMatch || titleMatch,
      );
    }
    // 4. Sorting
    const sortFields = ["created_at", "name", "display_title"] as const;
    for (const sortBy of sortFields) {
      for (const direction of ["asc", "desc"] as const) {
        const sorted = await api.functional.communityPlatform.communities.index(
          connection,
          {
            body: {
              sortBy,
              direction,
            } satisfies ICommunityPlatformCommunity.IRequest,
          },
        );
        typia.assert(sorted);
        const arr = sorted.data;
        if (arr.length > 1) {
          for (let i = 1; i < arr.length; ++i) {
            const prev = arr[i - 1],
              curr = arr[i];
            let prevKey = prev[sortBy] ?? "",
              currKey = curr[sortBy] ?? "";
            // Type-correct: created_at as date-time, name/title as string
            if (prevKey && currKey) {
              if (direction === "asc") {
                TestValidator.predicate(
                  `${sortBy} asc sort`,
                  prevKey <= currKey,
                );
              } else {
                TestValidator.predicate(
                  `${sortBy} desc sort`,
                  prevKey >= currKey,
                );
              }
            }
          }
        }
      }
    }
    // 5. Out-of-bounds page
    const outOfRange = await api.functional.communityPlatform.communities.index(
      connection,
      { body: { page: 999999 } satisfies ICommunityPlatformCommunity.IRequest },
    );
    typia.assert(outOfRange);
    TestValidator.equals(
      "out-of-bounds pagination returns empty data",
      outOfRange.data.length,
      0,
    );
    // 6. Change per-page limit, test non-overlap/duplication in pagination windows
    const limits = [1, 3, 5, 20].filter((l) => l < base.pagination.records);
    for (const limit of limits) {
      const page1 = await api.functional.communityPlatform.communities.index(
        connection,
        {
          body: {
            limit,
            page: 1,
          } satisfies ICommunityPlatformCommunity.IRequest,
        },
      );
      const page2 = await api.functional.communityPlatform.communities.index(
        connection,
        {
          body: {
            limit,
            page: 2,
          } satisfies ICommunityPlatformCommunity.IRequest,
        },
      );
      typia.assert(page1);
      typia.assert(page2);
      const page1Ids = page1.data.map((x) => x.id);
      const page2Ids = page2.data.map((x) => x.id);
      for (const id of page1Ids) {
        TestValidator.predicate(
          `pagination non-overlap id ${id} across pages`,
          !page2Ids.includes(id),
        );
      }
    }
    // 7. Combined category, search, sort, direction
    for (const sortBy of sortFields) {
      for (const direction of ["asc", "desc"] as const) {
        const comb = await api.functional.communityPlatform.communities.index(
          connection,
          {
            body: {
              category_id: anyCommunity.category_id,
              search: partial,
              sortBy,
              direction,
            } satisfies ICommunityPlatformCommunity.IRequest,
          },
        );
        typia.assert(comb);
        for (const comm of comb.data) {
          TestValidator.equals(
            "combination filter: category",
            comm.category_id,
            anyCommunity.category_id,
          );
          const nameMatch = comm.name
            ?.toLowerCase()
            .includes(partial.toLowerCase());
          const titleMatch = (comm.display_title ?? "")
            .toLowerCase()
            .includes(partial.toLowerCase());
          TestValidator.predicate(
            "combination filter: name/partial",
            nameMatch || titleMatch,
          );
        }
        if (comb.data.length > 1) {
          for (let i = 1; i < comb.data.length; ++i) {
            const prev = comb.data[i - 1],
              curr = comb.data[i];
            let prevKey = prev[sortBy] ?? "",
              currKey = curr[sortBy] ?? "";
            if (prevKey && currKey) {
              if (direction === "asc") {
                TestValidator.predicate(
                  `comb sort ${sortBy} asc`,
                  prevKey <= currKey,
                );
              } else {
                TestValidator.predicate(
                  `comb sort ${sortBy} desc`,
                  prevKey >= currKey,
                );
              }
            }
          }
        }
      }
    }
  } else {
    // 8. If no data, validate empty default meta
    TestValidator.equals("empty data array", base.data.length, 0);
    TestValidator.equals(
      "pagination current page 1",
      base.pagination.current,
      1,
    );
    TestValidator.equals("pagination records zero", base.pagination.records, 0);
  }
}
