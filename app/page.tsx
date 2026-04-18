import { HomePageContent } from "@/app/components/HomePageContent";
import { getBooks } from "@/lib/bible/data";
import { getFathersWorks } from "@/lib/fathers/data";

export default async function HomePage() {
  const [books, fathersWorks] = await Promise.all([getBooks(), getFathersWorks()]);

  return (
    <HomePageContent
      books={books}
      fathersWorks={fathersWorks.filter((work) => work.slug === "1-clement")}
    />
  );
}
