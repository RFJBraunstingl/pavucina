import PreferencesView from "./_components/preferences-view";
import packageJson from "../../../package.json";

export default function Page() {
  return <PreferencesView version={process.env.PAVUCINA_VERSION || packageJson.version} />;
}
