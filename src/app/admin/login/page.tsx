import { redirect } from "next/navigation";
import { getSubdomainUrl } from "@/utils/subdomain";

export default function AdminLoginPage() {
  redirect(getSubdomainUrl("admin", "/login"));
}
