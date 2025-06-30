import { SignIn } from "@clerk/react-router";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <SignIn 
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  );
}
