import { loadDashboardData } from "@/lib/load-dashboard-data";
import { LumeDashboard } from "@/components/lume/lume-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let payload = null;

  try {
    payload = await loadDashboardData();
  } catch {
    payload = null;
  }

  return <LumeDashboard initial={payload} />;
}
