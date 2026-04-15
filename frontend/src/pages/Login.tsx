export default function Login() {
  return (
    <main style={{ maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
      <h1>Simulador Saber 11</h1>
      <p>Ingresa con tus credenciales de Kampus</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: integrar con API Gateway /auth/login
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <input
            name="username"
            placeholder="Usuario"
            required
            autoComplete="username"
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            name="password"
            type="password"
            placeholder="Contraseña"
            required
            autoComplete="current-password"
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button type="submit" style={{ padding: "8px 24px" }}>
          Ingresar
        </button>
      </form>
    </main>
  );
}
