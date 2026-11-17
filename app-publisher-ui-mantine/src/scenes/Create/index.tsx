import { EntgraAppCreationForm } from "../../components/EntgraAppCreationForm";
export default function Create({
  addRelease = false,
}: {
  addRelease?: boolean;
}) {
  return <EntgraAppCreationForm addRelease={addRelease} />;
}
