
import {
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  Bell,
  Settings,
  LogOut,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  ShoppingCart,
  Truck,
  User
} from 'lucide-react';
import { RouterProvider } from 'react-router-dom';
import routes from './routes';
import { NetworkStatusProvider } from './context/useNetworkContext';




// Main App Component
const App = () => {

  return (
    <NetworkStatusProvider retryInterval={3000}>
      <RouterProvider router={routes}></RouterProvider>
    </NetworkStatusProvider>
  )
};

export default App;