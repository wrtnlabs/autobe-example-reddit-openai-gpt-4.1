import { IPage } from "./IPage";
import { ICommunityPlatformCategory } from "./ICommunityPlatformCategory";

export namespace IPageICommunityPlatformCategory {
  /**
   * Paginated result for category summary records as shown in admin lists.
   * Follows IPage structure.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Paginated array of category summary records. */
    data: ICommunityPlatformCategory.ISummary[];
  };
}
