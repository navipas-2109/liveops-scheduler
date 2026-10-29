import { redirect } from "next/navigation";
import { getSessionUser } from "@/infrastructure/auth/session";
import { homeHref } from "./navigation";

export const instant = false;

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? homeHref(user.role) : "/login");
}
