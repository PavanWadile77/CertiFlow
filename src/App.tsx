import { AuthProvider } from './contexts/AuthContext';
import System from './components/System';

export default function App() {
  return (
    <AuthProvider>
      <System />
    </AuthProvider>
  );
}
