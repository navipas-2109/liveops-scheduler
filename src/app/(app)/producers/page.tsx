import { redirect } from "next/navigation";

// The Producer list now lives on the Producer page, next to the shifts.
export default function ProducersPage() {
  redirect("/staff-shift?view=people");
}
