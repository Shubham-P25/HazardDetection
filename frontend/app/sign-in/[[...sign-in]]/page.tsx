import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark">HG</span><strong>HazardGuard</strong></div>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" />
      </div>
    </main>
  );
}
