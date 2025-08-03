import employeeService from "./employeeService";
import productService from "./productService";
import salesReturnService from "./salesReturnService";
import stockOutService from "./stockOutService";
import stockinService from "./stockinService";
import categoryService from "./categoryService";
import taskService from "./taskService";

taskService.getAllTasks();
employeeService.getAllEmployees();

categoryService.getAllCategories()
productService.getAllProducts();
stockinService.getAllStockIns()
stockOutService.getAllStockOuts();
salesReturnService.getAllSalesReturns();
salesReturnService.getSalesReturnsByDateRange(startDate,endDate)

