'use client';
import IndexGauge from './IndexGauge';

type Props = Omit<React.ComponentProps<typeof IndexGauge>, 'lang'>;

export default function IndexGaugeEN(props: Props) {
  return <IndexGauge lang="en" {...props} />;
}
