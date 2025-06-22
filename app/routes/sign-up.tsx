import { SignUp } from "@clerk/react-router";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <SignUp 
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  );
}
