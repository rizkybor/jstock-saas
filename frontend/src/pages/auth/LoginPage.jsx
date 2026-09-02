import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/login", { email, password });
      login(data.data);
      navigate("/dashboard");
    } catch {
      setError("Email atau password salah.");
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "4rem auto" }}>
      <h1>Masuk ke jstock</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit">Masuk</button>
      </form>
    </div>
  );
}
