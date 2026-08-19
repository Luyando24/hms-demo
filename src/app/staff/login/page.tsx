import { redirect } from "next/navigation";
import { getSubdomainUrl } from "@/utils/subdomain";

export default function StaffLoginPage() {
  redirect(getSubdomainUrl("staff", "/login"));
}
