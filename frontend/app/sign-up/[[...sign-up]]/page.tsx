import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark">HG</span><strong>HazardGuard</strong></div>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/" />
      </div>
    </main>
  );
}
