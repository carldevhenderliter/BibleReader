import { notFound } from "next/navigation";

import { FathersReaderContent } from "@/app/components/FathersReaderContent";
import { getFathersWorkPayload, getFathersWorks } from "@/lib/fathers/data";

type FathersReaderPageProps = {
  params: Promise<{
    work: string;
  }>;
};

export async function generateStaticParams() {
  const works = await getFathersWorks();

  return works.map((work) => ({
    work: work.slug
  }));
}

export default async function FathersReaderPage({ params }: FathersReaderPageProps) {
  const { work } = await params;

  const payload = await getFathersWorkPayload(work);

  if (!payload) {
    notFound();
  }

  return <FathersReaderContent payload={payload} />;
}
