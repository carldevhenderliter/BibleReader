import { HomePageContent } from "@/app/components/HomePageContent";
import { getBooks } from "@/lib/bible/data";
import { FEATURED_FATHERS_WORK_SLUGS } from "@/lib/fathers/constants";
import { getFathersWorks } from "@/lib/fathers/data";

export default async function HomePage() {
  const [books, fathersWorks] = await Promise.all([getBooks(), getFathersWorks()]);
  const featuredWorkSlugs = new Set<string>(FEATURED_FATHERS_WORK_SLUGS);

  return (
    <HomePageContent
      books={books}
      fathersWorks={fathersWorks.filter((work) => featuredWorkSlugs.has(work.slug))}
    />
  );
}
