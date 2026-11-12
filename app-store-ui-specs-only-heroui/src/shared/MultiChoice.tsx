import { ComboBox, Input, ListBox } from '@heroui/react';
import { Button } from './Button';
import { X } from 'lucide-react';
export function MultiChoice({
  label,
  options,
  selected,
  onChange,
  onSearch,
  disabled = false,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (v: Set<string>) => void;
  onSearch: (v: string) => void;
  disabled?: boolean;
}) {
  const all = [...new Set([...selected, ...options])];
  return (
    <div>
      <ComboBox
        selectionMode="multiple"
        value={[...selected]}
        onChange={(keys) => onChange(new Set(keys.map(String)))}
        onInputChange={onSearch}
        isDisabled={disabled}
        aria-label={label}
        menuTrigger="focus"
        allowsEmptyCollection
      >
        <ComboBox.InputGroup>
          <Input placeholder={label} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {all.map((name) => (
              <ListBox.Item id={name} key={name} textValue={name}>
                {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      <div className="chips">
        {[...selected].map((name) => (
          <span key={name}>
            {name}
            <Button
              isIconOnly
              variant="ghost"
              isDisabled={disabled}
              aria-label={`Remove ${name}`}
              onPress={() =>
                onChange(new Set([...selected].filter((v) => v !== name)))
              }
            >
              <X size={13} />
            </Button>
          </span>
        ))}
      </div>
    </div>
  );
}
