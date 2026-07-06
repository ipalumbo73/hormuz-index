'use client';
import ScenarioCard from './ScenarioCard';

type Props = Omit<React.ComponentProps<typeof ScenarioCard>, 'lang'>;

export default function ScenarioCardEN(props: Props) {
  return <ScenarioCard lang="en" {...props} />;
}
