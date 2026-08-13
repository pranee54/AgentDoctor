import { charge } from "./payments/payment.service";
export function App() { return <div>{charge(1)}</div>; }
