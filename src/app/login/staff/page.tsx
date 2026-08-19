import { LoginForm } from "@/components/auth/login-form";
import { signInStaff } from "../actions";

export default function StaffLoginPage() {
  return <LoginForm audience="staff" action={signInStaff} />;
}
