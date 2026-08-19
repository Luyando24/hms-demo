import { LoginForm } from "@/components/auth/login-form";
import { signInAdmin } from "@/app/login/actions";

export default function AdminLoginPage() {
  return <LoginForm audience="admin" action={signInAdmin} />;
}
