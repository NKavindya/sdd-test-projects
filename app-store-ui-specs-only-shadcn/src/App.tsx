import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell, Landing } from './scenes/Shell';
import { Login } from './scenes/Login';
import { Catalogue } from './scenes/Catalogue';
import { Release } from './scenes/Release';
import { Wizard } from './scenes/Wizard';
import { Firmware } from './scenes/Firmware';
export default function App() {
  const location = useLocation();
  return (
    <Routes>
      <Route path="/store/login" element={<Login />} />
      <Route path="/store" element={<Shell />}>
        <Route index element={<Landing />} />
        <Route path=":deviceType" element={<Landing />} />
        <Route
          path=":deviceType/applications"
          element={<Catalogue key={location.pathname} />}
        />
        <Route
          path=":deviceType/favourite-apps"
          element={<Catalogue key={location.pathname} favourites />}
        />
        <Route path=":deviceType/apps/:uuid" element={<Release />} />
        <Route path=":deviceType/apps/:uuid/install" element={<Wizard />} />
        <Route path=":deviceType/apps/:uuid/uninstall" element={<Wizard />} />
        <Route path=":deviceType/firmware/:id" element={<Firmware />} />
      </Route>
      <Route path="*" element={<Navigate to="/store/" replace />} />
    </Routes>
  );
}
