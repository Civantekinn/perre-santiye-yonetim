import { FirebaseGirisForm } from "@/components/FirebaseGirisForm";

export default function FirebaseGirisPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(145deg, #1a1408 0%, #3d2e14 45%, #8a6a2a 100%)",
        }}
      />
      <FirebaseGirisForm />
    </div>
  );
}
