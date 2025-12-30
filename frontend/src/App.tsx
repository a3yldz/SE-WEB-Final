import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthScreen } from './pages/AuthScreen';
import { Home } from './pages/Home';
import { RiskMap } from './pages/RiskMap';
import { Upload } from './pages/Upload';
import { FireDept } from './pages/FireDept';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="map" element={<RiskMap />} />
          <Route path="upload" element={<Upload />} />
          <Route path="fire-dept" element={<FireDept />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
