import { HomePageContent } from "@/app/components/HomePageContent";
import { getBooks } from "@/lib/bible/data";

export default async function HomePage() {
  const books = await getBooks();

  return <HomePageContent books={books} />;
}
