import { notFound } from "next/navigation";

import { FathersReaderContent } from "@/app/components/FathersReaderContent";
import { getFathersWorkPayload } from "@/lib/fathers/data";

type FathersReaderPageProps = {
  params: Promise<{
    work: string;
  }>;
};

export async function generateStaticParams() {
  return [{ work: "1-clement" }];
}

export default async function FathersReaderPage({ params }: FathersReaderPageProps) {
  const { work } = await params;

  if (work !== "1-clement") {
    notFound();
  }

  const payload = await getFathersWorkPayload(work);

  if (!payload) {
    notFound();
  }

  return <FathersReaderContent payload={payload} />;
}
