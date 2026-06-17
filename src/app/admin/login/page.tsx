import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Ritam Bharat POS</h1>
          <p className="text-sm text-muted-foreground mt-1">Restaurant Operating System</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
