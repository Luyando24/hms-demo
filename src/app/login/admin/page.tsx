import { LoginForm } from "@/components/auth/login-form";
import { signInAdmin } from "../actions";

export default function AdminLoginPage() {
  return <LoginForm audience="admin" action={signInAdmin} />;
}
