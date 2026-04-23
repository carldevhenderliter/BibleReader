import { HomePageContent } from "@/app/components/HomePageContent";
import { getBooks } from "@/lib/bible/data";
import { getAuthenticFathersWorks } from "@/lib/fathers/data";

export default async function HomePage() {
  const [books, fathersWorks] = await Promise.all([getBooks(), getAuthenticFathersWorks()]);

  return (
    <HomePageContent
      books={books}
      fathersWorks={fathersWorks}
    />
  );
}
