import { FathersLibraryContent } from "@/app/components/FathersLibraryContent";
import { getFathersWorks } from "@/lib/fathers/data";

export default async function FathersPage() {
  const works = await getFathersWorks();

  return <FathersLibraryContent works={works.filter((work) => work.slug === "1-clement")} />;
}
