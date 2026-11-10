import { forwardRef } from 'react';
import { Layout, Menu } from 'antd';
import { AimOutlined } from '@ant-design/icons';
const EntgraHeader = forwardRef(function EntgraHeader(
  {
    showCrosshair = true,
    children,
    items = [],
    currentLocation,
    mode = 'vertical',
    onActivate,
    className = '',
    menuStyle,
    style,
    menuClassName,
  },
  ref,
) {
  return (
    <Layout.Header
      ref={ref}
      style={style}
      className={`entgra-header ${className}`}
    >
      {showCrosshair && <AimOutlined />}
      {children}
      <Menu
        className={menuClassName}
        mode={mode}
        items={items}
        selectedKeys={currentLocation ? [currentLocation] : []}
        onClick={onActivate}
        style={menuStyle}
      />
    </Layout.Header>
  );
});
export default EntgraHeader;
