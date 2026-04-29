"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, register } from "@/src/lib/auth";
import { useAuth } from "@/src/components/auth/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, markAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </main>
    );
  }

  if (isAuthenticated) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
        company_name: companyName.trim(),
      });
      await login(email.trim(), password);
      markAuthenticated();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-5 text-2xl font-semibold text-gray-900">
          Регистрация
        </h1>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email (логин)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          autoComplete="email"
          required
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Имя пользователя (username)
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          autoComplete="username"
          required
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Пароль
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          autoComplete="new-password"
          required
          minLength={8}
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Название компании
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          autoComplete="organization"
          required
        />

        {error ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Регистрация…" : "Создать аккаунт"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </main>
  );
}
