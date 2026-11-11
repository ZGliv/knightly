import Link from "next/link";
import {
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
} from "@tabler/icons-react";
import { PositionPreview } from "./PositionPreview";
import {
  openingFen,
  openingLines,
  type Collection,
  type OpeningStudy,
} from "@/lib/library/catalog";
import { collectionLevel } from "@/lib/library/browse";

export function StudyCard({
  item,
  saved,
  onBookmark,
  done = 0,
  returnTo,
}: {
  item: Collection | OpeningStudy;
  saved: boolean;
  onBookmark: (id: string) => void;
  done?: number;
  returnTo: string;
}) {
  const collection = "lessonIds" in item;
  const href = `/study/${item.id}${returnTo === "/study" ? "" : "?library=" + encodeURIComponent(returnTo.slice("/study?".length))}`;
  const type = collection ? item.category : "Opening study";
  return (
    <article className="study-card" data-study-id={item.id}>
      <Link
        href={href}
        className={`study-cover cover-${collection ? item.category.toLowerCase() : "openings"}`}
        aria-label={`${type}: ${item.title}`}
      >
        <PositionPreview
          fen={collection ? item.fen : openingFen(item)}
          color={!collection && item.side === "Black" ? "black" : "white"}
        />
      </Link>
      <div className="study-card-body">
        <div className="study-card-topline">
          <span>
            {collection
              ? `${item.lessonIds.length} ${item.lessonIds.length === 1 ? "lesson" : "lessons"}`
              : `Play as ${item.side}`}
          </span>
          <button
            className="icon-button"
            aria-label={`${saved ? "Unsave" : "Save"} ${item.title}`}
            aria-pressed={saved}
            onClick={() => onBookmark(item.id)}
          >
            {saved ? (
              <IconBookmarkFilled size={18} />
            ) : (
              <IconBookmark size={18} />
            )}
          </button>
        </div>
        <Link href={href} className="study-card-title">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </Link>
        <div className="study-card-bottom">
          <span>
            {collection
              ? done
                ? `${done} of ${item.lessonIds.length} tried`
                : collectionLevel(item)
              : `${openingLines(item).length} explained lines`}
          </span>
          <Link href={href} aria-label={`View ${item.title}`}>
            <IconArrowRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
