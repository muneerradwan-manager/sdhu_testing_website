import { redirect } from "next/navigation";

/**
 * The account is one for everyone: it is created at «إنشاء حساب في المنصة», and the administrative file opens on it
 * when its holder chooses the administrators' way for a season. This old address leads there.
 */
export default function AdminRegisterPage() {
  redirect("/register");
}
