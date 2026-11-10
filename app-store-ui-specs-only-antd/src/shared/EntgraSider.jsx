import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';
export default function EntgraSider({
  collapsed = false,
  onCollapse,
  width = 200,
  breakpoint,
  logo,
  logoIcon,
  root = 'store',
  rootPath,
  items,
  currentLocation,
  openGroups = [],
  theme = 'light',
  className = '',
  minHeight,
  onActivate,
  logoClassName = '',
}) {
  return (
    <Layout.Sider
      className={`entgra-sider ${className}`}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={width}
      collapsedWidth={80}
      breakpoint={breakpoint}
      style={{ minHeight }}
    >
      <Link className={`logo ${logoClassName}`} to={rootPath || `/${root}/`}>
        <img alt="Logo" src={collapsed ? logoIcon : logo} />
      </Link>
      <Menu
        mode="inline"
        theme={theme}
        style={{ background: 'transparent' }}
        selectedKeys={[currentLocation]}
        defaultOpenKeys={openGroups}
        items={items}
        onClick={onActivate}
      />
    </Layout.Sider>
  );
}
