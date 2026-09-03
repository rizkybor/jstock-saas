import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { homeRouteFor } from "../../routes/homeRoute";
import { hasErrors, validate } from "../../utils/validate";

const VALIDATION_RULES = [
  { name: "email", label: "Email", required: true, type: "email" },
  { name: "password", label: "Password", required: true },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = validate({ email, password }, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/login", { email, password });
      login(data.data);
      navigate(homeRouteFor(data.data.user));
    } catch {
      setError("Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-95 rounded-2xl bg-surface p-8 shadow-[0_0.175px_1.041px_rgba(0,0,0,0.01),0_0.8px_2.925px_rgba(0,0,0,0.02),0_2.025px_7.847px_rgba(0,0,0,0.027),0_4px_18px_rgba(0,0,0,0.04)]">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-brand-mark" />
          <span className="text-xl font-semibold tracking-[-0.125px] text-ink">jstock</span>
        </div>
        <p className="mb-6 text-sm text-ink-muted">Sistem Inventory — masuk untuk melanjutkan</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="nama@perusahaan.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
          <Alert>{error}</Alert>
          <Button type="submit" disabled={loading} className="w-full rounded-full py-2.5">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">Demo: budi@contoh.test / password123</p>
      </div>
    </div>
  );
}
