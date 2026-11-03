import { Suspense } from "react";
import PlayArenaClient from "./PlayArenaClient";
import { Loader2 } from "lucide-react";

async function PlayInner({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PlayArenaClient roomCode={code} />;
}

export default function PlayArenaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Menghubungkan ke Game Arena exile.org...</p>
        </div>
      }
    >
      <PlayInner params={params} />
    </Suspense>
  );
}
