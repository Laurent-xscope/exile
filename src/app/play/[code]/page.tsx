import { Suspense } from "react";
import PlayRoomClient from "./PlayRoomClient";
import { Spinner } from "@/components/base/spinner/spinner";

async function PlayInner({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PlayRoomClient roomCode={code} />;
}

export default function PlayArenaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-full flex flex-col items-center justify-center text-text-secondary gap-4">
          <Spinner size="md" aria-label="Menghubungkan ke Game Arena Exile" />
          <p className="text-body-regular text-text-secondary">
            Menghubungkan ke Game Arena Exile...
          </p>
        </div>
      }
    >
      <PlayInner params={params} />
    </Suspense>
  );
}
