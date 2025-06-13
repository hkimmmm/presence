import RegisterForm from "../forms/FormRegister";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-xl">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-3">
          Daftar Akun
        </h1>
        <p className="text-center text-gray-500 mb-4 text-sm">
          Lengkapi formulir di bawah untuk membuat akun baru.
        </p>

        <RegisterForm />

        <p className="mt-3 text-center text-sm text-gray-500">
          Sudah punya akun?{" "}
          <a href="/auth/login" className="text-blue-600 font-medium hover:underline">
            Masuk di sini
          </a>
        </p>
      </div>
    </main>
  );
}
