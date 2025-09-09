import bcrypt from "bcryptjs"; 
import { db } from "../../db/database";
import { encrypt } from "../../utils/Encryption";
import api from "../../api/api";

export class AdminOfflineAuthService {
  /**
   * Offline login for admin
   * @param {Object} data 
   * @param {string} data.adminEmail 
   * @param {string} data.password - plain password entered by admin
   */
  async  adminLoginOffline({ adminEmail, password }) {
  try {
    // 1. Find admin in IndexedDB
    const admin = await db.admins_all.where("adminEmail").equals(adminEmail).first();

    if (!admin) {
      throw new Error("This admin doesn't exist offline");
    }

    // 2. Compare password with stored hash
    const isMatch = await bcrypt.compare(password, admin.password ?? "");
    if (!isMatch) {
      throw new Error("Invalid credentials (offline)");
    }

    // 3. Encrypt the real plain password
    const encryptedPassword = await encrypt(password);

    // 4. Store encrypted password in IndexedDB for future online login
    await db.admins_all.update(admin.id, { encryptedPassword });

    // 5. Build offline session response
    return {
      id: admin.id,
      adminName: admin.adminName,
      adminEmail: admin.adminEmail,
      encryptedPassword,
      isOffline: true,
      message: "Offline login successful"
    };
  } catch (error) {
    console.error("Offline admin login error:", error);
    throw new Error(error.message);
  }
}

  /**
   * Get currently logged-in admin (optional helper)
   */
  async getAdminByEmail(adminEmail) {
    return await db.admins_all.where("adminEmail").equals(adminEmail).first();
  }

   /**
   * Get all admins from API and sync to IndexedDB
   */
  async syncAllAdmins() {
    try {
      const response = await api.get("/admin/all");
      let admins = response.data;

      // Ensure it's always an array
      if (!admins) admins = [];
      if (!Array.isArray(admins)) admins = [admins];

      // Bulk put into IndexedDB
      await db.admins_all.bulkPut(admins);

      return admins;
    } catch (error) {
      console.error("Error fetching admins:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch admins";
      throw new Error(errorMessage);
    }
  }
}

export const adminOfflineAuthService = new AdminOfflineAuthService();
