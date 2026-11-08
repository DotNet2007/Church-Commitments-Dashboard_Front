import { useOutletContext } from "react-router-dom";
import PaymentsPage from "./PaymentsPage";
type C = { openPayment: () => void };
export default function PaymentsRoute() {
  const c = useOutletContext<C>();
  return <PaymentsPage onAdd={c.openPayment} />;
}
