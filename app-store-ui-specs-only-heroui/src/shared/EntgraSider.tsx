import { Button } from './Button';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Heart,
  Monitor,
  Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../services/session';
export function EntgraSider({
  collapsed,
  onCollapse,
  deviceType,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  deviceType: string;
}) {
  const { t } = useTranslation();
  const { has, theme } = useSession();
  const [open, setOpen] = useState(true);
  const loc = useLocation();
  return (
    <aside className={'sider ' + (collapsed ? 'collapsed' : '')}>
      <Link className="brand" to="/">
        <img src={collapsed ? theme.logoIcon : theme.logo} alt="Logo" />
      </Link>
      <nav aria-label={t('App Store')}>
        <Button
          variant="ghost"
          className="menu-group"
          onPress={() => setOpen(!open)}
          title={t('App Store')}
        >
          <Grid2X2 size={17} />
          {!collapsed && (
            <>
              {t('App Store')}
              <ChevronDown size={15} />
            </>
          )}
        </Button>
        {(open || collapsed) && (
          <div className="menu-children">
            <Link
              id="tour-applications"
              title={t('Applications')}
              className={
                !loc.pathname.includes('favourite-apps') ? 'active' : ''
              }
              to={`/${deviceType}/applications`}
            >
              <Grid2X2 size={16} />
              {!collapsed && t('Applications')}
            </Link>
            <Link
              id="tour-favourites"
              title={t('Favourites')}
              className={
                loc.pathname.includes('favourite-apps') ? 'active' : ''
              }
              to={`/${deviceType}/favourite-apps`}
            >
              <Heart size={16} />
              {!collapsed && t('Favourites')}
            </Link>
          </div>
        )}
        {!has('dm:hide:endpoint:mgt') && (
          <a
            id="tour-endpoint"
            href="/endpoint-mgt/"
            target="_blank"
            rel="noopener noreferrer"
            title={t('Endpoint Manager')}
          >
            <Monitor size={17} />
            {!collapsed && t('Endpoint Manager')}
          </a>
        )}
        {!has('dm:hide:app:publisher') && (
          <a
            id="tour-publisher"
            href="/publisher/"
            target="_blank"
            rel="noopener noreferrer"
            title={t('App Publisher')}
          >
            <Send size={17} />
            {!collapsed && t('App Publisher')}
          </a>
        )}
      </nav>
      <Button
        className="collapse"
        variant="ghost"
        aria-label="Collapse menu"
        onPress={() => onCollapse(!collapsed)}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </Button>
    </aside>
  );
}
