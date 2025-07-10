import { Suspense } from "react";
import LoginPage from "@/components/page/Login";

export const metadata = {
  title: "Login",
  description: "Login Page",
};

const Login = () => {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
};

export default Login;
