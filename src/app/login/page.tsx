import { LoginForm } from "@/components/auth/login-form";
import { signInWorkforce } from "./actions";

export default function LoginPage() {
  return <LoginForm audience="workforce" action={signInWorkforce} />;
}
