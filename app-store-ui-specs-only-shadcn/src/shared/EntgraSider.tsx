import { useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function EntgraSider({
  collapsed,
  onCollapse,
  logo,
  logoIcon,
  children,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  logo: string;
  logoIcon: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const query = matchMedia('(max-width: 992px)');
    const change = () => onCollapse(query.matches);
    change();
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, [onCollapse]);
  return (
    <aside className={`entgra-sider ${collapsed ? 'collapsed' : ''}`}>
      <a className="brand" href="/store/">
        <img src={collapsed ? logoIcon : logo} alt="Logo" />
      </a>
      <nav>{children}</nav>
      <button
        className="sider-toggle"
        aria-label="Toggle navigation"
        onClick={() => onCollapse(!collapsed)}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
