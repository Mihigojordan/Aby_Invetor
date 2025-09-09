import bcrypt from "bcryptjs";
import { db } from "../../db/database";
import { encrypt } from "../../utils/Encryption";
import api from "../../api/api";

export class EmployeeOfflineAuthService {
  /**
   * Offline login for employee
   * @param {Object} data 
   * @param {string} data.email 
   * @param {string} data.password - plain password entered by employee
   */
  async employeeLoginOffline({ email, password }) {
    try {
      // 1. Find employee in IndexedDB
      const employee = await db.employees_all.where("email").equals(email).first();

      if (!employee) {
        throw new Error("This employee doesn't exist offline");
      }

      // 2. Compare password with stored hash
      const isMatch = await bcrypt.compare(password, employee.password ?? "");
      if (!isMatch) {
        throw new Error("Invalid credentials (offline)");
      }

      // 3. Encrypt the real plain password
      const encryptedPassword = await encrypt(password);

      // 4. Store encrypted password in IndexedDB for future online login
      await db.employees_all.update(employee.id, { encryptedPassword });

      // alert(JSON.stringify(employee))

      // 5. Build offline session response
      return {
        ...employee,
        id: employee.id,
        firstname: employee.firstname,
        lastname: employee.lastname,
        email: employee.email,
        encryptedPassword,
        isOffline: true,
        message: "Offline login successful"
      };
    } catch (error) {
      console.error("Offline employee login error:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Get currently logged-in employee (optional helper)
   */
  async getEmployeeByEmail(email) {
    return await db.employees_all.where("email").equals(email).first();
  }

  /**
   * Get all employees from API and sync to IndexedDB
   */
  async syncAllEmployees() {
    try {
      const response = await api.get("/employee/all");
      const employees = response.data;

      // Bulk put into IndexedDB
      await db.employees_all.bulkPut(employees);

      return employees;
    } catch (error) {
      console.error("Error fetching employees:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch employees";
      throw new Error(errorMessage);
    }
  }
}

export const employeeOfflineAuthService = new EmployeeOfflineAuthService();
