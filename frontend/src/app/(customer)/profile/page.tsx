/**
 * Profile Default Page — Story 4.4b: Thông tin cá nhân & Bảo mật
 * Server Component. Fetches profile data then renders PersonalInfoForm + PasswordChangeForm.
 * Auth guard is handled by layout.tsx — do NOT duplicate here.
 */

import { getCustomerProfile } from "@/app/actions/profile-actions";
import { PersonalInfoForm } from "@/components/client/profile/PersonalInfoForm";
import { PasswordChangeForm } from "@/components/client/profile/PasswordChangeForm";

export default async function ProfilePage() {
  const result = await getCustomerProfile();

  // Error state: show message with retry hint
  if (!result.success || !result.data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center py-12">
          <p className="text-red-600 font-medium mb-2">
            {result.error ?? "Không thể tải thông tin hồ sơ"}
          </p>
          <p className="text-sm text-gray-500">Vui lòng tải lại trang để thử lại.</p>
        </div>
      </div>
    );
  }

  const profile = result.data;

  return (
    <div className="space-y-6">
      {/* Personal info card */}
      <PersonalInfoForm profile={profile} />

      {/* Password change card */}
      <PasswordChangeForm hasPassword={profile.has_password} />
    </div>
  );
}
