import { FathersLibraryContent } from "@/app/components/FathersLibraryContent";
import { getAuthenticFathersWorks } from "@/lib/fathers/data";

export default async function FathersPage() {
  const works = await getAuthenticFathersWorks();

  return (
    <FathersLibraryContent
      works={works}
    />
  );
}
