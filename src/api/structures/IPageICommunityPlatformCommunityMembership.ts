import { IPage } from "./IPage";
import { ICommunityPlatformCommunityMembership } from "./ICommunityPlatformCommunityMembership";

export namespace IPageICommunityPlatformCommunityMembership {
  /**
   * Paginated collection of community membership summary records. Used for
   * paginated community member lists in roster UIs or moderation/member
   * management APIs. Always contains pagination and data fields (never
   * business properties directly).
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformCommunityMembership.ISummary[];
  };
}
