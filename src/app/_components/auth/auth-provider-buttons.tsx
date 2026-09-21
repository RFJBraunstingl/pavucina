import {
  AUTH_PROVIDERS,
  authProviderLabel,
} from "@/utils/account/auth-provider";
import type { AuthProvider } from "@/types/account/user-storage";

export default function AuthProviderButtons({
  disabled = false,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (provider: AuthProvider) => void | Promise<void>;
}) {
  return (
    <div className="auth-methods">
      {AUTH_PROVIDERS.map((provider, index) => (
        <button
          key={provider}
          type="button"
          autoFocus={index === 0}
          disabled={disabled}
          onClick={() => void onSelect(provider)}
        >
          Continue with {authProviderLabel(provider)}
        </button>
      ))}
    </div>
  );
}
