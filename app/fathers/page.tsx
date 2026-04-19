import { FathersLibraryContent } from "@/app/components/FathersLibraryContent";
import { FEATURED_FATHERS_WORK_SLUGS } from "@/lib/fathers/constants";
import { getFathersWorks } from "@/lib/fathers/data";

export default async function FathersPage() {
  const works = await getFathersWorks();
  const featuredWorkSlugs = new Set<string>(FEATURED_FATHERS_WORK_SLUGS);

  return (
    <FathersLibraryContent
      works={works.filter((work) => featuredWorkSlugs.has(work.slug))}
    />
  );
}
