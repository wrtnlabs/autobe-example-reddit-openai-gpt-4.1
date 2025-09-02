import { IPage } from "./IPage";
import { ICommunityPlatformBannedWord } from "./ICommunityPlatformBannedWord";

export namespace IPageICommunityPlatformBannedWord {
  /**
   * Paginated banned words dictionary results following platform standard
   * IPage* structure.
   */
  export type ISummary = {
    pagination: IPage.IPagination;

    /** Paginated array of banned word summary rows. */
    data: ICommunityPlatformBannedWord.ISummary[];
  };
}
