// @entgra-ui/antd 4.2.0 spreads Form.List's field.key into sibling
// Form.Items, giving the filter and value identical React keys. Fix identity
// and equivalent Ant 5 prop aliases; preserve fields, copy and callbacks.
module.exports = function entgraFilterKeys(source) {
  let count = 0;
  const result = source.replace(
    /name: \[field\.name, '(filter|value)'\],/g,
    (match, name) => {
      count += 1;
      return `${match}\n        key: '${name}-' + field.key,`;
    },
  );
  if (count !== 7)
    throw new Error(
      'Entgra filter compatibility patch needs review: expected 7 Form.Item identities.',
    );
  // Equivalent Ant 5 props; avoid vendor deprecation warnings when adding chips.
  return result
    .replace(
      /bodyStyle: \{\s*padding: 3\s*\}/g,
      'styles: { body: { padding: 3 } }',
    )
    .replace(/dropdownMatchSelectWidth:/g, 'popupMatchSelectWidth:')
    .replace(/bordered: false/g, "variant: 'borderless'");
};
