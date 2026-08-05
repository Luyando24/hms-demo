import { LoginForm } from "@/components/auth/login-form";
import { signInPatient } from "./actions";

export default function PatientLoginPage() {
  return <LoginForm audience="patient" action={signInPatient} />;
}
