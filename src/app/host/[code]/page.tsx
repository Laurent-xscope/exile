import { Suspense } from "react";
import TeacherHostClient from "./TeacherHostClient";
import { Loader2 } from "lucide-react";

async function HostInner({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <TeacherHostClient roomCode={code} />;
}

export default function TeacherHostPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Menghubungkan ke Ruang Guru exile.org...</p>
        </div>
      }
    >
      <HostInner params={params} />
    </Suspense>
  );
}
