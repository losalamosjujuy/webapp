import { AdminProvider } from "@/components/admin/admin-provider";
import { getAdminState } from "@/lib/data-access";
import { requireAdminSession } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();
  const initialState = await getAdminState();

  return <AdminProvider initialState={initialState}>{children}</AdminProvider>;
}
