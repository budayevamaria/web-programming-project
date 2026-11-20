import { Link, Route, Routes } from 'react-router-dom';
import Checkout from './pages/Checkout.jsx';
import Result from './pages/Result.jsx';

export default function App() {
  return (
    <div className="wrap">
      <div className="top"><Link to="/" className="logo">HomeSync</Link></div>
      <Routes>
        <Route path="/" element={<Checkout />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<Checkout />} />
      </Routes>
    </div>
  );
}
