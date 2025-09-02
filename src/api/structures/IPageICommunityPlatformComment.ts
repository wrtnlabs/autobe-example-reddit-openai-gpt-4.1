import { IPage } from "./IPage";
import { ICommunityPlatformComment } from "./ICommunityPlatformComment";

export namespace IPageICommunityPlatformComment {
  /**
   * Paginated list of summarized comment records. Used for comment search,
   * feeds, and bulk display operations. Data is an array of
   * ICommunityPlatformComment.ISummary objects.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformComment.ISummary[];
  };
}
