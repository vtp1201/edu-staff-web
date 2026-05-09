import { LoginFormContainer } from "@/features/auth/presentation/login-form/login-form";
import { loginAction } from "./actions";

export default function LoginPage() {
  return (
    <div className="flex h-screen">
      <div
        className="hidden w-[42%] flex-col items-center justify-center lg:flex"
        style={{
          background:
            "linear-gradient(150deg, #5D87FF 0%, #5D87FFCC 55%, #13DEB988 100%)",
        }}
      >
        <h1 className="text-3xl font-extrabold text-white">EduPortal</h1>
        <p className="mt-2 text-sm text-white/80">Hệ thống quản lý giáo dục</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-100">
          <h2 className="mb-2 text-[26px] font-extrabold text-[#2A3547]">
            Đăng nhập
          </h2>
          <p className="mb-6 text-[13.5px] text-[#8898A9]">
            Nhập thông tin để truy cập hệ thống
          </p>
          <LoginFormContainer action={loginAction} />
        </div>
      </div>
    </div>
  );
}
