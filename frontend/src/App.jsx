
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




// Main App Component
const App = () => {

  return( <RouterProvider router={routes}></RouterProvider>)
};

export default App;