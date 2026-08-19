import { LoginForm } from "@/components/auth/login-form";
import { signInStaff } from "@/app/login/actions";

export default function StaffLoginPage() {
  return <LoginForm audience="staff" action={signInStaff} />;
}
