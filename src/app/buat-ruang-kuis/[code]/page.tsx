import { Suspense } from "react";
import TeacherHostClient from "@/app/host/[code]/TeacherHostClient";
import { Spinner } from "@/components/base/spinner/spinner";

async function HostInner({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <TeacherHostClient roomCode={code} />;
}

export default function BuatRuangKuisCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-full flex flex-col items-center justify-center text-text-secondary gap-4">
          <Spinner size="md" aria-label="Menghubungkan ke ruang pengajar Exile" />
          <p className="text-body-regular text-text-secondary">
            Menghubungkan ke ruang pengajar Exile...
          </p>
        </div>
      }
    >
      <HostInner params={params} />
    </Suspense>
  );
}
