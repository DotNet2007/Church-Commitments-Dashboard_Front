import { useOutletContext } from "react-router-dom";
import DashboardPage from "./DashboardPage";
type C = { openPayment: () => void };
export default function DashboardRoute() {
  const c = useOutletContext<C>();
  return <DashboardPage onNavigate={() => {}} onAddPayment={c.openPayment} />;
}
