import { fetchCustomerDetail, fetchPatternSession } from "@/app/actions/pattern-actions";

import SessionDetailClient from "./SessionDetailClient";

interface DesignSessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function DesignSessionDetailPage({ params }: DesignSessionDetailPageProps) {
  const { sessionId } = await params;

  const sessionResult = await fetchPatternSession(sessionId);
  const initialSession = sessionResult.success ? sessionResult.data ?? null : null;

  let initialCustomerName: string | null = null;

  if (initialSession?.customer_id) {
    const customerResult = await fetchCustomerDetail(initialSession.customer_id);
    if (customerResult.success) {
      initialCustomerName = customerResult.data?.full_name ?? null;
    }
  }

  return (
    <SessionDetailClient
      sessionId={sessionId}
      initialSession={initialSession}
      initialCustomerName={initialCustomerName}
      initialError={sessionResult.success ? null : sessionResult.error ?? null}
      initialStatusCode={sessionResult.success ? undefined : sessionResult.statusCode}
    />
  );
}
