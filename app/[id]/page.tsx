import { Metadata } from 'next';
import { getSurpriseById } from '@/lib/storage';
import { SurpriseViewerClient } from '@/components/SurpriseViewerClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getSurpriseById(id);

  if (!data) {
    return {
      title: 'A Special E-Card Surprise 💌',
      description: 'You have received a special personalized interactive e-card surprise.',
    };
  }

  const receiver = data.receiver || 'Someone Special';
  const sender = data.sender || 'A loved one';

  return {
    title: `💌 Special Surprise for ${receiver}!`,
    description: `${sender} made a personalized interactive e-card with photos, music, coupons, and a special note for you!`,
    openGraph: {
      title: `💌 Special Surprise for ${receiver}!`,
      description: `Open this interactive e-card from ${sender} with romantic music and memories.`,
      images: data.photos && data.photos[0] ? [data.photos[0]] : ['/library/viral_1.jpg'],
    },
  };
}

export default async function DynamicSurprisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSurpriseById(id);

  return (
    <SurpriseViewerClient
      initialData={data}
      id={id}
      isExpired={!!data?.isExpired}
    />
  );
}
