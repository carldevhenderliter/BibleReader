import { ReaderPrototypePageContent } from "@/app/components/ReaderPrototypePageContent";
import { loadPrototypeReaderPage } from "@/app/prototype/reader/prototype-reader-data";

export default async function ReaderPrototypePage() {
  const pageData = await loadPrototypeReaderPage("titus", 1);

  if (!pageData) {
    return null;
  }

  return <ReaderPrototypePageContent {...pageData} />;
}
