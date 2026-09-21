import { APP_PAGES } from "@/utils/navigation";
import type { StartPage } from "@/types/preferences/navigation";
import type { UserPreferences } from "@/types/preferences/preferences";

type Props = {
  preferences: UserPreferences;
  onChange: (changes: Partial<UserPreferences>) => void;
};

type SelectProps = {
  label: string;
  description: string;
  value: StartPage;
  onChange: (value: StartPage) => void;
};

function StartupPageSelect(props: SelectProps) {
  return (
    <label>
      <span>
        <strong>{props.label}</strong>
        {props.description}
      </span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as StartPage)}
      >
        <option value="last">Last page opened</option>
        {APP_PAGES.map((page) => (
          <option key={page.id} value={page.id}>{page.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function StartupPageSettings({ preferences, onChange }: Props) {
  return (
    <section className="preferences-card" aria-labelledby="startup-page-heading">
      <header>
        <p className="eyebrow">Preferences</p>
        <h2 id="startup-page-heading">Opening page</h2>
      </header>
      <div className="startup-page-options">
        <StartupPageSelect
          label="Desktop"
          description="For windows wider than 680px."
          value={preferences.desktopStartPage ?? "last"}
          onChange={(desktopStartPage) => onChange({ desktopStartPage })}
        />
        <StartupPageSelect
          label="Mobile"
          description="For windows 680px wide or narrower."
          value={preferences.mobileStartPage ?? "last"}
          onChange={(mobileStartPage) => onChange({ mobileStartPage })}
        />
      </div>
    </section>
  );
}
