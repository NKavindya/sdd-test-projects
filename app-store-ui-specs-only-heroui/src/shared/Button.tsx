import { mergeProps } from '@react-aria/utils';
import { Button as HeroButton, Tooltip } from '@heroui/react';
import type { ComponentProps } from 'react';
export function Button({
  title,
  ...props
}: ComponentProps<typeof HeroButton> & { title?: string }) {
  if (!title) return <HeroButton {...props} />;
  return (
    <Tooltip>
      <Tooltip.Trigger
        render={(triggerProps) => (
          <HeroButton
            {...(mergeProps(triggerProps, props) as ComponentProps<
              typeof HeroButton
            >)}
          />
        )}
      />
      <Tooltip.Content>{title}</Tooltip.Content>
    </Tooltip>
  );
}
