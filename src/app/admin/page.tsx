import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const runtime = "edge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
