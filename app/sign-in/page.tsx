import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in" };
export default function SignInPage() {
  return <AuthShell mode="sign-in" />;
}
